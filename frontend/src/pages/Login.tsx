import { useState } from 'react'
import { Alert, Box, Button, Container, Stack, TextField, Typography } from '@mui/material'
import { useAuth } from '../state/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function LoginPage() {
  const { login, register, error } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = mode === 'login'
      ? await login(email, password)
      : await register(username, email, password)
    if (ok) navigate('/')
  }

  return (
    <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 8 }}>
      <Stack spacing={3} alignItems="stretch">
        <Typography variant="h4">{mode === 'login' ? 'Logowanie' : 'Rejestracja'}</Typography>
        <Stack direction="row" spacing={1} justifyContent="center">
          <Button variant={mode === 'login' ? 'contained' : 'outlined'} onClick={() => setMode('login')}>Logowanie</Button>
          <Button variant={mode === 'register' ? 'contained' : 'outlined'} onClick={() => setMode('register')}>Rejestracja</Button>
        </Stack>
        {error && <Alert severity="error">{error}</Alert>}
        <Box component="form" onSubmit={onSubmit} noValidate>
          <Stack spacing={2}>
            {mode === 'register' && (
              <TextField label="Nazwa użytkownika" value={username} onChange={(e) => setUsername(e.target.value)} required />
            )}
            <TextField label="Email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <TextField label="Hasło" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            <Button type="submit" variant="contained">{mode === 'login' ? 'Zaloguj' : 'Zarejestruj'}</Button>
          </Stack>
        </Box>
      </Stack>
    </Container>
  )
}
