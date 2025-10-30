import { useEffect, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Alert, Box, Breadcrumbs, Button, Chip, Divider, Skeleton, Stack, Typography } from '@mui/material'

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5000'

type Product = {
  _id: string
  name: string
  slug: string
  description?: string
  price: number
  currency: string
  stock: number
  category?: string
  brand?: string
  images: string[]
}

export default function ProductDetailsPage() {
  const { idOrSlug = '' } = useParams()
  const navigate = useNavigate()
  const [data, setData] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let abort = false
    setLoading(true)
    setError(null)
    setData(null)
    fetch(`${API_BASE}/api/products/${encodeURIComponent(idOrSlug)}`)
      .then(async (res) => {
        if (res.status === 404) throw new Error('Nie znaleziono produktu')
        if (!res.ok) throw new Error('Błąd ładowania produktu')
        return res.json() as Promise<Product>
      })
      .then((p) => { if (!abort) setData(p) })
      .catch((e) => { if (!abort) setError(e?.message || 'Błąd') })
      .finally(() => { if (!abort) setLoading(false) })
    return () => { abort = true }
  }, [idOrSlug])

  const image = data?.images?.[0] || '/placeholder.svg'

  return (
    <Box sx={{ py: 3 }}>
      <Breadcrumbs sx={{ mb: 2 }}>
        <Button onClick={() => navigate('/products')}>Produkty</Button>
        <Typography color="text.secondary">{data?.name || idOrSlug}</Typography>
      </Breadcrumbs>

      {loading ? (
        <Stack spacing={2}>
          <Skeleton variant="rectangular" height={360} />
          <Skeleton variant="text" height={40} />
          <Skeleton variant="text" height={24} />
          <Skeleton variant="text" height={24} />
          <Skeleton variant="text" height={24} />
        </Stack>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : data ? (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          <Box sx={{ flex: 1 }}>
            <Box component="img" src={image} alt={data.name} onError={(e: any) => { e.currentTarget.src = '/placeholder.svg' }} sx={{ width: '100%', borderRadius: 1 }} />
            {data.images?.length > 1 && (
              <Stack direction="row" spacing={1} sx={{ mt: 1, overflowX: 'auto' }}>
                {data.images.slice(1).map((img, i) => (
                  <Box key={i} component="img" src={img} alt={`${data.name} ${i + 2}`} onError={(e: any) => { e.currentTarget.src = '/placeholder.svg' }} sx={{ width: 96, height: 72, objectFit: 'cover', borderRadius: 1 }} />
                ))}
              </Stack>
            )}
          </Box>

          <Box sx={{ flex: 1 }}>
            <Stack spacing={1}>
              <Typography variant="h4">{data.name}</Typography>
              <Typography variant="h5" fontWeight={700}>{data.price.toFixed(2)} {data.currency}</Typography>
              <Stack direction="row" spacing={1} alignItems="center">
                {data.category && <Chip label={data.category} size="small" />}
                {data.brand && <Chip label={data.brand} size="small" />}
                <Chip color={data.stock > 0 ? 'success' : 'default'} label={data.stock > 0 ? `Dostępny (${data.stock})` : 'Niedostępny'} size="small" />
              </Stack>
            </Stack>

            <Divider sx={{ my: 2 }} />
            {data.description && <Typography whiteSpace="pre-wrap">{data.description}</Typography>}
                        <Stack direction="row" spacing={2} sx={{ mt: 2 }}>
              <Button variant="contained" size="large" disabled={data.stock <= 0}>Dodaj do koszyka</Button>
            </Stack>
          </Box>
        </Stack>
      ) : null}
    </Box>
  )
}
