import '../styles/home.css'
import { Button, Container, Stack, Typography } from '@mui/material'
import { useAuth } from '../state/AuthContext'
import { useNavigate } from 'react-router-dom'

export default function HomePage() {
  const { user, logout, loading } = useAuth()
  const navigate = useNavigate()

  if (loading) {
    return <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 8 }}><Typography>Ładowanie…</Typography></Container>
  }

  if (!user) {
    navigate('/login')
    return null
  }

  return (
    <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 8 }}>
      <Stack spacing={3} alignItems="center">
        <Typography variant="h4">Witaj, {user.username}</Typography>
        <Typography>Jesteś zalogowany jako {user.email}</Typography>
        <Button variant="outlined" onClick={async () => { await logout(); navigate('/login') }}>Wyloguj</Button>
      </Stack>
    </Container>
  )
}
