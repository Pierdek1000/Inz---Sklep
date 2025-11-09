import { Alert, Box, Button, Container, Stack, Typography, Paper, IconButton, Drawer, TextField, Snackbar } from '@mui/material'
import EditOutlinedIcon from '@mui/icons-material/EditOutlined'
import { useAuth } from '../state/AuthContext'
import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'

export default function AccountPage() {
  const { user, logout, loading, error, refresh, updateProfile } = useAuth()
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)
  const [username, setUsername] = useState('')
  const [email, setEmail] = useState('')
  const [saving, setSaving] = useState(false)
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success'|'error' }>({ open: false, message: '', severity: 'success' })

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
        <Paper sx={{ p: 3, borderRadius: 3 }}>
          <Stack spacing={1.5}>
            <Stack direction="row" alignItems="center" justifyContent="space-between">
              <Typography variant="h5">Twoje konto</Typography>
              <IconButton aria-label="Edytuj dane" onClick={() => { setUsername(user.username); setEmail(user.email); setEditOpen(true) }}>
                <EditOutlinedIcon />
              </IconButton>
            </Stack>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Nazwa użytkownika</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{user.username}</Typography>
            </Box>
            <Box>
              <Typography variant="subtitle2" color="text.secondary">Email</Typography>
              <Typography variant="body1" sx={{ fontWeight: 600 }}>{user.email}</Typography>
            </Box>
          </Stack>
        </Paper>

        {error && <Alert severity="error">{error}</Alert>}

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <Button variant="contained" color="primary" onClick={() => navigate('/products')}>Przeglądaj produkty</Button>
          <Button variant="outlined" color="primary" onClick={() => navigate('/account/orders')}>Moje zamówienia</Button>
          <Button variant="outlined" color="error" onClick={async () => { await logout(); navigate('/login') }}>Wyloguj</Button>
        </Stack>
      </Stack>

      <Drawer anchor="right" open={editOpen} onClose={() => setEditOpen(false)}>
        <Box sx={{ width: { xs: 320, sm: 380 }, p: 3 }} role="presentation">
          <Typography variant="h6" sx={{ mb: 2 }}>Edytuj dane konta</Typography>
          <Stack spacing={2}>
            <TextField label="Nazwa użytkownika" value={username} onChange={(e) => setUsername(e.target.value)} fullWidth />
            <TextField type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} fullWidth />
            <Stack direction="row" spacing={1}>
              <Button variant="contained" disabled={saving} onClick={async () => {
                setSaving(true)
                const res = await updateProfile({ username, email })
                setSaving(false)
                if (!res.ok) {
                  setSnack({ open: true, message: res.message || 'Nie udało się zapisać', severity: 'error' })
                  return
                }
                setSnack({ open: true, message: 'Zapisano zmiany', severity: 'success' })
                setEditOpen(false)
              }}>Zapisz</Button>
              <Button onClick={() => setEditOpen(false)}>Anuluj</Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">Uwaga: email musi być unikalny. Nie może powtarzać się z innymi kontami.</Typography>
          </Stack>
        </Box>
      </Drawer>

      <Snackbar open={snack.open} autoHideDuration={2200} onClose={() => setSnack(s => ({ ...s, open: false }))} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
        <Alert severity={snack.severity} onClose={() => setSnack(s => ({ ...s, open: false }))}>{snack.message}</Alert>
      </Snackbar>
    </Container>
  )
}
