import { Alert, Box, Button, Container, Divider, IconButton, Stack, TextField, Typography, Tooltip } from '@mui/material'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline'
import RemoveIcon from '@mui/icons-material/Remove'
import AddIcon from '@mui/icons-material/Add'
import { Link } from 'react-router-dom'
import { useAuth } from '../state/AuthContext'
import { useCart } from '../state/CartContext'

export default function CartPage() {
  const { user } = useAuth()
  const { items, total, updateQty, removeItem, clear } = useCart()
  const inc = (id: string) => {
    const it = items.find(i => i.id === id)
    if (!it) return
    const cap = it.stock ?? Infinity
    updateQty(id, Math.min(cap, (it.quantity || 1) + 1))
  }
  const dec = (id: string) => updateQty(id, (items.find(i => i.id === id)?.quantity || 1) - 1)

  return (
    <Container maxWidth="lg" sx={{ py: { xs: 3, sm: 4 } }}>
      <Typography variant="h4" sx={{ mb: { xs: 2, sm: 3 } }}>Koszyk</Typography>

      {items.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 6 }}>
          <Typography variant="h6" sx={{ mb: 2 }}>Twój koszyk jest pusty</Typography>
          <Button component={Link} to="/products" variant="contained">Przejdź do produktów</Button>
        </Box>
      ) : (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={{ xs: 2, md: 3 }} alignItems={{ xs: 'stretch', md: 'flex-start' }}>
          {/* Items list */}
          <Box sx={{ flex: 1 }}>
            <Stack divider={<Divider flexItem />} spacing={2}>
              {items.map(item => (
                <Box key={item.id} sx={{ display: 'flex', gap: 2, alignItems: 'center', py: 1 }}>
                  <Box sx={{ width: 72, height: 72, borderRadius: 1, overflow: 'hidden', bgcolor: 'background.paper', flexShrink: 0 }}>
                    {item.image ? (
                      <Box component="img" src={item.image} alt={item.name} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                    ) : (
                      <Box sx={{ width: '100%', height: '100%', display: 'grid', placeItems: 'center', bgcolor: 'grey.100', color: 'text.secondary', fontSize: 12 }}>
                        Brak zdjęcia
                      </Box>
                    )}
                  </Box>
                  <Box sx={{ flex: 1, minWidth: 0 }}>
                    <Typography variant="subtitle1" noWrap title={item.name}>{item.name}</Typography>
                    <Typography variant="body2" color="text.secondary">{item.price.toFixed(2)} zł / szt.</Typography>
                    <Box sx={{ display: 'flex', alignItems: 'center', mt: 1, gap: 1 }}>
                      <IconButton aria-label="Zmniejsz" onClick={() => dec(item.id)} size="small"><RemoveIcon /></IconButton>
                      <TextField
                        value={item.quantity}
                        onChange={(e) => {
                          const v = Number(e.target.value)
                          const cap = item.stock ?? Infinity
                          updateQty(item.id, Number.isFinite(v) ? Math.min(cap, Math.max(1, v)) : 1)
                        }}
                        type="number"
                        inputProps={{ min: 1, max: item.stock ?? undefined, style: { textAlign: 'center', width: 48 } }}
                        size="small"
                      />
                      <Tooltip title={item.stock != null ? `Maksymalnie ${item.stock} na stanie` : ''} disableHoverListener={item.stock == null || item.quantity < (item.stock ?? Infinity)}>
                        <span>
                          <IconButton aria-label="Zwiększ" onClick={() => inc(item.id)} size="small" disabled={item.stock != null && item.quantity >= (item.stock ?? Infinity)}>
                            <AddIcon />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </Box>
                  </Box>
                  <Box sx={{ textAlign: 'right' }}>
                    <Typography variant="subtitle1">{(item.price * item.quantity).toFixed(2)} zł</Typography>
                    <IconButton aria-label="Usuń" onClick={() => removeItem(item.id)} color="error">
                      <DeleteOutlineIcon />
                    </IconButton>
                  </Box>
                </Box>
              ))}
            </Stack>
            <Box sx={{ mt: 2 }}>
              <Button color="error" onClick={clear}>Wyczyść koszyk</Button>
            </Box>
          </Box>

          {/* Summary */}
          <Box sx={{ width: { xs: '100%', md: 360 }, borderRadius: 2, border: '1px solid', borderColor: 'divider', p: 2, position: 'sticky', top: 16 }}>
            <Typography variant="h6" sx={{ mb: 1 }}>Podsumowanie</Typography>
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 1.5 }}>
              <Typography>Produkty</Typography>
              <Typography>{items.length}</Typography>
            </Stack>
            <Divider sx={{ my: 1 }} />
            <Stack direction="row" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" fontWeight={600}>Razem</Typography>
              <Typography variant="subtitle1" fontWeight={600}>{total.toFixed(2)} zł</Typography>
            </Stack>
            {!user && (
              <Alert severity="info" sx={{ mb: 2 }}>Zaloguj się, aby szybciej złożyć zamówienie.</Alert>
            )}
            <Button
              variant="contained"
              color="primary"
              fullWidth
              disabled={items.length === 0}
              component={Link}
              to={items.length === 0 ? '#' : '/checkout'}
            >
              Przejdź do zamówienia
            </Button>
            <Button component={Link} to="/products" fullWidth sx={{ mt: 1 }}>Kontynuuj zakupy</Button>
          </Box>
        </Stack>
      )}
    </Container>
  )
}
