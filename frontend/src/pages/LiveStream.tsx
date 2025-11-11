import { useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { Box, Button, Container, Paper, Stack, Typography, Alert } from '@mui/material'

type Role = 'idle' | 'broadcaster' | 'watcher'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]

export default function LiveStreamPage() {
  const [role, setRole] = useState<Role>('idle')
  const [error, setError] = useState<string | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const roleRef = useRef<Role>('idle')

  // Broadcaster: map of watcherId -> RTCPeerConnection
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  // Buforowanie kandydatów ICE zanim PC będzie gotowe (np. zanim ustawimy remoteDescription)
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const isBroadcaster = role === 'broadcaster'
  const isWatcher = role === 'watcher'

  const serverUrl = useMemo(() => {
    // Prefer Vite env if provided, fallback to localhost:5000
    const fromEnv = (import.meta as any).env?.VITE_API_URL as string | undefined
    return fromEnv?.replace(/\/$/, '') || 'http://localhost:5000'
  }, [])

  useEffect(() => {
    const s = io(serverUrl, { withCredentials: true, transports: ['websocket', 'polling'] })
    socketRef.current = s

    s.on('connect', () => {
      console.log('[socket] connect', s.id)
      // jeśli już jesteśmy widzem i nastąpił reconnect – ponownie zgłoś się do nadawcy
      if (roleRef.current === 'watcher') {
        s.emit('watcher')
      }
    })

    s.on('disconnect', () => {
      console.log('[socket] disconnect')
      cleanup()
    })

    // Watcher flow
    s.on('offer', async (id: string, description: RTCSessionDescriptionInit) => {
      if (roleRef.current !== 'watcher') return
      try {
        console.log('[webrtc] offer from', id)
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
        pc.onicecandidate = (event) => {
          if (event.candidate) s.emit('candidate', id, event.candidate)
        }
        pc.ontrack = (event) => {
          const [stream] = event.streams
          if (remoteVideoRef.current) {
            remoteVideoRef.current.srcObject = stream
            // spróbuj zainicjować odtwarzanie
            remoteVideoRef.current.play().catch(() => {})
          }
        }
        await pc.setRemoteDescription(new RTCSessionDescription(description))
        // Po ustawieniu remoteDescription możemy dodać ewentualne zbuforowane kandydaty
        const buffered = pendingCandidatesRef.current.get('watcher') || []
        for (const cand of buffered) {
          try { await pc.addIceCandidate(new RTCIceCandidate(cand)) } catch {}
        }
        pendingCandidatesRef.current.delete('watcher')
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        s.emit('answer', id, pc.localDescription)
        // store single pc under key 'watcher'
        pcsRef.current.set('watcher', pc)
      } catch (e: any) {
        setError(e?.message || String(e))
      }
    })

    s.on('candidate', async (_id: string, candidate: RTCIceCandidateInit) => {
      console.log('[webrtc] candidate from', _id)
      const key = roleRef.current === 'watcher' ? 'watcher' : _id
      const pc = pcsRef.current.get(key)
      if (pc && pc.remoteDescription) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)) } catch {}
      } else {
        // Zbuforuj kandydata do czasu aż PC i remoteDescription będą gotowe
        const list = pendingCandidatesRef.current.get(key) || []
        list.push(candidate)
        pendingCandidatesRef.current.set(key, list)
      }
    })

    s.on('disconnectPeer', (id: string) => {
      console.log('[webrtc] disconnectPeer', id)
      const pc = pcsRef.current.get(id)
      if (pc) {
        pc.close()
        pcsRef.current.delete(id)
      }
    })

    s.on('broadcaster-ended', () => {
      if (roleRef.current === 'watcher') {
        const pc = pcsRef.current.get('watcher')
        if (pc) pc.close()
        pcsRef.current.delete('watcher')
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
      }
    })

    // jeśli widz dołączył przed nadawcą – nasłuchuj informacji, że nadawca się pojawił
    s.on('broadcaster', () => {
      console.log('[socket] broadcaster announced')
      if (roleRef.current === 'watcher') {
        s.emit('watcher')
      }
    })

    return () => {
      s.removeAllListeners()
      s.disconnect()
    }
  }, [serverUrl])

  useEffect(() => {
    roleRef.current = role
  }, [role])

  const startBroadcast = async () => {
    setError(null)
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = media
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = media
        localVideoRef.current.muted = true
        await localVideoRef.current.play().catch(() => {})
      }
      setRole('broadcaster')
      const s = socketRef.current!
      s.emit('broadcaster')

      // For each new watcher create PC and send offer
      s.off('watcher')
      s.on('watcher', async (id: string) => {
        console.log('[webrtc] watcher joined', id)
        const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS })
        pcsRef.current.set(id, pc)
        if (localStreamRef.current) {
          localStreamRef.current.getTracks().forEach((track) => pc.addTrack(track, localStreamRef.current!))
        }
        pc.onicecandidate = (event) => {
          if (event.candidate) s.emit('candidate', id, event.candidate)
        }
        const offer = await pc.createOffer()
        await pc.setLocalDescription(offer)
        s.emit('offer', id, pc.localDescription)
      })

      s.off('answer')
      s.on('answer', async (id: string, description: RTCSessionDescriptionInit) => {
        console.log('[webrtc] answer from', id)
        const pc = pcsRef.current.get(id)
        if (!pc) return
        await pc.setRemoteDescription(new RTCSessionDescription(description))
        // Po ustawieniu remoteDescription dołóż zbuforowane kandydaty od widza
        const buffered = pendingCandidatesRef.current.get(id) || []
        for (const cand of buffered) {
          try { await pc.addIceCandidate(new RTCIceCandidate(cand)) } catch {}
        }
        pendingCandidatesRef.current.delete(id)
      })
    } catch (e: any) {
      setError(e?.message || String(e))
    }
  }

  const startWatching = async () => {
    setError(null)
    setRole('watcher')
    const s = socketRef.current
    if (s) s.emit('watcher')
    // spróbuj od razu aktywować element video, by uniknąć blokady autoplay
    if (remoteVideoRef.current) {
      remoteVideoRef.current.muted = false
      remoteVideoRef.current.play().catch(() => {})
    }
  }

  const stopAll = () => {
    cleanup()
    setRole('idle')
  }

  const cleanup = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null

    pcsRef.current.forEach((pc) => pc.close())
    pcsRef.current.clear()
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h4">Transmisja na żywo (WebRTC)</Typography>
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button variant="contained" onClick={startBroadcast} disabled={isBroadcaster}>Startuj nadawanie</Button>
          <Button variant="outlined" onClick={startWatching} disabled={isWatcher}>Oglądaj</Button>
          <Button onClick={stopAll} color="secondary">Zatrzymaj</Button>
        </Stack>
        <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', md: '1fr 1fr' } }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6">Podgląd lokalny {isBroadcaster ? '(Nadawca)' : ''}</Typography>
            <Box component="video" ref={localVideoRef} autoPlay playsInline controls={false} style={{ width: '100%', background: '#000' }} />
          </Paper>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6">Transmisja {isWatcher ? '(Odbiorca)' : ''}</Typography>
            <Box component="video" ref={remoteVideoRef} autoPlay playsInline controls style={{ width: '100%', background: '#000' }} />
          </Paper>
        </Box>
        <Typography variant="body2" color="text.secondary">
          Wskazówka: Otwórz drugi browser/okno i wejdź na tę samą stronę, aby przetestować nadawcę i widza lokalnie.
        </Typography>
      </Stack>
    </Container>
  )
}
