import { useEffect, useState } from 'react'
import { Alert, Box, Button, Container, Paper, Radio, RadioGroup, Stack, TextField, Typography, Snackbar, FormControlLabel } from '@mui/material'
const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5000'
import { useCart } from '../state/CartContext'
import { useAuth } from '../state/AuthContext'
import { useNavigate, Link } from 'react-router-dom'

export default function CheckoutPage() {
  const { items, total, clear } = useCart()
  const { user } = useAuth()
  const navigate = useNavigate()

  const [firstName, setFirstName] = useState('')
  const [lastName, setLastName] = useState('')
  const [email, setEmail] = useState('')
  const [phone, setPhone] = useState('')
  const [street, setStreet] = useState('')
  const [city, setCity] = useState('')
  const [postal, setPostal] = useState('')
  const [payment, setPayment] = useState<'cod' | 'transfer'>('cod')
  const [error, setError] = useState<string | null>(null)
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })

  useEffect(() => {
    if (!items.length) {
      navigate('/cart', { replace: true })
      return
    }
    // Wymagamy zalogowania
    if (!user) {
      navigate('/login')
      return
    }
    if (user) {
      setEmail(user.email)
    }
  }, [items.length, user, navigate])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    // Prosta walidacja
    if (!firstName.trim() || !lastName.trim() || !email.trim() || !street.trim() || !city.trim() || !postal.trim()) {
      setError('Uzupełnij wszystkie wymagane pola')
      return
    }
    if (!user) {
      setError('Musisz być zalogowany aby złożyć zamówienie')
      return
    }

    try {
      const res = await fetch(`${API_BASE}/api/orders`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items: items.map(i => ({ productId: i.id, quantity: i.quantity })),
          paymentMethod: payment,
          shipping: { firstName, lastName, email, phone, street, city, postal }
        }),
        credentials: 'include'
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error(err?.message || 'Błąd zamówienia')
      }
  await res.json()
      clear()
      setSnack({ open: true, message: 'Zamówienie złożone! Dziękujemy.', severity: 'success' })
      setTimeout(() => navigate(`/`, { replace: true }), 1200)
    } catch {
      setSnack({ open: true, message: 'Nie udało się złożyć zamówienia', severity: 'error' })
    }
  }

  if (!items.length) return null

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
      <Typography variant="h4" sx={{ mb: 3 }}>Zamówienie</Typography>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
        {/* Formularz */}
        <Paper sx={{ p: 2, flex: 1 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Dane do wysyłki</Typography>
          {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
          <Box component="form" onSubmit={handleSubmit} noValidate>
            <Box sx={{ display: 'grid', gap: 2, gridTemplateColumns: { xs: '1fr', sm: 'repeat(2,1fr)' } }}>
              <Box>
                <TextField fullWidth label="Imię" value={firstName} onChange={(e) => setFirstName(e.target.value)} required />
              </Box>
              <Box>
                <TextField fullWidth label="Nazwisko" value={lastName} onChange={(e) => setLastName(e.target.value)} required />
              </Box>
              <Box>
                <TextField fullWidth type="email" label="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
              </Box>
              <Box>
                <TextField fullWidth label="Telefon" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <TextField fullWidth label="Ulica i numer" value={street} onChange={(e) => setStreet(e.target.value)} required />
              </Box>
              <Box>
                <TextField fullWidth label="Miasto" value={city} onChange={(e) => setCity(e.target.value)} required />
              </Box>
              <Box>
                <TextField fullWidth label="Kod pocztowy" value={postal} onChange={(e) => setPostal(e.target.value)} required />
              </Box>
              <Box sx={{ gridColumn: '1 / -1' }}>
                <Typography variant="subtitle1" sx={{ mt: 1 }}>Płatność</Typography>
                <RadioGroup row value={payment} onChange={(e) => setPayment(e.target.value as any)}>
                  <FormControlLabel value="cod" control={<Radio />} label="Za pobraniem" />
                  <FormControlLabel value="transfer" control={<Radio />} label="Przelew tradycyjny" />
                </RadioGroup>
              </Box>
            </Box>
            <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button type="submit" variant="contained">Złóż zamówienie</Button>
              <Button component={Link} to="/cart">Wróć do koszyka</Button>
            </Stack>
          </Box>
        </Paper>

        {/* Podsumowanie */}
        <Paper sx={{ p: 2, width: { xs: '100%', md: 360 } }}>
          <Typography variant="h6" sx={{ mb: 1 }}>Podsumowanie</Typography>
          <Stack spacing={1} sx={{ mb: 2 }}>
            {items.map((i) => (
              <Stack key={i.id} direction="row" alignItems="center" spacing={1}>
                <Box sx={{ width: 40, height: 40, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.100', flexShrink: 0 }}>
                  {i.image ? (
                    <Box component="img" src={i.image} alt={i.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Box sx={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: 10, color: 'text.secondary' }}>Brak</Box>
                  )}
                </Box>
                <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }} noWrap title={i.name}>{i.name} x{i.quantity}</Typography>
                <Typography variant="body2" sx={{ flexShrink: 0 }}>{(i.price * i.quantity).toFixed(2)} {i.currency}</Typography>
              </Stack>
            ))}
          </Stack>
          <Stack direction="row" justifyContent="space-between">
            <Typography variant="subtitle1" fontWeight={700}>Razem</Typography>
            <Typography variant="subtitle1" fontWeight={700}>{total.toFixed(2)} PLN</Typography>
          </Stack>
        </Paper>
      </Stack>

      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnack(s => ({ ...s, open: false }))} severity={snack.severity} variant="filled" sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Container>
  )
}
