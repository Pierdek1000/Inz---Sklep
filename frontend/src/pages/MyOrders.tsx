import { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, Container, Paper, Stack, Typography } from '@mui/material'
import { useAuth } from '../state/AuthContext'
import { useNavigate } from 'react-router-dom'

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5000'

type OrderItem = { name: string; quantity: number; price: number; currency: string; image?: string }

type Order = {
  id: string
  createdAt: string
  total: number
  status: string
  paymentMethod: 'cod' | 'transfer'
  items: OrderItem[]
}

export default function MyOrdersPage() {
  const { user, refresh } = useAuth()
  const navigate = useNavigate()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    (async () => {
      const me = await refresh().catch(() => null)
      if (!me && !user) { navigate('/login'); return }
      try {
        const res = await fetch(`${API_BASE}/api/orders/mine`, { credentials: 'include' })
        if (!res.ok) throw new Error('Nie udało się pobrać zamówień')
        const data = await res.json()
        setOrders(Array.isArray(data?.data) ? data.data : [])
      } catch (e: any) {
        setError(e?.message || 'Błąd pobierania zamówień')
      } finally {
        setLoading(false)
      }
    })()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  if (loading) return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography>Ładowanie…</Typography>
    </Container>
  )

  if (!user) return null

  return (
    <Container maxWidth="md" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Moje zamówienia</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {orders.length === 0 ? (
        <Paper sx={{ p: 3, textAlign: 'center' }}>
          <Typography sx={{ mb: 2 }}>Nie masz jeszcze żadnych zamówień.</Typography>
          <Button variant="contained" onClick={() => navigate('/products')}>Przejdź do produktów</Button>
        </Paper>
      ) : (
        <Stack spacing={2}>
          {orders.map(o => (
            <Paper key={o.id} sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} spacing={2}>
                <Stack>
                  <Typography variant="subtitle1">Zamówienie #{o.id}</Typography>
                  <Typography variant="body2" color="text.secondary">Data: {new Date(o.createdAt).toLocaleString()}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip size="small" label={`Status: ${o.status}`} />
                    <Chip size="small" label={`Płatność: ${o.paymentMethod === 'cod' ? 'Pobranie' : 'Przelew'}`} />
                  </Stack>
                </Stack>
                <Typography variant="subtitle1" fontWeight={700}>{o.total.toFixed(2)} PLN</Typography>
              </Stack>
              <Stack spacing={1} sx={{ mt: 1 }}>
                {o.items.map((it, idx) => (
                  <Stack key={idx} direction="row" alignItems="center" spacing={1}>
                    <Box sx={{ width: 40, height: 40, borderRadius: 1, overflow: 'hidden', bgcolor: 'grey.100', flexShrink: 0 }}>
                      {it.image ? (
                        <Box component="img" src={it.image} alt={it.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Box sx={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: 10, color: 'text.secondary' }}>Brak</Box>
                      )}
                    </Box>
                    <Typography variant="body2" sx={{ flexGrow: 1, minWidth: 0 }} noWrap title={it.name}>{it.name} x{it.quantity}</Typography>
                    <Typography variant="body2" sx={{ flexShrink: 0 }}>{(it.price * it.quantity).toFixed(2)} {it.currency}</Typography>
                  </Stack>
                ))}
              </Stack>
            </Paper>
          ))}
        </Stack>
      )}
    </Container>
  )
}
