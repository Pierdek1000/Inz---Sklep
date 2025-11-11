import { useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { Box, Button, Divider, Paper, Stack, TextField, Typography, IconButton, Menu, MenuItem, ListItemIcon, ListItemText, Chip, Alert, Tooltip, Dialog, DialogTitle, DialogContent, DialogActions } from '@mui/material'
import MoreVertIcon from '@mui/icons-material/MoreVert'
import AccessTimeIcon from '@mui/icons-material/AccessTime'
import BlockIcon from '@mui/icons-material/Block'
import EditIcon from '@mui/icons-material/Edit'
import { useAuth } from '../state/AuthContext'

type ChatMessage = {
  id: string
  username: string
  role: 'user' | 'admin' | 'seller'
  text: string
  ts: number
}

type LiveChatProps = {
  height?: number | string
}

export default function LiveChat({ height }: LiveChatProps) {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const socketRef = useRef<Socket | null>(null)
  const [mutedUntil, setMutedUntil] = useState<number | null>(null)
  const [banned, setBanned] = useState(false)
  const [menuAnchor, setMenuAnchor] = useState<HTMLElement | null>(null)
  const [menuTargetId, setMenuTargetId] = useState<string | null>(null)
  const [currentTime, setCurrentTime] = useState(Date.now())
  const [customTimeoutDialog, setCustomTimeoutDialog] = useState(false)
  const [customTimeoutValue, setCustomTimeoutValue] = useState('')

  // Aktualizuj czas co sekundę dla odliczania timeout
  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(Date.now())
      
      // Automatycznie usuń timeout gdy wygaśnie
      if (mutedUntil && !banned && Date.now() >= mutedUntil) {
        setMutedUntil(null)
      }
    }, 1000)
    return () => clearInterval(timer)
  }, [mutedUntil, banned])

  const serverUrl = useMemo(() => {
    const fromEnv = (import.meta as any).env?.VITE_API_URL as string | undefined
    return fromEnv?.replace(/\/$/, '') || 'http://localhost:5000'
  }, [])

  // Sprawdź status użytkownika przy załadowaniu
  useEffect(() => {
    if (!user) return
    
    const checkStatus = async () => {
      try {
        const res = await fetch(`${serverUrl}/api/chat/status`, { credentials: 'include' })
        if (res.ok) {
          const data = await res.json()
          if (data.banned) {
            setBanned(true)
            setMutedUntil(data.until || null)
          } else if (data.muted && data.until) {
            setMutedUntil(Number(data.until))
            setBanned(false)
          } else {
            setBanned(false)
            setMutedUntil(null)
          }
        }
      } catch (err) {
        console.error('Failed to check chat status:', err)
      }
    }
    
    checkStatus()
  }, [user, serverUrl])

  useEffect(() => {
    const s = io(serverUrl, { withCredentials: true, transports: ['websocket', 'polling'] })
    socketRef.current = s

    s.on('connect', () => {
      // nothing
    })

    s.on('chat:new', (msg: ChatMessage) => {
      setMessages((prev) => [...prev, msg])
      // autoscroll
      requestAnimationFrame(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }))
    })

    s.on('chat:error', (err: any) => {
      if (!user) return
      if (err?.code === 'BANNED') {
        setBanned(true)
        setMutedUntil(err?.until || null)
      } else if (err?.code === 'TIMEOUT_UNTIL') {
        const until = Number(err?.until) || 0
        setMutedUntil(until)
        setBanned(false)
      }
    })

    s.on('chat:mod:timeout', (payload: { userId: string; until: number }) => {
      if (user && payload?.userId === user.id) {
        setMutedUntil(Number(payload.until) || null)
        setBanned(false)
      }
    })

    s.on('chat:mod:ban', (payload: { userId: string }) => {
      if (user && payload?.userId === user.id) {
        setBanned(true)
        setMutedUntil(null)
      }
    })

    s.on('chat:mod:unban', (payload: { userId: string }) => {
      if (user && payload?.userId === user.id) {
        setBanned(false)
        setMutedUntil(null)
      }
    })

    return () => {
      s.removeAllListeners()
      s.disconnect()
    }
  }, [serverUrl])

  const send = () => {
    const val = text.trim()
    if (!val || !user) return
    socketRef.current?.emit('chat:send', val)
    setText('')
  }

  const canModerate = !!user && (user.role === 'admin' || user.role === 'seller')
  const openMenu = (ev: React.MouseEvent<HTMLElement>, targetId: string) => { setMenuAnchor(ev.currentTarget); setMenuTargetId(targetId) }
  const closeMenu = () => { setMenuAnchor(null); setMenuTargetId(null) }
  
  const timeoutUser = (minutes: number) => {
    if (!menuTargetId) return
    socketRef.current?.emit('chat:timeout', { userId: menuTargetId, minutes })
    closeMenu()
  }
  
  const openCustomTimeout = () => {
    // Nie czyść menuTargetId – potrzebujemy go, żeby wysłać timeout
    setMenuAnchor(null)
    if (!menuTargetId) return // brak wybranego użytkownika
    setCustomTimeoutDialog(true)
  }
  
  const applyCustomTimeout = () => {
    if (!menuTargetId) return
    const val = customTimeoutValue.trim()
    if (!val) return
    const seconds = parseInt(val)
    if (isNaN(seconds) || seconds < 1) return
    const minutes = seconds / 60
    socketRef.current?.emit('chat:timeout', { userId: menuTargetId, minutes })
    setCustomTimeoutDialog(false)
    setCustomTimeoutValue('')
    setMenuTargetId(null)
  }
  
  const banUser = () => {
    if (!menuTargetId) return
    socketRef.current?.emit('chat:ban', { userId: menuTargetId })
    closeMenu()
  }

  const unbanUser = () => {
    if (!menuTargetId) return
    socketRef.current?.emit('chat:unban', { userId: menuTargetId })
    closeMenu()
  }

  const isMuted = !!mutedUntil && currentTime < mutedUntil
  const remainingMs = isMuted ? (mutedUntil! - currentTime) : 0
  const remainingMin = Math.ceil(remainingMs / 60000)
  const remainingSec = Math.ceil(remainingMs / 1000)

  const roleColor = (r: ChatMessage['role']) => {
    if (r === 'seller') return 'warning.main'
    if (r === 'admin') return 'info.main'
    return 'text.primary'
  }

  const paperHeight = height ?? ({ xs: 500, md: '75vh', lg: '80vh' } as any)

  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', height: paperHeight }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Czat na żywo</Typography>
      {(banned || isMuted) && (
        <Alert severity={banned ? 'error' : 'warning'} sx={{ mb: 1 }}>
          {banned 
            ? (mutedUntil ? `Masz bana do ${new Date(mutedUntil).toLocaleString('pl-PL')}` : 'Zostałeś zbanowany na czacie.')
            : remainingSec > 60 
              ? `Masz timeout na czacie. Pozostało około ${remainingMin} min (do ${new Date(mutedUntil!).toLocaleTimeString('pl-PL')})`
              : `Masz timeout na czacie. Pozostało ${remainingSec} sek`
          }
        </Alert>
      )}
      <Divider sx={{ mb: 1 }} />
      <Box sx={{ flex: 1, overflow: 'auto', pr: 1 }}>
        {messages.map((m, i) => (
          <Box key={i} sx={{ mb: 1.25 }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="subtitle2" sx={{ color: roleColor(m.role) }}>
                {m.username}
              </Typography>
              {(m.role === 'seller' || m.role === 'admin') && (
                <Chip size="small" label={m.role === 'seller' ? 'Sprzedawca' : 'Admin'} color={m.role === 'seller' ? 'warning' : 'info'} variant="outlined" />
              )}
              <Typography component="span" variant="caption" color="text.secondary">[{new Date(m.ts).toLocaleTimeString()}]</Typography>
              <Box sx={{ flex: 1 }} />
              {canModerate && user && user.id !== m.id && m.role !== 'admin' && (
                <Tooltip title="Moderuj">
                  <IconButton size="small" onClick={(e) => openMenu(e, m.id)}>
                    <MoreVertIcon fontSize="small" />
                  </IconButton>
                </Tooltip>
              )}
            </Box>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</Typography>
          </Box>
        ))}
        <Menu anchorEl={menuAnchor} open={!!menuAnchor} onClose={closeMenu} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
          <MenuItem onClick={() => timeoutUser(5)}>
            <ListItemIcon><AccessTimeIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Timeout 5 min" />
          </MenuItem>
            <MenuItem onClick={() => timeoutUser(60)}>
            <ListItemIcon><AccessTimeIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Timeout 1 godz" />
          </MenuItem>
          <MenuItem onClick={() => timeoutUser(60 * 24)}>
            <ListItemIcon><AccessTimeIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Timeout 24 godz" />
          </MenuItem>
          <MenuItem onClick={openCustomTimeout}>
            <ListItemIcon><EditIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Niestandardowy czas..." />
          </MenuItem>
          <Divider />
          <MenuItem onClick={banUser} sx={{ color: 'error.main' }}>
            <ListItemIcon><BlockIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Ban" />
          </MenuItem>
          <MenuItem onClick={unbanUser}>
            <ListItemIcon><BlockIcon fontSize="small" /></ListItemIcon>
            <ListItemText primary="Odbanuj" />
          </MenuItem>
        </Menu>
        
        <Dialog open={customTimeoutDialog} onClose={() => setCustomTimeoutDialog(false)}>
          <DialogTitle>Niestandardowy timeout</DialogTitle>
          <DialogContent>
            <TextField
              autoFocus
              margin="dense"
              label="Ilość sekund"
              type="number"
              fullWidth
              variant="outlined"
              value={customTimeoutValue}
              onChange={(e) => setCustomTimeoutValue(e.target.value)}
              inputProps={{ min: 1 }}
              helperText="Podaj ilość sekund (np. 30, 120, 600)"
            />
          </DialogContent>
          <DialogActions>
            <Button onClick={() => { setCustomTimeoutDialog(false); setCustomTimeoutValue('') }}>Anuluj</Button>
            <Button 
              onClick={applyCustomTimeout} 
              variant="contained" 
              disabled={!customTimeoutValue.trim() || isNaN(parseInt(customTimeoutValue)) || parseInt(customTimeoutValue) < 1}
            >
              Zastosuj
            </Button>
          </DialogActions>
        </Dialog>
        
        <div ref={bottomRef} />
      </Box>
      <Divider sx={{ my: 1 }} />
      <Stack direction="row" spacing={1}>
        <TextField
          fullWidth
          size="small"
          placeholder={user ? 'Napisz wiadomość…' : 'Zaloguj się, aby pisać na czacie'}
          value={text}
          onChange={(e) => setText(e.target.value)}
          disabled={!user || banned || isMuted}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
        />
        <Button variant="contained" onClick={send} disabled={!user || banned || isMuted || text.trim().length === 0}>Wyślij</Button>
      </Stack>
    </Paper>
  )
}
