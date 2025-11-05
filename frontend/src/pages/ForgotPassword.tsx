import { useState } from 'react'
import { Alert, Box, Button, Container, Stack, TextField, Typography } from '@mui/material'

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5000'

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'sending' | 'sent' | 'error'>('idle')
  const [error, setError] = useState<string | null>(null)

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setStatus('sending')
    try {
      const res = await fetch(`${API_BASE}/api/auth/forgot-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      if (!res.ok) {
        
        setStatus('sent')
      } else {
        setStatus('sent')
      }
    } catch (e) {
      setStatus('error')
      setError('Nie udało się wysłać. Spróbuj ponownie później.')
    }
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Typography variant="h5" gutterBottom>Resetowanie hasła</Typography>
      <Typography variant="body2" sx={{ mb: 2 }}>
        Podaj swój adres email. Jeśli konto istnieje, wyślemy link do zresetowania hasła.
      </Typography>
      {status === 'sent' && (
        <Alert severity="success" sx={{ mb: 2 }}>Jeśli konto istnieje, wysłaliśmy instrukcje resetu na email.</Alert>
      )}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <Box component="form" onSubmit={onSubmit}>
        <Stack spacing={2}>
          <TextField
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Button type="submit" variant="contained" disabled={status === 'sending'}>
            {status === 'sending' ? 'Wysyłanie…' : 'Wyślij link resetujący'}
          </Button>
        </Stack>
      </Box>
    </Container>
  )
}
