import { useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { Box, Container, Paper, Stack, Typography, Alert, Card, CardContent, CardMedia, Button } from '@mui/material'
import VideocamOffOutlinedIcon from '@mui/icons-material/VideocamOffOutlined'
import LiveChat from '../components/LiveChat'

type Role = 'idle' | 'watcher'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]

export default function LiveWatchPage() {
  const [role, setRole] = useState<Role>('idle')
  const [error, setError] = useState<string | null>(null)
  const remoteVideoRef = useRef<HTMLVideoElement | null>(null)
  const [hasStream, setHasStream] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const roleRef = useRef<Role>('idle')
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const pendingCandidatesRef = useRef<Map<string, RTCIceCandidateInit[]>>(new Map())
  const [highlight, setHighlight] = useState<null | {
    id: string
    name: string
    slug: string
    price: number
    currency: string
    image: string | null
    inStock: boolean
  }>(null)

  const serverUrl = useMemo(() => {
    const fromEnv = (import.meta as any).env?.VITE_API_URL as string | undefined
    return fromEnv?.replace(/\/$/, '') || 'http://localhost:5000'
  }, [])

  useEffect(() => {
    roleRef.current = role
  }, [role])

  useEffect(() => {
    const s = io(serverUrl, { withCredentials: true, transports: ['websocket', 'polling'] })
    socketRef.current = s

    s.on('connect', () => {
      console.log('[socket] connect watcher', s.id)
      // Auto-start przy pierwszym połączeniu
      if (roleRef.current === 'idle') {
        setRole('watcher')
      }
      if (roleRef.current === 'watcher') s.emit('watcher')
    })

    s.on('disconnect', () => {
      console.log('[socket] disconnect watcher')
      cleanup()
    })

    s.on('broadcaster', () => {
      console.log('[socket] broadcaster announced')
      if (roleRef.current === 'watcher') s.emit('watcher')
    })

    s.on('highlight:update', (data: any) => {
      setHighlight(data || null)
    })

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
            remoteVideoRef.current.muted = true
            remoteVideoRef.current.play().catch(() => {})
          }
          setHasStream(true)
        }
        await pc.setRemoteDescription(new RTCSessionDescription(description))
        const buffered = pendingCandidatesRef.current.get('watcher') || []
        for (const cand of buffered) {
          try { await pc.addIceCandidate(new RTCIceCandidate(cand)) } catch {}
        }
        pendingCandidatesRef.current.delete('watcher')
        const answer = await pc.createAnswer()
        await pc.setLocalDescription(answer)
        s.emit('answer', id, pc.localDescription)
        pcsRef.current.set('watcher', pc)
      } catch (e: any) {
        setError(e?.message || String(e))
      }
    })

    s.on('candidate', async (_id: string, candidate: RTCIceCandidateInit) => {
      const key = roleRef.current === 'watcher' ? 'watcher' : _id
      const pc = pcsRef.current.get(key)
      if (pc && pc.remoteDescription) {
        try { await pc.addIceCandidate(new RTCIceCandidate(candidate)) } catch {}
      } else {
        const list = pendingCandidatesRef.current.get(key) || []
        list.push(candidate)
        pendingCandidatesRef.current.set(key, list)
      }
    })

    s.on('broadcaster-ended', () => {
      if (roleRef.current === 'watcher') {
        const pc = pcsRef.current.get('watcher')
        if (pc) pc.close()
        pcsRef.current.delete('watcher')
        if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
        setHasStream(false)
      }
    })

    s.on('disconnectPeer', (id: string) => {
      const pc = pcsRef.current.get(id)
      if (pc) {
        pc.close()
        pcsRef.current.delete(id)
      }
    })

    return () => {
      s.removeAllListeners()
      s.disconnect()
    }
  }, [serverUrl])

  const cleanup = () => {
    pcsRef.current.forEach((pc) => pc.close())
    pcsRef.current.clear()
    if (remoteVideoRef.current) remoteVideoRef.current.srcObject = null
    setHasStream(false)
  }

  return (
    <Container maxWidth={false} sx={{ py: 2, px: { xs: 2, md: 3 } }}>
      <Stack spacing={2}>
        {error && <Alert severity="error">{error}</Alert>}
        {/* Usunięto przycisk "Zatrzymaj" na prośbę użytkownika */}
        <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'minmax(0, 1fr) 380px', lg: 'minmax(0, 1fr) 420px' }, gap: 2 }}>
          <Paper variant="outlined" sx={{ p: 2 }}>
            <Box sx={{ position: 'relative', width: '100%', height: { xs: '56.25vw', md: '75vh' }, borderRadius: 1, overflow: 'hidden', bgcolor: 'action.hover' }}>
              {/* Obszar wideo 16:9 */}
              <Box sx={{ position: 'absolute', inset: 0 }}>
                <Box
                  component="video"
                  ref={remoteVideoRef}
                  autoPlay
                  playsInline
                  controls
                  sx={{ width: '100%', height: '100%', display: hasStream ? 'block' : 'none', background: '#000', objectFit: 'cover' }}
                />
                {!hasStream && (
                  <Box sx={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', flexDirection: 'column', gap: 1, color: 'text.secondary', textAlign: 'center', p: 2 }}>
                    <VideocamOffOutlinedIcon sx={{ fontSize: 48, opacity: 0.6 }} />
                    <Typography variant="body1">Brak aktywnej transmisji</Typography>
                    <Typography variant="body2" color="text.secondary">Gdy nadawca rozpocznie stream, wideo pojawi się automatycznie.</Typography>
                  </Box>
                )}
              </Box>
            </Box>
            {highlight && (
              <Card variant="outlined" sx={{ mt: 2, display: 'flex', flexDirection: 'row' }}>
                {highlight.image && (
                  <CardMedia
                    component="img"
                    image={highlight.image}
                    alt={highlight.name}
                    sx={{ width: 120, height: 120, objectFit: 'cover' }}
                  />
                )}
                <CardContent sx={{ flex: 1, p: 1.5 }}>
                  <Typography variant="subtitle2" color="text.secondary" sx={{ mb: 0.5 }}>Prezentowany produkt</Typography>
                  <Typography variant="subtitle1" noWrap title={highlight.name}>{highlight.name}</Typography>
                  <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                    {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: highlight.currency || 'PLN' }).format(highlight.price)}
                  </Typography>
                  <Stack direction="row" spacing={1} alignItems="center">
                    <Typography variant="caption" color={highlight.inStock ? 'success.main' : 'error.main'}>
                      {highlight.inStock ? 'W magazynie' : 'Brak w magazynie'}
                    </Typography>
                    <Button href={`/products/${highlight.slug}`} target="_blank" rel="noopener noreferrer" size="small" variant="outlined">Zobacz teraz</Button>
                  </Stack>
                </CardContent>
              </Card>
            )}
          </Paper>
          <LiveChat />
        </Box>
      </Stack>
    </Container>
  )
}
