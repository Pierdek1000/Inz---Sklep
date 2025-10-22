
import './App.css'
import { useEffect, useState } from 'react'
import { Button, Container, Typography, Stack, TextField, Alert, Box } from '@mui/material'

type User = { id: string; username: string; email: string } | null

const API_BASE = import.meta.env.VITE_API_URL ?? 'http://localhost:5000'

function App() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [user, setUser] = useState<User>(null)
  const [mode, setMode] = useState<'login' | 'register'>('login')

  async function fetchMe() {
    try {
      const res = await fetch(`${API_BASE}/api/auth/me`, { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setUser(data.user)
      } else {
        setUser(null)
      }
    } catch (e) {
      setUser(null)
    }
  }

  useEffect(() => {
    fetchMe()
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    try {
      const endpoint = mode === 'login' ? 'login' : 'register'
      const body = mode === 'login' ? { email, password } : { username, email, password }
      const res = await fetch(`${API_BASE}/api/auth/${endpoint}` , {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(body)
      })
      const data = await res.json()
      if (!res.ok) {
        setError(data?.message ?? 'Błąd logowania')
        return
      }
      setUser(data.user)
      setEmail('')
      setPassword('')
      setUsername('')
    } catch (e) {
      setError('Nie udało się połączyć z serwerem')
    }
  }

  const onLogout = async () => {
    await fetch(`${API_BASE}/api/auth/logout`, { method: 'POST', credentials: 'include' })
    setUser(null)
  }

  return (
    <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 8 }}>
      <Stack spacing={3} alignItems="stretch">
        <Typography variant="h4" component="h1">
          {user ? `Witaj, ${user.username}` : 'Logowanie'}
        </Typography>

        {!user && (
          <>
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
                <Button type="submit" variant="contained" color="primary">{mode === 'login' ? 'Zaloguj' : 'Zarejestruj'}</Button>
              </Stack>
            </Box>
          </>
        )}

        {user && (
          <Stack spacing={2} alignItems="center">
            <Typography>Jesteś zalogowany jako {user.email}</Typography>
            <Button variant="outlined" color="secondary" onClick={onLogout}>Wyloguj</Button>
          </Stack>
        )}
      </Stack>
    </Container>
  );
}

export default App
