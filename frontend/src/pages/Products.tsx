import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Pagination, Skeleton, Stack, TextField, Typography } from '@mui/material'
import ProductCard, { type Product } from '../components/ProductCard'

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5000'

type ApiList = {
  data: Product[]
  total: number
  page: number
  pages: number
}

export default function ProductsPage() {
  const [items, setItems] = useState<Product[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [pages, setPages] = useState(1)
  const [q, setQ] = useState('')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const query = useMemo(() => {
    const p = new URLSearchParams()
    p.set('page', String(page))
    p.set('limit', '12')
    p.set('sort', '-createdAt')
    if (q.trim()) p.set('q', q.trim())
    return p.toString()
  }, [page, q])

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

  return (
    <Stack spacing={3} sx={{ py: 3 }}>
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="h5">Produkty</Typography>
        <Box sx={{ flex: 1 }} />
        <TextField size="small" placeholder="Szukaj…" value={q} onChange={(e) => { setPage(1); setQ(e.target.value) }} />
      </Stack>

      {error && <Alert severity="error">{error}</Alert>}

      {loading ? (
        <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }} gap={2}>
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} variant="rectangular" height={240} />
          ))}
        </Box>
      ) : (
        <>
          <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(4, 1fr)' }} gap={2}>
            {items.map((p) => (
              <Box key={p._id}>
                <ProductCard product={p} />
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
