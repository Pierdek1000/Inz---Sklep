import { useEffect, useMemo, useState } from 'react'
import { Alert, AppBar, Box, Button, Chip, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, Drawer, FormControl, IconButton, InputLabel, LinearProgress, MenuItem, Paper, Select, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Toolbar, Tooltip, Typography } from '@mui/material'
import Autocomplete from '@mui/material/Autocomplete'
import EditIcon from '@mui/icons-material/Edit'
import DeleteIcon from '@mui/icons-material/Delete'
import CloseIcon from '@mui/icons-material/Close'
import { useAuth } from '../state/AuthContext'
import { Link, useNavigate } from 'react-router-dom'

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5000'

type Product = {
  _id: string
  name: string
  description?: string
  price: number
  stock: number
  category: string
  brand?: string
  images: string[]
  currency?: string
}

type ListResponse = {
  data: Product[]
  total: number
  page: number
  pages: number
}

const SORTS: { label: string; value: string }[] = [
  { label: 'Najnowsze', value: '-createdAt' },
  { label: 'Najstarsze', value: 'createdAt' },
  { label: 'Cena rosnąco', value: 'price' },
  { label: 'Cena malejąco', value: '-price' },
  { label: 'Nazwa A-Z', value: 'name' },
  { label: 'Nazwa Z-A', value: '-name' },
  { label: 'Stan rosnąco', value: 'stock' },
  { label: 'Stan malejąco', value: '-stock' },
]

