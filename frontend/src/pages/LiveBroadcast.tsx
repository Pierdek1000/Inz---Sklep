import { useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { Box, Button, Container, Paper, Stack, Typography, Alert, Autocomplete, TextField, Divider } from '@mui/material'
import { useNavigate } from 'react-router-dom'
import VideocamOffOutlinedIcon from '@mui/icons-material/VideocamOffOutlined'
import LiveChat from '../components/LiveChat'
import BannedUsersPanel from '../components/BannedUsersPanel'
import { useAuth } from '../state/AuthContext'

type Role = 'idle' | 'broadcaster'

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' }
]

export default function LiveBroadcastPage() {
  const { user } = useAuth()
  const allowed = !!user && (user.role === 'admin' || user.role === 'seller')
  const navigate = useNavigate()

  const [role, setRole] = useState<Role>('idle')
  const [error, setError] = useState<string | null>(null)
  const localVideoRef = useRef<HTMLVideoElement | null>(null)
  const localStreamRef = useRef<MediaStream | null>(null)
  const [hasLocalStream, setHasLocalStream] = useState(false)
  const socketRef = useRef<Socket | null>(null)
  const pcsRef = useRef<Map<string, RTCPeerConnection>>(new Map())
  const [highlighted, setHighlighted] = useState<null | {
    id: string
    name: string
    slug: string
    price: number
    currency: string
    image: string | null
    inStock: boolean
  }>(null)
  const [productOptions, setProductOptions] = useState<Array<{ id: string; name: string; slug: string; image: string | null }>>([])
  const [productQuery, setProductQuery] = useState('')
  const [loadingProducts, setLoadingProducts] = useState(false)

  const serverUrl = useMemo(() => {
    const fromEnv = (import.meta as any).env?.VITE_API_URL as string | undefined
    return fromEnv?.replace(/\/$/, '') || 'http://localhost:5000'
  }, [])

  useEffect(() => {
    // Redirect away if not allowed
    if (user === null) {
      navigate('/login')
      return
    }
    if (user && !allowed) {
      navigate('/')
      return
    }
  }, [user, allowed, navigate])

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

    s.on('highlight:update', (data: any) => {
      setHighlighted(data || null)
    })

    return () => {
      s.removeAllListeners()
      s.disconnect()
    }
  }, [serverUrl])

  // Lazy wyszukiwanie produktów
  useEffect(() => {
    let active = true
    const q = productQuery.trim()
    if (!q) { setProductOptions([]); return }
    const fetchProducts = async () => {
      try {
        setLoadingProducts(true)
        const url = `${serverUrl}/api/products?q=${encodeURIComponent(q)}&limit=10`
        const res = await fetch(url, { credentials: 'include' })
        const json = await res.json()
        if (!active) return
  const items = Array.isArray(json?.data) ? json.data : []
  setProductOptions(items.map((p: any) => ({ id: p._id, name: p.name, slug: p.slug, image: Array.isArray(p.images) && p.images.length > 0 ? p.images[0] : null })))
      } catch {
        if (active) setProductOptions([])
      } finally {
        if (active) setLoadingProducts(false)
      }
    }
    const t = setTimeout(fetchProducts, 300)
    return () => { active = false; clearTimeout(t) }
  }, [productQuery, serverUrl])

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

  const selectHighlight = (prodId: string | null) => {
    const s = socketRef.current
    if (!s) return
    if (!prodId) { s.emit('highlight:clear'); return }
    s.emit('highlight:select', prodId)
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
            {/* Pasek wyboru i podglądu prezentowanego produktu pod streamem */}
            <Divider sx={{ my: 2 }} />
            <Typography variant="h6" sx={{ mb: 1 }}>Prezentowany produkt</Typography>
            <Autocomplete
              options={productOptions}
              getOptionLabel={(o) => o?.name || ''}
              loading={loadingProducts}
              filterOptions={(x) => x}
              isOptionEqualToValue={(opt, val) => opt.id === val.id}
              onInputChange={(_e, val) => setProductQuery(val)}
              onChange={(_e, val) => selectHighlight(val ? val.id : null)}
              noOptionsText={""}
              renderOption={(props, option) => (
                <li {...props} key={option.id} style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  {option.image && (
                    <img src={option.image} alt="" width={32} height={32} style={{ objectFit: 'cover', borderRadius: 4 }} />
                  )}
                  <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{option.name}</span>
                </li>
              )}
              renderInput={(params) => (
                <TextField {...params} label="Wyszukaj produkt" placeholder="Nazwa…" size="small" />
              )}
            />
            <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
              {highlighted ? (
                <>
                  {highlighted.image && (
                    <Box component="img" src={highlighted.image} alt={highlighted.name} sx={{ width: 72, height: 72, objectFit: 'cover', borderRadius: 1 }} />
                  )}
                  <Box sx={{ minWidth: 0 }}>
                    <Typography variant="subtitle1" noWrap title={highlighted.name}>{highlighted.name}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {new Intl.NumberFormat('pl-PL', { style: 'currency', currency: highlighted.currency || 'PLN' }).format(highlighted.price)}
                    </Typography>
                    <Typography variant="caption" color={highlighted.inStock ? 'success.main' : 'error.main'}>
                      {highlighted.inStock ? 'W magazynie' : 'Brak w magazynie'}
                    </Typography>
                  </Box>
                  <Box sx={{ flex: 1 }} />
                  <Button size="small" onClick={() => selectHighlight(null)}>Wyczyść</Button>
                </>
              ) : (
                <Typography variant="body2" color="text.secondary">Brak wybranego produktu</Typography>
              )}
            </Box>
          </Paper>
          <Stack spacing={2}>
            <BannedUsersPanel />
            <LiveChat height={550} />
          </Stack>
        </Box>
      </Stack>
    </Container>
  )
}
