import { useEffect, useMemo, useRef, useState } from 'react'
import { io, Socket } from 'socket.io-client'
import { Box, Button, Divider, Paper, Stack, TextField, Typography } from '@mui/material'
import { useAuth } from '../state/AuthContext'

type ChatMessage = {
  id: string
  username: string
  role: 'user' | 'admin' | 'seller'
  text: string
  ts: number
}

export default function LiveChat() {
  const { user } = useAuth()
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [text, setText] = useState('')
  const bottomRef = useRef<HTMLDivElement | null>(null)
  const socketRef = useRef<Socket | null>(null)

  const serverUrl = useMemo(() => {
    const fromEnv = (import.meta as any).env?.VITE_API_URL as string | undefined
    return fromEnv?.replace(/\/$/, '') || 'http://localhost:5000'
  }, [])

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

  return (
    <Paper variant="outlined" sx={{ p: 2, display: 'flex', flexDirection: 'column', height: { xs: 500, md: '75vh', lg: '80vh' } }}>
      <Typography variant="h6" sx={{ mb: 1 }}>Czat na żywo</Typography>
      <Divider sx={{ mb: 1 }} />
      <Box sx={{ flex: 1, overflow: 'auto', pr: 1 }}>
        {messages.map((m, i) => (
          <Box key={i} sx={{ mb: 1.25 }}>
            <Typography variant="subtitle2">
              {m.username} <Typography component="span" variant="caption" color="text.secondary">[{new Date(m.ts).toLocaleTimeString()}]</Typography>
            </Typography>
            <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{m.text}</Typography>
          </Box>
        ))}
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
          disabled={!user}
          onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); send(); } }}
        />
        <Button variant="contained" onClick={send} disabled={!user || text.trim().length === 0}>Wyślij</Button>
      </Stack>
    </Paper>
  )
}