export default function ManageProductsPage() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const isAllowed = !!user && (user.role === 'admin' || user.role === 'seller')

  useEffect(() => { if (!isAllowed) navigate('/products') }, [isAllowed, navigate])

  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string | null>(null)
  const [inStock, setInStock] = useState<'all'|'true'|'false'>('all')
  const [sort, setSort] = useState<string>('-createdAt')
  const [limit, setLimit] = useState<number>(12)
  const [page, setPage] = useState<number>(1)

  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [items, setItems] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [pages, setPages] = useState(1)

  const [categories, setCategories] = useState<string[]>([])
  const [catLoading, setCatLoading] = useState(true)

  const [editOpen, setEditOpen] = useState(false)
  const [editLoading, setEditLoading] = useState(false)
  const [editError, setEditError] = useState<string | null>(null)
  const [selected, setSelected] = useState<Product | null>(null)

  const [delOpen, setDelOpen] = useState(false)
  const [delLoading, setDelLoading] = useState(false)

  // Load categories
  useEffect(() => {
    let abort = false
    setCatLoading(true)
    fetch(`${API_BASE}/api/categories`)
      .then(res => res.json())
      .then((data: { categories: string[] }) => { if (!abort) setCategories(data.categories || []) })
      .catch(() => {})
      .finally(() => { if (!abort) setCatLoading(false) })
    return () => { abort = true }
  }, [])

  const queryString = useMemo(() => {
    const params = new URLSearchParams()
    if (q.trim()) params.set('q', q.trim())
    if (cat) params.set('category', cat)
    if (inStock !== 'all') params.set('inStock', inStock)
    if (sort) params.set('sort', sort)
    if (limit) params.set('limit', String(limit))
    if (page) params.set('page', String(page))
    return params.toString()
  }, [q, cat, inStock, sort, limit, page])

  const load = () => {
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/api/products?${queryString}`)
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || 'Błąd pobierania')
        return data as ListResponse
      })
      .then((data) => {
        setItems(data.data || [])
        setTotal(data.total || 0)
        setPages(data.pages || 1)
      })
      .catch((e) => setError(e?.message || 'Błąd pobierania'))
      .finally(() => setLoading(false))
  }

  // Load products on param change
  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [queryString])

  const resetPage = () => setPage(1)

  const openEdit = async (p: Product) => {
    setEditError(null)
    setSelected(null)
    setEditOpen(true)
    setEditLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/products/${p._id}`)
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Nie udało się pobrać produktu')
      setSelected(data as Product)
    } catch (e: any) {
      setEditError(e?.message || 'Błąd pobierania produktu')
    } finally {
      setEditLoading(false)
    }
  }

  const saveEdit = async () => {
    if (!selected) return
    setEditLoading(true)
    setEditError(null)
    try {
      const res = await fetch(`${API_BASE}/api/products/${selected._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name: selected.name,
          price: selected.price,
          stock: selected.stock,
          category: selected.category,
          brand: selected.brand,
          description: selected.description,
          currency: selected.currency,
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Nie udało się zapisać')
      setEditOpen(false)
      load()
    } catch (e: any) {
      setEditError(e?.message || 'Błąd zapisu')
    } finally {
      setEditLoading(false)
    }
  }

  const confirmDelete = (p: Product) => {
    setSelected(p)
    setDelOpen(true)
  }

  const doDelete = async () => {
    if (!selected) return
    setDelLoading(true)
    try {
      const res = await fetch(`${API_BASE}/api/products/${selected._id}`, {
        method: 'DELETE',
        credentials: 'include'
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Nie udało się usunąć')
      setDelOpen(false)
      load()
    } catch (e) {
      // show error inline
      alert((e as any)?.message || 'Błąd usuwania')
    } finally {
      setDelLoading(false)
    }
  }

  return (
    <Box sx={{ py: 3 }}>
      <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} alignItems={{ xs: 'stretch', md: 'center' }} sx={{ mb: 2 }}>
        <Typography variant="h5" sx={{ flexGrow: 1 }}>Zarządzanie produktami</Typography>
        <Button variant="outlined" component={Link} to="/products/new">Dodaj produkt</Button>
      </Stack>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={2}>
          <TextField label="Szukaj" value={q} onChange={(e) => { setQ(e.target.value); resetPage() }} fullWidth />
          <Autocomplete
            options={categories}
            loading={catLoading}
            value={cat}
            onChange={(_e, v) => { setCat(v); resetPage() }}
            onInputChange={(_e, v) => { if (v === '') { setCat(null); resetPage() } }}
            renderInput={(params) => <TextField {...params} label="Kategoria" />}
            sx={{ minWidth: 220 }}
          />
          <FormControl sx={{ minWidth: 180 }}>
            <InputLabel id="stock-label">Stan</InputLabel>
            <Select labelId="stock-label" label="Stan" value={inStock} onChange={(e) => { setInStock(e.target.value as any); resetPage() }}>
              <MenuItem value="all">Wszystkie</MenuItem>
              <MenuItem value="true">Tylko dostępne</MenuItem>
              <MenuItem value="false">Tylko wyprzedane</MenuItem>
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 200 }}>
            <InputLabel id="sort-label">Sortowanie</InputLabel>
            <Select labelId="sort-label" label="Sortowanie" value={sort} onChange={(e) => { setSort(e.target.value as any); resetPage() }}>
              {SORTS.map((s) => <MenuItem key={s.value} value={s.value}>{s.label}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl sx={{ minWidth: 120 }}>
            <InputLabel id="limit-label">Na stronie</InputLabel>
            <Select labelId="limit-label" label="Na stronie" value={limit} onChange={(e) => { setLimit(Number(e.target.value)); resetPage() }}>
              {[12, 24, 50].map((n) => <MenuItem key={n} value={n}>{n}</MenuItem>)}
            </Select>
          </FormControl>
          <Button variant="contained" onClick={() => { setPage(1); load() }}>Filtruj</Button>
        </Stack>
      </Paper>

      {/* Kategorie przeniesione do oddzielnej strony /categories/manage */}

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper>
        {loading && <LinearProgress />}
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Podgląd</TableCell>
                <TableCell>Nazwa</TableCell>
                <TableCell>Kategoria</TableCell>
                <TableCell>Marka</TableCell>
                <TableCell align="right">Cena</TableCell>
                <TableCell align="right">Stan</TableCell>
                <TableCell align="right">Akcje</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {items.map((p) => (
                <TableRow key={p._id} hover>
                  <TableCell>
                    {p.images?.[0] ? (
                      <img src={p.images[0]} alt={p.name} style={{ width: 48, height: 48, objectFit: 'cover', borderRadius: 4 }} />
                    ) : (
                      <Box sx={{ width: 48, height: 48, bgcolor: 'action.hover', borderRadius: 1 }} />
                    )}
                  </TableCell>
                  <TableCell>
                    <Stack spacing={0.5}>
                      <Typography variant="body2" fontWeight={600}>{p.name}</Typography>
                      <Typography variant="caption" color="text.secondary">{p._id}</Typography>
                    </Stack>
                  </TableCell>
                  <TableCell>{p.category}</TableCell>
                  <TableCell>{p.brand || '-'}</TableCell>
                  <TableCell align="right">{p.price.toFixed(2)} {p.currency || 'PLN'}</TableCell>
                  <TableCell align="right">
                    {p.stock > 0 ? (
                      <Chip size="small" label={`x${p.stock}`} color="success" variant="outlined" />
                    ) : (
                      <Chip size="small" label="Brak" color="warning" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    <Tooltip title="Edytuj">
                      <IconButton onClick={() => openEdit(p)} size="small"><EditIcon fontSize="small" /></IconButton>
                    </Tooltip>
                    <Tooltip title="Usuń">
                      <IconButton onClick={() => confirmDelete(p)} size="small" color="error"><DeleteIcon fontSize="small" /></IconButton>
                    </Tooltip>
                  </TableCell>
                </TableRow>
              ))}
              {items.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography align="center" color="text.secondary" sx={{ py: 3 }}>Brak produktów</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <Stack direction="row" spacing={2} alignItems="center" justifyContent="space-between" sx={{ p: 2 }}>
          <Typography variant="body2" color="text.secondary">Łącznie: {total}</Typography>
          <Stack direction="row" spacing={1}>
            <Button disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>Poprzednia</Button>
            <Typography variant="body2" sx={{ px: 1, alignSelf: 'center' }}>Strona {page} z {pages}</Typography>
            <Button disabled={page >= pages} onClick={() => setPage((p) => Math.min(pages, p + 1))}>Następna</Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Edit Drawer */}
      <Drawer anchor="right" open={editOpen} onClose={() => setEditOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}>
        <AppBar position="relative" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>Edytuj produkt</Typography>
            <IconButton edge="end" onClick={() => setEditOpen(false)} aria-label="close"><CloseIcon /></IconButton>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: 2 }}>
          {editError && <Alert severity="error" sx={{ mb: 2 }}>{editError}</Alert>}
          {!selected && editLoading && <LinearProgress />}
          {selected && (
            <Stack spacing={2}>
              <TextField label="Nazwa" value={selected.name} onChange={(e) => setSelected({ ...selected, name: e.target.value })} />
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <TextField label="Cena" type="number" inputProps={{ step: '0.01' }} value={selected.price} onChange={(e) => setSelected({ ...selected, price: Number(e.target.value) })} />
                <TextField label="Stan" type="number" inputProps={{ step: '1' }} value={selected.stock} onChange={(e) => setSelected({ ...selected, stock: Number(e.target.value) })} />
              </Stack>
              <Autocomplete
                options={categories}
                value={selected.category || null}
                onChange={(_e, v) => setSelected({ ...selected, category: v || '' })}
                renderInput={(params) => <TextField {...params} label="Kategoria" />}
              />
              <TextField label="Marka" value={selected.brand || ''} onChange={(e) => setSelected({ ...selected, brand: e.target.value })} />
              <TextField label="Waluta" value={selected.currency || 'PLN'} onChange={(e) => setSelected({ ...selected, currency: e.target.value })} />
              <TextField label="Opis" value={selected.description || ''} onChange={(e) => setSelected({ ...selected, description: e.target.value })} multiline minRows={3} />
              <Stack direction="row" spacing={1}>
                <Button variant="contained" onClick={saveEdit} disabled={editLoading}>Zapisz</Button>
                <Button variant="text" onClick={() => setEditOpen(false)}>Anuluj</Button>
              </Stack>
            </Stack>
          )}
        </Box>
      </Drawer>

      {/* Delete dialog */}
      <Dialog open={delOpen} onClose={() => setDelOpen(false)}>
        <DialogTitle>Usunąć produkt?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            Czy na pewno chcesz usunąć produkt "{selected?.name}"? 
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDelOpen(false)}>Anuluj</Button>
          <Button color="error" onClick={doDelete} disabled={delLoading}>Usuń</Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
