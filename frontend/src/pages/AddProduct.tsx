import { useEffect, useState } from 'react'
import { Alert, Box, Button, IconButton, ImageList, ImageListItem, Paper, Stack, TextField, Typography } from '@mui/material'
import DeleteIcon from '@mui/icons-material/Delete'
import { useAuth } from '../state/AuthContext'
import { useNavigate } from 'react-router-dom'

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5000'

export default function AddProductPage() {
  const { user } = useAuth()
  const navigate = useNavigate()

  const [name, setName] = useState('')
  const [price, setPrice] = useState<number | ''>('')
  const [stock, setStock] = useState<number | ''>('')
  const [category, setCategory] = useState('')
  const [brand, setBrand] = useState('')
  const [images, setImages] = useState('')
  const [files, setFiles] = useState<File[]>([])
  const [previews, setPreviews] = useState<string[]>([])
  const [description, setDescription] = useState('')
  const [currency, setCurrency] = useState('PLN')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const isAllowed = !!user && (user.role === 'admin' || user.role === 'seller')

  useEffect(() => {
    if (!isAllowed) navigate('/products')
  }, [isAllowed, navigate])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!name || price === '' || Number.isNaN(Number(price))) {
      setError('Wprowadź nazwę i prawidłową cenę')
      return
    }
    setLoading(true)
    try {
      // 1) Upload selected files (if any) to get URLs
      let uploadedUrls: string[] = []
      if (files.length > 0) {
        const form = new FormData()
        files.forEach((f) => form.append('images', f))
        const upRes = await fetch(`${API_BASE}/api/products/upload`, {
          method: 'POST',
          body: form,
          credentials: 'include'
        })
        const upData = await upRes.json().catch(() => ({}))
        if (!upRes.ok || !Array.isArray(upData?.urls)) {
          throw new Error(upData?.message || 'Nie udało się przesłać obrazów')
        }
        uploadedUrls = upData.urls
      }

      // 2) Merge uploaded URLs with any manual URLs from the text field
      const manualUrls = images
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean)
      const allUrls = [...uploadedUrls, ...manualUrls]

      const res = await fetch(`${API_BASE}/api/products`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          name,
          price: Number(price),
          stock: stock === '' ? 0 : Number(stock),
          category: category || undefined,
          brand: brand || undefined,
          images: allUrls,
          description: description || undefined,
          currency
        })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.message || 'Nie udało się utworzyć produktu')
      } else {
        setSuccess('Produkt został dodany')
        // Wyczyszczenie formularza
        setName('')
        setPrice('')
        setStock('')
        setCategory('')
        setBrand('')
        setImages('')
        setDescription('')
        setFiles([])
        // revoke previews
        previews.forEach((p) => URL.revokeObjectURL(p))
        setPreviews([])
      }
    } catch {
      setError('Błąd połączenia z API')
    } finally {
      setLoading(false)
    }
  }

  const onSelectFiles = (e: React.ChangeEvent<HTMLInputElement>) => {
    const list = e.target.files
    if (!list) return
    const newFiles = Array.from(list)
    // Limit to 8 like backend
    const merged = [...files, ...newFiles].slice(0, 8)
    // Update previews
    previews.forEach((p) => URL.revokeObjectURL(p))
    const nextPreviews = merged.map((f) => URL.createObjectURL(f))
    setFiles(merged)
    setPreviews(nextPreviews)
  }

  const removeFileAt = (index: number) => {
    const nextFiles = files.slice()
    const nextPreviews = previews.slice()
    const [removed] = nextPreviews.splice(index, 1)
    if (removed) URL.revokeObjectURL(removed)
    nextFiles.splice(index, 1)
    setFiles(nextFiles)
    setPreviews(nextPreviews)
  }

  return (
    <Box sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Dodaj produkt</Typography>

      {!isAllowed && <Alert severity="warning">Brak uprawnień</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {success && <Alert severity="success" sx={{ mb: 2 }}>{success}</Alert>}

      <Paper component="form" onSubmit={onSubmit} sx={{ p: 3, maxWidth: 720 }}>
        <Stack spacing={2}>
          <TextField label="Nazwa" value={name} onChange={(e) => setName(e.target.value)} required />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Cena" type="number" inputProps={{ step: '0.01' }}
              value={price} onChange={(e) => setPrice(e.target.value === '' ? '' : Number(e.target.value))} required />
            <TextField label="Waluta" value={currency} onChange={(e) => setCurrency(e.target.value)} />
            <TextField label="Stan" type="number" inputProps={{ step: '1' }}
              value={stock} onChange={(e) => setStock(e.target.value === '' ? '' : Number(e.target.value))} />
          </Stack>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <TextField label="Kategoria" value={category} onChange={(e) => setCategory(e.target.value)} fullWidth />
            <TextField label="Marka" value={brand} onChange={(e) => setBrand(e.target.value)} fullWidth />
          </Stack>
          <TextField label="Obrazy (URL, oddzielone przecinkami)" value={images} onChange={(e) => setImages(e.target.value)} />
          <Stack spacing={1}>
            <Stack direction="row" spacing={2} alignItems="center">
              <Button variant="outlined" component="label" disabled={loading}>
                Wybierz pliki
                <input hidden accept="image/*" multiple type="file" onChange={onSelectFiles} />
              </Button>
              <Typography variant="body2" color="text.secondary">
                Możesz dodać do 8 obrazów. Obsługiwane: JPG, PNG, WEBP.
              </Typography>
            </Stack>
            {previews.length > 0 && (
              <ImageList cols={4} gap={8} sx={{ m: 0 }}>
                {previews.map((src, i) => (
                  <ImageListItem key={i} sx={{ position: 'relative' }}>
                    <img src={src} alt={`podgląd ${i + 1}`} style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: 4 }} />
                    <IconButton size="small" onClick={() => removeFileAt(i)}
                      sx={{ position: 'absolute', top: 4, right: 4, bgcolor: 'rgba(0,0,0,0.5)', color: '#fff', '&:hover': { bgcolor: 'rgba(0,0,0,0.7)' } }}>
                      <DeleteIcon fontSize="small" />
                    </IconButton>
                  </ImageListItem>
                ))}
              </ImageList>
            )}
          </Stack>
          <TextField label="Opis" value={description} onChange={(e) => setDescription(e.target.value)} multiline minRows={3} />
          <Stack direction="row" spacing={2}>
            <Button type="submit" variant="contained" disabled={loading || !isAllowed}>Dodaj</Button>
            <Button variant="text" onClick={() => navigate('/products')}>Anuluj</Button>
          </Stack>
        </Stack>
      </Paper>
    </Box>
  )
}
