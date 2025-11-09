import { useEffect, useState } from 'react'
import { Alert, Box, Button, Chip, Collapse, Container, Divider, FormControl, InputLabel, MenuItem, Paper, Select, Stack, TextField, Typography } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import { useAuth } from '../state/AuthContext'

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5000'

type Order = {
  _id: string
  createdAt: string
  total: number
  status: 'new' | 'paid' | 'shipped' | 'delivered' | 'cancelled'
  paymentMethod: 'cod' | 'transfer'
  shipping: { firstName: string; lastName: string; email: string; phone?: string; street: string; city: string; postal: string }
  items: Array<{ name: string; quantity: number; price: number; currency: string; image?: string }>
}

export default function ManageOrdersPage() {
  const { user } = useAuth()
  const [orders, setOrders] = useState<Order[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [status, setStatus] = useState<string>('')
  const [q, setQ] = useState('')
  const [expanded, setExpanded] = useState<Record<string, boolean>>({})

  const canManage = !!user && (user.role === 'admin' || user.role === 'seller')

  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (status) params.set('status', status)
      if (q.trim()) params.set('q', q.trim())
      const res = await fetch(`${API_BASE}/api/orders?${params.toString()}`, { credentials: 'include' })
      if (!res.ok) throw new Error('Nie udało się pobrać zamówień')
      const data = await res.json()
      setOrders(Array.isArray(data?.data) ? data.data : [])
    } catch (e: any) {
      setError(e?.message || 'Błąd pobierania')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canManage) return
    fetchOrders()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status])

  const updateStatus = async (id: string, next: Order['status']) => {
    const prev = orders.slice()
    setOrders(orders.map(o => o._id === id ? { ...o, status: next } : o))
    const res = await fetch(`${API_BASE}/api/orders/${id}/status`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify({ status: next })
    })
    if (!res.ok) {
      setOrders(prev)
      setError('Nie udało się zaktualizować statusu')
    }
  }

  const toggle = (id: string) => setExpanded(prev => ({ ...prev, [id]: !prev[id] }))

  if (!canManage) {
    return (
      <Container maxWidth="md" sx={{ py: 4 }}>
        <Alert severity="warning">Brak uprawnień</Alert>
      </Container>
    )
  }

  return (
    <Container maxWidth="lg" sx={{ py: 4 }}>
      <Typography variant="h4" sx={{ mb: 2 }}>Zarządzanie zamówieniami</Typography>

      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="status-label">Status</InputLabel>
            <Select
              labelId="status-label"
              label="Status"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
            >
              <MenuItem value="">Wszystkie</MenuItem>
              <MenuItem value="new">Nowe</MenuItem>
              <MenuItem value="paid">Opłacone</MenuItem>
              <MenuItem value="shipped">Wysłane</MenuItem>
              <MenuItem value="delivered">Dostarczone</MenuItem>
              <MenuItem value="cancelled">Anulowane</MenuItem>
            </Select>
          </FormControl>
          <TextField label="Szukaj (imię/nazwisko/email)" value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') fetchOrders() }} />
          <Button variant="outlined" onClick={fetchOrders}>Szukaj</Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {loading ? (
        <Typography>Ładowanie…</Typography>
      ) : (
        <Stack spacing={2}>
          {orders.map(o => (
            <Paper key={o._id} sx={{ p: 2 }}>
              <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                <Stack>
                  <Typography variant="subtitle1">#{o._id}</Typography>
                  <Typography variant="body2" color="text.secondary">{new Date(o.createdAt).toLocaleString()}</Typography>
                  <Stack direction="row" spacing={1} sx={{ mt: 1 }}>
                    <Chip size="small" label={`Płatność: ${o.paymentMethod === 'cod' ? 'Pobranie' : 'Przelew'}`} />
                    <Chip size="small" label={`${o.items.length} pozycji`} />
                  </Stack>
                </Stack>
                <Stack direction={{ xs: 'column', md: 'row' }} alignItems={{ xs: 'flex-start', md: 'center' }} spacing={2}>
                  <Typography variant="subtitle1" fontWeight={700}>{o.total.toFixed(2)} PLN</Typography>
                  <FormControl sx={{ minWidth: 180 }}>
                    <InputLabel id={`st-${o._id}`}>Status</InputLabel>
                    <Select
                      labelId={`st-${o._id}`}
                      label="Status"
                      value={o.status}
                      onChange={(e) => updateStatus(o._id, e.target.value as Order['status'])}
                    >
                      <MenuItem value="new">Nowe</MenuItem>
                      <MenuItem value="paid">Opłacone</MenuItem>
                      <MenuItem value="shipped">Wysłane</MenuItem>
                      <MenuItem value="delivered">Dostarczone</MenuItem>
                      <MenuItem value="cancelled">Anulowane</MenuItem>
                    </Select>
                  </FormControl>
                  <Button size="small" endIcon={<ExpandMoreIcon sx={{ transform: expanded[o._id] ? 'rotate(180deg)' : 'none', transition: '0.2s' }} />} onClick={() => toggle(o._id)}>
                    {expanded[o._id] ? 'Schowaj szczegóły' : 'Pokaż szczegóły'}
                  </Button>
                </Stack>
              </Stack>
              <Collapse in={!!expanded[o._id]} timeout="auto" unmountOnExit>
                <Divider sx={{ my: 2 }} />
                <Stack direction={{ xs: 'column', md: 'row' }} spacing={3} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
                  {/* Items */}
                  <Box sx={{ flex: 1 }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>Pozycje</Typography>
                    <Stack spacing={1}>
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
                  </Box>
                  {/* Buyer / shipping */}
                  <Paper sx={{ p: 2, width: { xs: '100%', md: 340 } }}>
                    <Typography variant="subtitle1" sx={{ mb: 1 }}>Dane zamawiającego</Typography>
                    <Stack spacing={0.5}>
                      <Typography variant="body2"><strong>Imię i nazwisko:</strong> {o.shipping.firstName} {o.shipping.lastName}</Typography>
                      <Typography variant="body2"><strong>Email:</strong> {o.shipping.email}</Typography>
                      {o.shipping.phone && <Typography variant="body2"><strong>Telefon:</strong> {o.shipping.phone}</Typography>}
                      <Typography variant="body2"><strong>Adres:</strong> {o.shipping.street}</Typography>
                      <Typography variant="body2"><strong>Miasto/Kod:</strong> {o.shipping.postal} {o.shipping.city}</Typography>
                    </Stack>
                  </Paper>
                </Stack>
              </Collapse>
            </Paper>
          ))}
        </Stack>
      )}
    </Container>
  )
}
