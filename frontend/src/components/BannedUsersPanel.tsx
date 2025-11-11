import { useEffect, useState, useMemo, useRef } from 'react'
import { Box, Typography, Paper, List, ListItem, ListItemText, IconButton, Chip, Collapse, Button, Divider } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import ExpandLessIcon from '@mui/icons-material/ExpandLess'
import BlockIcon from '@mui/icons-material/Block'
import { io, Socket } from 'socket.io-client'

type Penalty = {
  id: string
  userId: string
  username: string
  type: 'ban' | 'timeout'
  until: string | null
  createdAt: string
}

export default function BannedUsersPanel() {
  const [penalties, setPenalties] = useState<Penalty[]>([])
  const [expanded, setExpanded] = useState(false)
  const [loading, setLoading] = useState(false)
  const socketRef = useRef<Socket | null>(null)

  const serverUrl = useMemo(() => {
    const fromEnv = (import.meta as any).env?.VITE_API_URL as string | undefined
    return fromEnv?.replace(/\/$/, '') || 'http://localhost:5000'
  }, [])

  const fetchPenalties = async () => {
    try {
      setLoading(true)
      const res = await fetch(`${serverUrl}/api/chat/penalties`, { credentials: 'include' })
      if (!res.ok) return
      const data = await res.json()
      setPenalties(data?.penalties || [])
    } catch {
      // ignore
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPenalties()
    const s = io(serverUrl, { withCredentials: true, transports: ['websocket', 'polling'] })
    socketRef.current = s
    
    // Odśwież listę po zmianie moderacji
    s.on('chat:mod:timeout', fetchPenalties)
    s.on('chat:mod:ban', fetchPenalties)
    s.on('chat:mod:unban', fetchPenalties)

    return () => {
      s.removeAllListeners()
      s.disconnect()
      socketRef.current = null
    }
  }, [serverUrl])

  const unbanUser = (userId: string) => {
    if (socketRef.current?.connected) {
      socketRef.current.emit('chat:unban', { userId })
      setTimeout(fetchPenalties, 300)
    } else {
      // Fallback: create temporary socket and wait for connection
      const tempSocket = io(serverUrl, { withCredentials: true, transports: ['websocket', 'polling'] })
      tempSocket.on('connect', () => {
        tempSocket.emit('chat:unban', { userId })
        setTimeout(() => {
          tempSocket.disconnect()
          fetchPenalties()
        }, 500)
      })
    }
  }

  const now = Date.now()
  const activePenalties = penalties.filter((p) => {
    if (p.type === 'ban') return true
    if (!p.until) return false
    return new Date(p.until).getTime() > now
  })

  return (
    <Paper variant="outlined" sx={{ p: 2 }}>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', cursor: 'pointer' }} onClick={() => setExpanded(!expanded)}>
        <Typography variant="h6">
          Zbanowani użytkownicy ({activePenalties.length})
        </Typography>
        <IconButton size="small">
          {expanded ? <ExpandLessIcon /> : <ExpandMoreIcon />}
        </IconButton>
      </Box>
      <Collapse in={expanded}>
        <Divider sx={{ my: 1 }} />
        {loading && <Typography variant="body2" color="text.secondary">Ładowanie...</Typography>}
        {!loading && activePenalties.length === 0 && (
          <Typography variant="body2" color="text.secondary">Brak aktywnych kar</Typography>
        )}
        <List dense>
          {activePenalties.map((p) => (
            <ListItem
              key={p.id}
              secondaryAction={
                <Button size="small" onClick={() => unbanUser(p.userId)} startIcon={<BlockIcon />}>
                  Odbanuj
                </Button>
              }
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="subtitle2">{p.username}</Typography>
                    <Chip size="small" label={p.type === 'ban' ? 'Ban' : 'Timeout'} color={p.type === 'ban' ? 'error' : 'warning'} />
                  </Box>
                }
                secondary={
                  p.type === 'timeout' && p.until
                    ? `Do ${new Date(p.until).toLocaleString('pl-PL')}`
                    : 'Permanentny ban'
                }
              />
            </ListItem>
          ))}
        </List>
      </Collapse>
    </Paper>
  )
}
