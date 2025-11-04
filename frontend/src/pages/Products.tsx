import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Chip, Pagination, Skeleton, Stack, TextField, Typography } from '@mui/material'
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
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const query = useMemo(() => {
    const p = new URLSearchParams()
    p.set('page', String(page))
    p.set('limit', '12')
    p.set('sort', '-createdAt')
    if (q.trim()) p.set('q', q.trim())
    if (category.trim()) p.set('category', category.trim())
    return p.toString()
  }, [page, q, category])

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
    p.set('page', String(page))
    const search = p.toString()
    navigate({ pathname: '/products', search }, { replace: true })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q, category, page])

  return (
    <Stack spacing={3} sx={{ py: 3 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="h5">Produkty</Typography>
        <Box sx={{ flex: 1 }} />
        <TextField size="small" placeholder="Szukaj…" value={q} onChange={(e) => { setPage(1); setQ(e.target.value) }} />
        {category && (
          <Chip
            label={category}
            onDelete={() => { setCategory(''); setPage(1) }}
            size="small"
          />
        )}
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

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
            <Pagination color="primary" count={pages} page={page} onChange={(_, v) => setPage(v)} />
          </Stack>
          <Typography variant="body2" color="text.secondary">Razem: {total}</Typography>
        </>
      )}
    </Stack>
  )
}
