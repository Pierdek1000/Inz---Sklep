import { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, Container, Paper, Stack, Typography, Divider, Tooltip } from '@mui/material'
import LocalShippingIcon from '@mui/icons-material/LocalShipping'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import CancelIcon from '@mui/icons-material/Cancel'
import PendingActionsIcon from '@mui/icons-material/PendingActions'
import MonetizationOnIcon from '@mui/icons-material/MonetizationOn'
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
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Moje zamówienia</Typography>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {orders.length === 0 ? (
        <Paper sx={{ p: 4, textAlign: 'center', borderRadius: 3 }}>
          <Typography sx={{ mb: 2 }}>Nie masz jeszcze żadnych zamówień.</Typography>
          <Button variant="contained" onClick={() => navigate('/products')}>Przejdź do produktów</Button>
        </Paper>
      ) : (
        <Stack spacing={3}>
          {orders.map(o => (
            <Paper key={o.id} sx={{ p: { xs: 2.5, md: 3.5 }, borderRadius: 3, position: 'relative', overflow: 'hidden' }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                <Stack spacing={0.5} sx={{ flex: 1, minWidth: 0 }}>
                  <Typography variant="h6" sx={{ fontSize: { xs: 16, md: 18 } }}>Zamówienie <Box component="span" sx={{ color: 'primary.main', fontWeight: 700 }}>#{o.id}</Box></Typography>
                  <Typography variant="body2" color="text.secondary">Data: {new Date(o.createdAt).toLocaleString()}</Typography>
                  <Stack direction="row" spacing={1} flexWrap="wrap" sx={{ mt: 0.5 }}>
                    <StatusChip status={o.status} />
                    <Chip size="small" icon={<MonetizationOnIcon fontSize="small" />} label={o.paymentMethod === 'cod' ? 'Płatność: Pobranie' : 'Płatność: Przelew'} variant="outlined" />
                    <Chip size="small" label={`${o.items.length} pozycji`} variant="outlined" />
                  </Stack>
                </Stack>
                <Stack alignItems={{ xs: 'flex-start', md: 'flex-end' }} spacing={0.5}>
                  <Typography variant="subtitle1" fontWeight={700} sx={{ fontSize: { xs: 18, md: 22 } }}>{o.total.toFixed(2)} PLN</Typography>
                  <Tooltip title="Suma brutto produktów">
                    <Typography variant="caption" color="text.secondary">Kwota zamówienia</Typography>
                  </Tooltip>
                </Stack>
              </Stack>
              <Divider sx={{ my: 2 }} />
              <Box sx={{
                display: 'grid',
                gap: 1.5,
                gridTemplateColumns: {
                  xs: 'repeat(auto-fill,minmax(200px,1fr))',
                  sm: 'repeat(auto-fill,minmax(220px,1fr))',
                  md: 'repeat(auto-fill,minmax(240px,1fr))'
                }
              }}>
                {o.items.map((it, idx) => (
                  <Paper key={idx} variant="outlined" sx={{ p: 1.2, display: 'flex', alignItems: 'center', gap: 1.2, borderRadius: 2 }}>
                    <Box sx={{ width: 56, height: 56, borderRadius: 2, overflow: 'hidden', bgcolor: 'grey.100', flexShrink: 0, boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.06)' }}>
                      {it.image ? (
                        <Box component="img" src={it.image} alt={it.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                      ) : (
                        <Box sx={{ display: 'grid', placeItems: 'center', height: '100%', fontSize: 11, color: 'text.secondary' }}>Brak</Box>
                      )}
                    </Box>
                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Typography variant="body2" noWrap title={it.name}>{it.name}</Typography>
                      <Typography variant="caption" color="text.secondary">Ilość: {it.quantity}</Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={600}>{(it.price * it.quantity).toFixed(2)} {it.currency}</Typography>
                  </Paper>
                ))}
              </Box>
            </Paper>
          ))}
        </Stack>
      )}
    </Container>
  )
}

function StatusChip({ status }: { status: string }) {
  switch (status) {
    case 'new':
      return <Chip size="small" icon={<PendingActionsIcon fontSize="small" />} label="Status: Nowe" color="info" variant="outlined" />
    case 'paid':
      return <Chip size="small" icon={<MonetizationOnIcon fontSize="small" />} label="Status: Opłacone" color="success" variant="outlined" />
    case 'shipped':
      return <Chip size="small" icon={<LocalShippingIcon fontSize="small" />} label="Status: Wysłane" color="primary" variant="outlined" />
    case 'delivered':
      return <Chip size="small" icon={<CheckCircleIcon fontSize="small" />} label="Status: Dostarczone" color="success" variant="outlined" />
    case 'cancelled':
      return <Chip size="small" icon={<CancelIcon fontSize="small" />} label="Status: Anulowane" color="error" variant="outlined" />
    default:
      return <Chip size="small" label={`Status: ${status}`} variant="outlined" />
  }
}
