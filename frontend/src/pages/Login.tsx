import '../styles/login.css'
import { useState } from 'react'
import { Alert, Box, Button, Container, Link, Stack, TextField, Typography } from '@mui/material'
import { useAuth } from '../state/AuthContext'
import { useNavigate } from 'react-router-dom'


export default function LoginPage() {
  const { login, register, error } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [username, setUsername] = useState('')

  const textFieldSx = {
    '& .MuiInputBase-input': { fontSize: '1.1rem', color: '#000000', caretColor: '#000000' },
    '& .MuiInputLabel-root': { fontSize: '1.1rem', color: '#000000' },
    '& .MuiInputLabel-root.MuiInputLabel-shrink': { fontSize: '1rem' },
    '& .MuiInputLabel-root.Mui-focused': { color: '#000000' },
    '& .MuiInput-underline:before': { borderBottomColor: '#828282' },
    '& .MuiInput-underline:hover:not(.Mui-disabled):before': { borderBottomColor: '#828282' },
    '& .MuiInput-underline:after': { borderBottomColor: '#828282' }
  } as const

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    const ok = mode === 'login'
      ? await login(email, password)
      : await register(username, email, password)
    if (ok) navigate('/')
  }

  return (
    <Container maxWidth="sm" sx={{ textAlign: 'center', mt: { xs: 4, sm: 8 }, px: { xs: 2, sm: 0 } }}>
      <Stack spacing={{ xs: 2, sm: 3 }} alignItems="stretch">
        <Typography className='loginHeader' variant="h4" sx={{ fontSize: { xs: '1.75rem', sm: '2.125rem' } }}>{mode === 'login' ? 'Zmienić na zdjęcie' : 'Rejestracja'}</Typography> 

        <Stack direction="row" spacing={{ xs: 1, sm: 1.5 }} justifyContent="center" className="auth-switch" sx={{ flexWrap: 'wrap', rowGap: 1 }}>
          <Button
            className={`auth-switch-btn ${mode === 'login' ? 'is-active' : ''}`}
            variant={mode === 'login' ? 'contained' : 'outlined'}
            disableRipple
            disableFocusRipple
            onClick={() => setMode('login')}
            sx={{ width: { xs: '48%', sm: 'auto' } }}
          >
            Logowanie
          </Button>
          <Button
            className={`auth-switch-btn ${mode === 'register' ? 'is-active' : ''}`}
            variant={mode === 'register' ? 'contained' : 'outlined'}
            disableRipple
            disableFocusRipple
            onClick={() => setMode('register')}
            sx={{ width: { xs: '48%', sm: 'auto' } }}
          >
            Rejestracja
          </Button>

        </Stack>
                {error && (
          <Alert severity="error">{error}</Alert>
        )}

  <Box component="form" onSubmit={onSubmit}>
          <Stack spacing={2}>
            {mode === 'register' && (
              <TextField
                variant='standard'
                label="Nazwa użytkownika"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                sx={textFieldSx}
                fullWidth
              />
            )}
            <TextField
              variant='standard'
              label="Email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              sx={textFieldSx}
              fullWidth
            />
            <TextField
              variant='standard'
              label="Hasło"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              sx={textFieldSx}
              fullWidth
            />
            {mode === 'login' && (
              <Box sx={{ textAlign: 'left' }}>
                <Link href="/forgot-password" underline="hover">Nie pamiętasz hasła?</Link>
              </Box>
            )}
            <Button type="submit" className='loginButton' variant="contained" sx={{ width: { xs: '100%', sm: 'auto' }, alignSelf: { xs: 'stretch', sm: 'center' } }}>{mode === 'login' ? 'Zaloguj Się ' : 'Zarejestruj'}</Button>
          </Stack>
        </Box>
      </Stack>
    </Container>
  )
}
