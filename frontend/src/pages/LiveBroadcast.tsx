import { useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { Box, Button, Container, Paper, Stack, Typography, Alert } from '@mui/material'
import VideocamOffOutlinedIcon from '@mui/icons-material/VideocamOffOutlined'
import LiveChat from '../components/LiveChat'
import { useAuth } from '../state/AuthContext'

type Role = 'idle' | 'broadcaster'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]

export default function LiveBroadcastPage() {
  const { user } = useAuth()
  const allowed = !!user && (user.role === 'admin' || user.role === 'seller')

  const [role, setRole] = useState<Role>('idle')
  const [error, setError] = useState<string | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const [hasLocalStream, setHasLocalStream] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map())

  const serverUrl = useMemo(() => {
    const fromEnv = (import.meta as any).env?.VITE_API_URL as string | undefined
    return fromEnv?.replace(/\/$/, '') || 'http://localhost:5000'
  }, [])

  useEffect(() => {
    const s = io(serverUrl, { withCredentials: true, transports: ['websocket', 'polling'] })
    socketRef.current = s

    s.on('connect', () => {
      console.log('[socket] connect broadcaster', s.id)
    })

    s.on('disconnect', () => {
      console.log('[socket] disconnect broadcaster')
      cleanup()
    })

    return () => {
      s.removeAllListeners()
      s.disconnect()
    }
  }, [serverUrl])

  const startBroadcast = async () => {
    if (!allowed) return
    setError(null)
    try {
      const media = await navigator.mediaDevices.getUserMedia({ video: true, audio: true })
      localStreamRef.current = media
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = media
        localVideoRef.current.muted = true
        await localVideoRef.current.play().catch(() => {})
      }
      setHasLocalStream(true)
      setRole('broadcaster')
      const s = socketRef.current!
      s.emit('broadcaster')

      // dla każdego widza: utwórz PC i wyślij offer
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
      })

      s.on('candidate', async (_id: string, candidate: RTCIceCandidateInit) => {
        const pc = pcsRef.current.get(_id)
        if (!pc) return
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)) } catch {}
      })
    } catch (e: any) {
      setError(e?.message || String(e))
    }
  }

  const stopBroadcast = () => {
    cleanup()
    setRole('idle')
  }

  const cleanup = () => {
    localStreamRef.current?.getTracks().forEach((t) => t.stop())
    localStreamRef.current = null
    if (localVideoRef.current) localVideoRef.current.srcObject = null
    pcsRef.current.forEach((pc) => pc.close())
    pcsRef.current.clear()
    setHasLocalStream(false)
  }

  return (
    <Container maxWidth="lg" sx={{ py: 3 }}>
      <Stack spacing={2}>
        <Typography variant="h4">Transmisja (tylko nadawca)</Typography>
        {!allowed && (
          <Alert severity="warning">Ta strona jest dostępna tylko dla roli Sprzedawca (seller) lub Admin.</Alert>
        )}
        {error && <Alert severity="error">{error}</Alert>}
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button variant="contained" onClick={startBroadcast} disabled={!allowed || role === 'broadcaster'}>
            Startuj nadawanie
          </Button>
          <Button onClick={stopBroadcast} color="secondary" disabled={role !== 'broadcaster'}>
            Zatrzymaj
          </Button>
        </Stack>
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: '2fr 1fr' }, gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Podgląd lokalny</Typography>
            <Box sx={{ position: 'relative', width: '100%', borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover' }}>
              <Box sx={{ position: 'absolute', inset: 0 }}>
                <Box
                  component="video"
                  ref={localVideoRef}
                  autoPlay
                  playsInline
                  controls={false}
                  sx={{ width: '100%', height: '100%', display: hasLocalStream ? 'block' : 'none', background: '#000', objectFit: 'cover' }}
                />
                {!hasLocalStream && (
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1, color: 'text.secondary', textAlign: 'center', p: 2 }}>
                    <VideocamOffOutlinedIcon sx={{ fontSize: 48, opacity: 0.6 }} />
                    <Typography variant="body1">Podgląd niedostępny</Typography>
                    <Typography variant="body2" color="text.secondary">Kliknij „Startuj nadawanie”, aby włączyć kamerę i mikrofon.</Typography>
                  </Box>
                )}
              </Box>
              <Box sx={{ pt: '56.25%' }} />
            </Box>
          </Paper>
          <LiveChat />
        </Box>
      </Stack>
    </Container>
  )
}
