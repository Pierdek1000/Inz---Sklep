import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Alert, Box, Breadcrumbs, Button, Chip, Divider, IconButton, Skeleton, Stack, Typography } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'

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
  const [idx, setIdx] = useState(0)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const [zoomed, setZoomed] = useState(false)
  const [origin, setOrigin] = useState<string>('center center')

  useEffect(() => {
    let abort = false
    setLoading(true)
    setError(null)
  setData(null)
  setIdx(0)
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

  const images = (data?.images?.length ? data.images : ['/placeholder.svg'])
  const image = images[Math.min(idx, images.length - 1)]

  const updateOriginFromMouse = (e: React.MouseEvent) => {
    if (!zoomed) return
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const x = ((e.clientX - rect.left) / rect.width) * 100
    const y = ((e.clientY - rect.top) / rect.height) * 100
    const clamp = (v: number) => Math.min(100, Math.max(0, v))
    setOrigin(`${clamp(x)}% ${clamp(y)}%`)
  }

  const updateOriginFromTouch = (e: React.TouchEvent) => {
    if (!zoomed) return
    const el = containerRef.current
    if (!el) return
    const rect = el.getBoundingClientRect()
    const t = e.touches[0]
    const x = ((t.clientX - rect.left) / rect.width) * 100
    const y = ((t.clientY - rect.top) / rect.height) * 100
    const clamp = (v: number) => Math.min(100, Math.max(0, v))
    setOrigin(`${clamp(x)}% ${clamp(y)}%`)
  }

  useEffect(() => {
    setZoomed(false)
    setOrigin('center center')
  }, [image])

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
            {/** Zoom-on-click (lupa) **/}
            <Box
              ref={containerRef}
              onMouseMove={updateOriginFromMouse}
              onTouchMove={updateOriginFromTouch}
              sx={{ position: 'relative', width: '100%', maxWidth: 860, mx: 'auto', overflow: 'hidden',
                '&:hover .image-nav': { opacity: 1, pointerEvents: 'auto' }
              }}>
              <Box
                component="img"
                src={image}
                alt={data.name}
                onError={(e: any) => { e.currentTarget.src = '/placeholder.svg' }}
                onClick={() => setZoomed((z) => !z)}
                sx={{ width: '100%', display: 'block', borderRadius: 1,
                  transform: `scale(${zoomed ? 2 : 1})`, transformOrigin: origin,
                  transition: 'transform 0.2s ease-out', willChange: 'transform',
                  cursor: zoomed ? 'zoom-out' : 'zoom-in'
                }}
              />
              {images.length > 1 && (
                <>
                  <IconButton aria-label="Poprzednie zdjęcie" size="small" onClick={() => setIdx((i) => (i - 1 + images.length) % images.length)}
                    className="image-nav"
                    sx={{ position: 'absolute', top: '50%', left: 8, transform: 'translateY(-50%)',
                      opacity: 0, pointerEvents: 'none', transition: 'opacity .2s ease',
                      bgcolor: 'rgba(0,0,0,0.45)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' } }}>
                    <ChevronLeftIcon />
                  </IconButton>
                  <IconButton aria-label="Następne zdjęcie" size="small" onClick={() => setIdx((i) => (i + 1) % images.length)}
                    className="image-nav"
                    sx={{ position: 'absolute', top: '50%', right: 8, transform: 'translateY(-50%)',
                      opacity: 0, pointerEvents: 'none', transition: 'opacity .2s ease',
                      bgcolor: 'rgba(0,0,0,0.45)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.6)' } }}>
                    <ChevronRightIcon />
                  </IconButton>
                </>
              )}
            </Box>
            {images.length > 1 && (
              <Stack direction="row" spacing={1} sx={{ mt: 1, overflowX: 'auto' }}>
                {images.map((img, i) => (
                  <Box key={i} component="img" src={img} alt={`${data.name} ${i + 1}`} onError={(e: any) => { e.currentTarget.src = '/placeholder.svg' }}
                    onClick={() => setIdx(i)}
                    sx={{ width: 84, height: 64, objectFit: 'cover', borderRadius: 1, cursor: 'pointer', outline: i === idx ? '3px solid #1976d2' : '3px solid transparent' }} />
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
