import '../styles/login.css'
import { useEffect, useState } from 'react'
import { Alert, Box, Button, Container, Link, Stack, TextField, InputAdornment, IconButton } from '@mui/material'
import Visibility from '@mui/icons-material/Visibility'
import VisibilityOff from '@mui/icons-material/VisibilityOff'
import { useAuth } from '../state/AuthContext'
import { useNavigate } from 'react-router-dom'
import BlackLogo from '../../logo/Czarne logo.png'


export default function LoginPage() {
  const { login, register, error, user, loading } = useAuth()
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'register'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
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

  // Jeśli zalogowany, przekieruj na stronę główną
  useEffect(() => {
    if (!loading && user) {
      navigate('/', { replace: true })
    }
  }, [user, loading, navigate])

  return (
    <Container maxWidth="sm" sx={{ textAlign: 'center', mt: { xs: 4, sm: 8 }, px: { xs: 2, sm: 0 } }}>
      <Stack spacing={{ xs: 2, sm: 3 }} alignItems="stretch">
        <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
          <Box
            component="img"
            src={BlackLogo}
            alt={'Logo (Czarne)'}
            sx={{
              height: { xs: 100, sm: 180 },
              width: 'auto',
              objectFit: 'contain'
            }}
            loading="lazy"
          />
        </Box>

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
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              sx={textFieldSx}
              fullWidth
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
            {mode === 'login' && (
              <Box sx={{ textAlign: 'left', color: 'text.primary' }}>
                <Link href="/forgot-password" underline="hover" color="inherit" sx={{ '&:hover': { color: 'text.primary' } }}>
                  Nie pamiętasz hasła?
                </Link>
              </Box>
            )}
            <Button type="submit" className='loginButton' variant="contained" sx={{ width: { xs: '100%', sm: 'auto' }, alignSelf: { xs: 'stretch', sm: 'center' } }}>{mode === 'login' ? 'Zaloguj Się ' : 'Zarejestruj'}</Button>
          </Stack>
        </Box>
      </Stack>
    </Container>
  )
}
