import { Alert, Box, Button, Container, Stack, Typography } from '@mui/material'
import { useAuth } from '../state/AuthContext'
import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AccountPage() {
  const { user, logout, loading, error, refresh } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    // Ensure we have fresh user info when entering the account page
    refresh().catch(() => {})
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) {
    return (
      <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 8 }}>
        <Typography>Ładowanie…</Typography>
      </Container>
    )
  }

  if (!user) {
    // If not logged in, send to login page
    navigate('/login')
    return null
  }

  return (
    <Container maxWidth="sm" sx={{ mt: 6 }}>
      <Stack spacing={3}>
        <Box>
          <Typography variant="h4" sx={{ mb: 1 }}>Konto</Typography>
          <Typography variant="body1">Witaj, <strong>{user.username}</strong></Typography>
          <Typography variant="body2" color="text.secondary">Email: {user.email}</Typography>
          <Typography variant="body2" color="text.secondary">Rola: {user.role}</Typography>
        </Box>

        {error && <Alert severity="error">{error}</Alert>}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button variant="contained" color="primary" onClick={() => navigate('/')}>Przeglądaj produkty</Button>
          <Button variant="outlined" color="error" onClick={async () => { await logout(); navigate('/login') }}>Wyloguj</Button>
        </Stack>
      </Stack>
    </Container>
  )
}
