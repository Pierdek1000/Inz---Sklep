import '../styles/home.css'
import { useEffect, useMemo, useState } from 'react'
import { Alert, Box, Button, Chip, Container, Skeleton, Stack, TextField, Typography } from '@mui/material'
import ProductCard, { type Product } from '../components/ProductCard'
import { useNavigate } from 'react-router-dom'

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5000'

type CategoriesResponse = { categories: string[] }

export default function HomePage() {
  const navigate = useNavigate()
  const [featured, setFeatured] = useState<Product[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [categories, setCategories] = useState<string[]>([])
  const [catError, setCatError] = useState<string | null>(null)
  const [catLoading, setCatLoading] = useState(true)

  const query = useMemo(() => {
    const p = new URLSearchParams()
    p.set('page', '1')
    p.set('limit', '8')
    p.set('sort', '-createdAt')
    return p.toString()
  }, [])

  useEffect(() => {
    let abort = false
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/api/products?${query}`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Błąd ładowania produktów')
        return res.json() as Promise<{ data: Product[] }>
      })
      .then((data) => { if (!abort) setFeatured(data.data) })
      .catch((e) => { if (!abort) setError(e?.message || 'Błąd') })
      .finally(() => { if (!abort) setLoading(false) })
    return () => { abort = true }
  }, [query])

  useEffect(() => {
    let abort = false
    setCatLoading(true)
    setCatError(null)
    fetch(`${API_BASE}/api/products/categories`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Błąd ładowania kategorii')
        return res.json() as Promise<CategoriesResponse>
      })
      .then((data) => { if (!abort) setCategories(data.categories || []) })
      .catch((e) => { if (!abort) setCatError(e?.message || 'Błąd') })
      .finally(() => { if (!abort) setCatLoading(false) })
    return () => { abort = true }
  }, [])

  const goSearch = () => {
    const q = search.trim()
    navigate(q ? `/products?q=${encodeURIComponent(q)}` : '/products')
  }

  return (
    <Box sx={{ py: { xs: 2, md: 4 } }}>
      {/* HERO */}
      <Box className="home-hero">
        <Container maxWidth="lg">
          <Stack spacing={3} sx={{ py: { xs: 6, md: 10 } }}>
            <Typography
              variant="h2"
              sx={{
                fontWeight: 800,
                letterSpacing: '-0.5px',
                fontSize: { xs: '2rem', sm: '2.75rem', md: '3.25rem' },
                lineHeight: 1.1,
              }}
            >
              Odkryj produkty, które pokochasz
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ maxWidth: 680 }}>
              Najnowsze trendy, sprawdzone marki i świetne ceny. Zacznij od wyszukania tego, czego potrzebujesz.
            </Typography>

            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} alignItems={{ xs: 'stretch', sm: 'center' }}>
              <TextField
                placeholder="Czego szukasz?"
                fullWidth
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onKeyDown={(e) => { if (e.key === 'Enter') goSearch() }}
                size="medium"
                sx={{ bgcolor: '#fff', borderRadius: 2 }}
              />
              <Button
                onClick={goSearch}
                variant="contained"
                size="large"
                disableElevation
                sx={{ px: { xs: 3, sm: 4 }, py: 1.5, textTransform: 'none', fontWeight: 700 }}
              >
                Szukaj
              </Button>
              <Button
                variant="outlined"
                size="large"
                onClick={() => navigate('/products')}
                sx={{ textTransform: 'none', fontWeight: 700 }}
              >
                Przeglądaj wszystko
              </Button>
            </Stack>

            {!!catError && <Alert severity="warning">{catError}</Alert>}
            <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap' }}>
              {catLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <Skeleton key={i} variant="rounded" width={96} height={32} />
                ))
              ) : (
                categories.map((c) => (
                  <Chip
                    key={c}
                    label={c}
                    onClick={() => navigate(`/products?category=${encodeURIComponent(c)}`)}
                    sx={{
                      bgcolor: 'rgba(255,255,255,0.85)',
                      '&:hover': { bgcolor: 'rgba(255,255,255,1)' },
                      mr: 1, mb: 1,
                      cursor: 'pointer',
                    }}
                  />
                ))
              )}
            </Stack>
          </Stack>
        </Container>
      </Box>

      {/* FEATURED */}
      <Container maxWidth="lg">
        <Stack spacing={2} sx={{ mt: { xs: 2, md: 4 } }}>
          <Stack direction="row" alignItems="center">
            <Typography variant="h5" fontWeight={700}>Nowości</Typography>
            <Box sx={{ flex: 1 }} />
            <Button variant="text" onClick={() => navigate('/products')}>Zobacz wszystkie</Button>
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          {loading ? (
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={2}>
              {Array.from({ length: 8 }).map((_, i) => (
                <Box key={i} sx={{ position: 'relative', width: '100%', aspectRatio: '1 / 1' }}>
                  <Skeleton variant="rectangular" sx={{ position: 'absolute', inset: 0 }} />
                </Box>
              ))}
            </Box>
          ) : (
            <Box display="grid" gridTemplateColumns={{ xs: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={2}>
              {featured.map((p) => (
                <Box key={p._id}>
                  <ProductCard product={p} onClick={(prod) => navigate(`/products/${prod.slug || prod._id}`)} />
                </Box>
              ))}
            </Box>
          )}
        </Stack>
      </Container>
    </Box>
  )
}
