import { useMemo, useState } from 'react'
import { Alert, Box, Button, Container, Stack, TextField, Typography, InputAdornment, IconButton } from '@mui/material'
import { useSearchParams, Link as RouterLink } from 'react-router-dom'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5000'

export default function ResetPasswordPage() {
  const [params] = useSearchParams()
  const token = useMemo(() => params.get('token') ?? '', [params])
  const [password, setPassword] = useState('')
  const [confirm, setConfirm] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirm, setShowConfirm] = useState(false)
  const [status, setStatus] = useState<'idle' | 'saving' | 'done' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    if (!token) {
      setError('Brak tokenu resetującego')
      return
    }

    if (password !== confirm) {
      setError('Hasła nie są takie same')
      return
    }
    setStatus('saving')
    try {
      const res = await fetch(`${API_BASE}/api/auth/reset-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, password })
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        setError(data?.message ?? 'Nie udało się zresetować hasła')
        setStatus('error')
        return
      }
      setStatus('done')
    } catch (e) {
      setError('Wystąpił błąd — spróbuj ponownie później')
      setStatus('error')
    }
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Typography variant="h5" gutterBottom>Ustaw nowe hasło</Typography>
      {!token && <Alert severity="error" sx={{ mb: 2 }}>Brak tokenu resetującego</Alert>}
      {status === 'done' && (
        <Alert severity="success" sx={{ mb: 2 }}>
          Hasło zostało zmienione. Możesz się teraz <RouterLink to="/login">zalogować</RouterLink>.
        </Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          <TextField
            label="Nowe hasło"
            type={showPassword ? 'text' : 'password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showPassword ? 'Ukryj hasło' : 'Pokaż hasło'}
                    onClick={() => setShowPassword((v) => !v)}
                    onMouseDown={(e) => e.preventDefault()}
                    edge="end"
                    size="small"
                  >
                    {showPassword ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <TextField
            label="Powtórz hasło"
            type={showConfirm ? 'text' : 'password'}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
            InputProps={{
              endAdornment: (
                <InputAdornment position="end">
                  <IconButton
                    aria-label={showConfirm ? 'Ukryj hasło' : 'Pokaż hasło'}
                    onClick={() => setShowConfirm((v) => !v)}
                    onMouseDown={(e) => e.preventDefault()}
                    edge="end"
                    size="small"
                  >
                    {showConfirm ? <VisibilityOff /> : <Visibility />}
                  </IconButton>
                </InputAdornment>
              )
            }}
          />
          <Button type="submit" variant="contained" disabled={!token || status === 'saving'}>
            {status === 'saving' ? 'Zapisywanie…' : 'Zmień hasło'}
          </Button>
        </Stack>
      </Box>
    </Container>
  )
}
