import { useEffect, useRef, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Alert, Box, Breadcrumbs, Button, Chip, Divider, IconButton, Skeleton, Stack, Typography, Rating } from '@mui/material'
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft'
import ChevronRightIcon from '@mui/icons-material/ChevronRight'
import AddIcon from '@mui/icons-material/Add'
import RemoveIcon from '@mui/icons-material/Remove'
import { useAuth } from '../state/AuthContext'

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
  rating?: number
  numReviews?: number
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
  const [qty, setQty] = useState<number>(1)
  const { user } = useAuth()
  const [myRating, setMyRating] = useState<number | null>(null)
  const [ratingSaving, setRatingSaving] = useState(false)
  const [ratingError, setRatingError] = useState<string | null>(null)

  useEffect(() => {
    let abort = false
    setLoading(true)
    setError(null)
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

  // pobierz własną ocenę po załadowaniu produktu i gdy użytkownik jest zalogowany
  useEffect(() => {
    let abort = false
    if (!data?._id) return
    if (!user) { setMyRating(null); return }
    fetch(`${API_BASE}/api/products/${encodeURIComponent(data._id)}/my-rating`, { credentials: 'include' })
      .then(r => r.json().catch(() => ({})))
      .then((r: any) => { if (!abort) setMyRating(r?.value ?? null) })
      .catch(() => {})
    return () => { abort = true }
  }, [data?._id, user])

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
    setQty(1)
  }, [image])

  const handleRate = async (_: any, value: number | null) => {
    if (!data || !user) return
    if (!value) return
    setRatingSaving(true)
    setRatingError(null)
    try {
      const res = await fetch(`${API_BASE}/api/products/${encodeURIComponent(data._id)}/ratings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ value })
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(body?.message || 'Nie udało się zapisać oceny')
      setMyRating(value)
      setData(d => d ? { ...d, rating: body.rating, numReviews: body.numReviews } : d)
    } catch (e: any) {
      setRatingError(e?.message || 'Błąd')
    } finally {
      setRatingSaving(false)
    }
  }

  return (
    <Box sx={{ py: 3 }}>
      {/* Nawigacja okruszkowa (breadcrumbs) */}
      <Breadcrumbs sx={{ mb: 2 }}>
        <Button onClick={() => navigate('/products')}>Produkty</Button>
        <Typography color="text.secondary">{data?.name || idOrSlug}</Typography>
      </Breadcrumbs>

      {loading ? (
        <Stack spacing={2}>
            {/* Szczegóły produktu */}
          <Skeleton variant="rectangular" height={360} />
              {/* Nazwa produktu */}
          <Skeleton variant="text" height={40} />
              {/* Cena */}
          <Skeleton variant="text" height={24} />
              {/* Etykiety: kategoria, marka, dostępność */}
          <Skeleton variant="text" height={24} />
          <Skeleton variant="text" height={24} />
        </Stack>
      ) : error ? (
        <Alert severity="error">{error}</Alert>
      ) : data ? (
        <Stack direction={{ xs: 'column', md: 'row' }} spacing={3}>
          <Box sx={{ flex: 1  }}>
            {/** Zoom-on-click (lupa) **/}
            {/* Kontener zdjęcia produktu (powiększanie po kliknięciu) */}
            <Box
              ref={containerRef}
              onMouseMove={updateOriginFromMouse}
              onTouchMove={updateOriginFromTouch}
              sx={{ position: 'relative', width: '100%', maxWidth: 860, mx: 'auto', overflow: 'hidden',
                height: { xs: 320, sm: 620, md: 800 },
                bgcolor: 'background.default',
                '&:hover .image-nav': { opacity: 1, pointerEvents: 'auto' }
              }}>
              {/* Główne zdjęcie produktu (skalowane, bez przycinania) */}
              <Box
                component="img"
                src={image}
                alt={data.name}
                onError={(e: any) => { e.currentTarget.src = '/placeholder.svg' }}
                onClick={() => setZoomed((z) => !z)}
                sx={{ width: '100%', height: '100%', display: 'block', borderRadius: 1,
                  objectFit: 'contain',
                  transform: `scale(${zoomed ? 2 : 1})`, transformOrigin: origin,
                  transition: 'transform 0.2s ease-out', willChange: 'transform',
                  cursor: zoomed ? 'zoom-out' : 'zoom-in'
                }}
              />
              {images.length > 1 && (
                <>
                  {/* Przyciski nawigacji między zdjęciami */}
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
            </Box >
            {images.length > 1 && (
              <Stack direction="row" spacing={1} justifyContent="center" sx={{ mt: 1, overflowX: 'auto', flexWrap: 'nowrap' }}>
                {/* Miniatury zdjęć */}
                {images.map((img, i) => (
                  <Box key={i} component="img" src={img} alt={`${data.name} ${i + 1}`} onError={(e: any) => { e.currentTarget.src = '/placeholder.svg' }}
                    onClick={() => setIdx(i)}
                    sx={{ width: 84, height: 64, objectFit: 'contain', backgroundColor: 'background.default', borderRadius: 1, cursor: 'pointer' }} />
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
              {/* Oceny */}
              <Stack direction="row" spacing={1} alignItems="center">
                <Rating
                  name="product-rating"
                  value={Number(data.rating) || 0}
                  precision={0.5}
                  readOnly
                  size="small"
                />
                <Typography variant="caption" color="text.secondary">{data.rating?.toFixed(1) ?? '0.0'} ({data.numReviews ?? 0} opinii)</Typography>
              </Stack>
              {user ? (
                <Stack spacing={0.5}>
                  <Typography variant="body2" fontWeight={600}>Twoja ocena:</Typography>
                  <Rating
                    name="my-rating"
                    value={myRating ?? 0}
                    onChange={handleRate}
                    disabled={ratingSaving}
                  />
                  {ratingError && <Typography variant="caption" color="error">{ratingError}</Typography>}
                </Stack>
              ) : (
                <Typography variant="caption" color="text.secondary">Zaloguj się aby ocenić produkt</Typography>
              )}
            </Stack>


            <Divider sx={{ my: 2 }} />
            {/* Opis produktu */}
            {data.description && (
              <Typography
                whiteSpace="pre-wrap"
                sx={{
                  maxWidth: { xs: '100%', md: '75ch' },
                  lineHeight: 1.6
                }}
              >
                {data.description}
              </Typography>
            )}

            <Divider sx={{ my: 2 }} />
            {/* Akcje: licznik ilości + przycisk dodania do koszyka (bez funkcjonalności) */}
            <Stack direction="row" spacing={2} alignItems="center" sx={{ mt: 2 }}>
            <Button
                variant="contained"
                size="large"
                disabled={data.stock <= 0}
                disableElevation
                sx={{
                  backgroundColor: '#818181',
                  color: '#ffffff',
                  textTransform: 'none',
                  fontFamily: `'Montserrat','Segoe UI', Tahoma, Geneva, Verdana, sans-serif`,
                  fontSize: 'large',
                  px: { xs: 3, sm: 5 },
                  minWidth: { xs: 180, sm: 440 },
                  flexShrink: 0,
                  '&:hover': { backgroundColor: '#000000' }
                }}
              >
                Dodaj do koszyka
              </Button>

              {/* Licznik ilości */}
              <Stack direction="row" spacing={1} alignItems="center">
                <IconButton aria-label="Zmniejsz ilość" size="small"
                  onClick={() => setQty((q) => Math.max(1, q - 1))}
                  disabled={qty <= 1 || data.stock <= 0}>
                  <RemoveIcon />
                </IconButton>
                <Box sx={{ minWidth: 40, textAlign: 'center', fontWeight: 700 }}>{qty}</Box>
                <IconButton aria-label="Zwiększ ilość" size="small"
                  onClick={() => setQty((q) => Math.min(data.stock, q + 1))}
                  disabled={qty >= data.stock || data.stock <= 0}>
                  <AddIcon />
                </IconButton>
              </Stack>

            </Stack>
          </Box>
        
        </Stack>
      ) : null}
    </Box>
  )
}
