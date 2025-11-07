import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Divider,
  IconButton,
  Pagination,
  Skeleton,
  Stack,
  TextField,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  InputAdornment,
} from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import CategoryLink from '../components/CategoryLink'
import ProductCard, { type Product } from '../components/ProductCard'
import { useLocation, useNavigate } from 'react-router-dom'

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5000'

type ApiList = {
  data: Product[]
  total: number
  page: number
  pages: number
}

export default function ProductsPage() {
  const navigate = useNavigate()
  const location = useLocation()
  const [items, setItems] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(() => {
    const p = parseInt(new URLSearchParams(location.search).get('page') || '1', 10)
    return isNaN(p) || p < 1 ? 1 : p
  })
  const [pages, setPages] = useState(1)
  const [q, setQ] = useState(() => new URLSearchParams(location.search).get('q') || '')
  const [category, setCategory] = useState(() => new URLSearchParams(location.search).get('category') || '')
  const [categories, setCategories] = useState<string[]>([])
  const [minPrice, setMinPrice] = useState(() => new URLSearchParams(location.search).get('minPrice') || '')
  const [maxPrice, setMaxPrice] = useState(() => new URLSearchParams(location.search).get('maxPrice') || '')
  const [inStock, setInStock] = useState<'' | 'true' | 'false'>(() => (new URLSearchParams(location.search).get('inStock') as any) || '')
  const [sort, setSort] = useState(() => new URLSearchParams(location.search).get('sort') || '-createdAt')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [catSearchOpen, setCatSearchOpen] = useState(false)
  const [catQuery, setCatQuery] = useState('')

  // Usuwamy tryb sekcji – zawsze jedna lista (opcjonalnie filtrowana kategorią)

  const query = useMemo(() => {
    const p = new URLSearchParams()
    p.set('page', String(page))
    p.set('limit', '12')
    p.set('sort', sort || '-createdAt')
    if (q.trim()) p.set('q', q.trim())
    if (category.trim()) p.set('category', category.trim())
    if (minPrice.trim()) p.set('minPrice', minPrice.trim())
    if (maxPrice.trim()) p.set('maxPrice', maxPrice.trim())
    if (inStock) p.set('inStock', inStock)
    return p.toString()
  }, [page, q, category, minPrice, maxPrice, inStock, sort])

  useEffect(() => {
    let abort = false
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/api/products?${query}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Błąd ładowania')
        return res.json() as Promise<ApiList>
      })
      .then((data) => {
        if (abort) return
        setItems(data.data)
        setTotal(data.total)
        setPages(data.pages)
      })
      .catch((e) => { if (!abort) setError(e?.message || 'Błąd') })
      .finally(() => { if (!abort) setLoading(false) })
    return () => { abort = true }
  }, [query])

  // Aktualizuj URL przy zmianie zapytania, kategorii lub strony, aby umożliwić linki z Home
  useEffect(() => {
    const p = new URLSearchParams(location.search)
    if (q.trim()) p.set('q', q.trim())
    else p.delete('q')
    if (category.trim()) p.set('category', category.trim())
    else p.delete('category')
    if (minPrice.trim()) p.set('minPrice', minPrice.trim())
    else p.delete('minPrice')
    if (maxPrice.trim()) p.set('maxPrice', maxPrice.trim())
    else p.delete('maxPrice')
    if (inStock) p.set('inStock', inStock)
    else p.delete('inStock')
    if (sort && sort !== '-createdAt') p.set('sort', sort)
    else p.delete('sort')
    p.set('page', String(page))
    const search = p.toString()
    navigate({ pathname: '/products', search }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, minPrice, maxPrice, inStock, sort, page])

  // Fetch active categories for sections & filter bar
  useEffect(() => {
    let abort = false
    fetch(`${API_BASE}/api/categories`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Błąd kategorii')
        return res.json() as Promise<{ categories: string[] }>
      })
      .then((data) => { if (!abort) setCategories(data.categories || []) })
      .catch(() => { if (!abort) setCategories([]) })
    return () => { abort = true }
  }, [])

  // (Sekcje usunięte)

  const filteredCategories = useMemo(() => {
    const q = catQuery.trim().toLowerCase()
    if (!q) return categories
    return categories.filter((c) => c.toLowerCase().includes(q))
  }, [categories, catQuery])

  return (
    <Box sx={{ py: 3 }}>
      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: { xs: '1fr', md: '260px 1fr' },
          gap: 3,
          alignItems: 'start'
        }}
      >
        {/* Sidebar */}
        <Stack spacing={3} sx={{ position: { md: 'sticky' }, top: { md: 80 } }}>
          {/* Sortowanie */}
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" color="text.secondary">Sortowanie</Typography>
            <FormControl size="small" fullWidth>
              <InputLabel id="sort-label">Sortuj</InputLabel>
              <Select
                labelId="sort-label"
                value={sort}
                label="Sortuj"
                onChange={(e) => { setPage(1); setSort(e.target.value as string) }}
              >
                <MenuItem value="-createdAt">Najnowsze</MenuItem>
                <MenuItem value="createdAt">Najstarsze</MenuItem>
                <MenuItem value="price">Cena: rosnąco</MenuItem>
                <MenuItem value="-price">Cena: malejąco</MenuItem>
                <MenuItem value="name">Nazwa: A-Z</MenuItem>
                <MenuItem value="-name">Nazwa: Z-A</MenuItem>
              </Select>
            </FormControl>
          </Stack>

          <Divider />

          {/* Filtrowanie */}
          <Stack spacing={1.5}>
            <Typography variant="subtitle2" color="text.secondary">Filtrowanie</Typography>
            <Stack direction="row" spacing={1}>
              <TextField
                size="small"
                label="Cena od"
                type="number"
                value={minPrice}
                onChange={(e) => { setPage(1); setMinPrice(e.target.value) }}
                inputProps={{ min: 0 }}
              />
              <TextField
                size="small"
                label="Cena do"
                type="number"
                value={maxPrice}
                onChange={(e) => { setPage(1); setMaxPrice(e.target.value) }}
                inputProps={{ min: 0 }}
              />
            </Stack>
            <FormControlLabel
              control={
                <Switch
                  color="default"
                  checked={inStock === 'true'}
                  onChange={(e) => { setPage(1); setInStock(e.target.checked ? 'true' : '') }}
                />
              }
              label="Tylko dostępne"
            />
          </Stack>
          <Divider />

          {/* Kategorie */}
          {!!categories.length && (
            <Stack spacing={1.5}>
              <Stack direction="row" alignItems="center" justifyContent="space-between">
                <Typography variant="subtitle2" color="text.secondary">Kategorie</Typography>
                <IconButton size="small" aria-label="Szukaj kategorii" onClick={() => setCatSearchOpen((v) => !v)} sx={{ color: 'text.secondary' }}>
                  <SearchIcon fontSize="small" />
                </IconButton>
              </Stack>
              {catSearchOpen && (
                <TextField
                  size="small"
                  placeholder="Szukaj kategorii…"
                  value={catQuery}
                  onChange={(e) => setCatQuery(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <SearchIcon fontSize="small" />
                      </InputAdornment>
                    )
                  }}
                />
              )}
              <Stack direction="row" spacing={2} flexWrap="wrap" useFlexGap>
                {filteredCategories.map((cat) => (
                  <CategoryLink
                    key={cat}
                    label={cat}
                    selected={category === cat}
                    onClick={() => { setCategory(cat); setPage(1) }}
                    onClear={category === cat ? () => { setCategory(''); setPage(1) } : undefined}
                    sx={{ mr: 0.5, mb: 0.5 }}
                  />
                ))}
              </Stack>
            </Stack>
          )}
        </Stack>
        {/* Main content */}
        <Stack spacing={3}>
          {/* Centered search bar */}
          <Box display="flex" justifyContent="center">
            <TextField
              size="small"
              placeholder="Szukaj…"
              value={q}
              onChange={(e) => { setPage(1); setQ(e.target.value) }}
              sx={{ width: '100%', maxWidth: 600 }}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
            />
          </Box>
          {error && <Alert severity="error">{error}</Alert>}
          {/* Zawsze jedna lista produktów (opcjonalnie filtrowana) */}
          {loading ? (
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(4, 1fr)' }} gap={2}>
              {Array.from({ length: 12 }).map((_, i) => (
                <Box key={i} sx={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
                  <Skeleton variant="rectangular" sx={{ position: 'absolute', inset: 0 }} />
                </Box>
              ))}
            </Box>
          ) : (
            <>
              <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)', lg: 'repeat(4, 1fr)' }} gap={2}>
                {items.map((p) => (
                  <Box key={p._id}>
                    <ProductCard product={p} onClick={(prod) => navigate(`/products/${prod.slug || prod._id}`)} />
                  </Box>
                ))}
              </Box>
              <Stack direction="row" justifyContent="center" sx={{ pt: 2 }}>
                <Pagination color="standard" count={pages} page={page} onChange={(_, v) => setPage(v)} />
              </Stack>
              <Typography variant="body2" color="text.secondary">Razem: {total}</Typography>
            </>
          )}
        </Stack>
      </Box>
    </Box>
  )
}
