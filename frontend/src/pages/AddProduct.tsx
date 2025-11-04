import { useEffect, useState } from 'react'
import { Alert, Box, Button, Divider, IconButton, ImageList, ImageListItem, Link, Paper, Stack, TextField, Typography, Drawer } from '@mui/material'
import Autocomplete, { createFilterOptions } from '@mui/material/Autocomplete'
import DeleteIcon from '@mui/icons-material/Delete'
import AddIcon from '@mui/icons-material/Add'
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
  const [categories, setCategories] = useState<string[]>([])
  const [catLoading, setCatLoading] = useState(true)
  const [catError, setCatError] = useState<string | null>(null)
  const [newCat, setNewCat] = useState('')
  const [catDrawerOpen, setCatDrawerOpen] = useState(false)

  type CatOption = { label: string; inputValue?: string; create?: boolean }
  const filter = createFilterOptions<CatOption>()

  const isAllowed = !!user && (user.role === 'admin' || user.role === 'seller')

  useEffect(() => {
    if (!isAllowed) navigate('/products')
  }, [isAllowed, navigate])

  // Load categories
  useEffect(() => {
    let abort = false
    setCatLoading(true)
    setCatError(null)
    fetch(`${API_BASE}/api/categories`)
      .then(async (res) => {
        if (!res.ok) throw new Error('Nie udało się pobrać kategorii')
        return res.json() as Promise<{ categories: string[] }>
      })
      .then((data) => { if (!abort) setCategories(data.categories || []) })
      .catch((e) => { if (!abort) setCatError(e?.message || 'Błąd kategorii') })
      .finally(() => { if (!abort) setCatLoading(false) })
    return () => { abort = true }
  }, [])

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccess(null)
    if (!name || price === '' || Number.isNaN(Number(price))) {
      setError('Wprowadź nazwę i prawidłową cenę')
      return
    }
    if (!category.trim()) {
      setError('Wybierz istniejącą kategorię')
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

  const createCategory = async () => {
    setCatError(null)
    const trimmed = newCat.trim()
    if (!trimmed) { setCatError('Podaj nazwę kategorii'); return }
    try {
      const res = await fetch(`${API_BASE}/api/categories`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ name: trimmed })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) { setCatError(data?.message || 'Nie udało się dodać kategorii'); return }
      // Refresh categories and select the new one
      setNewCat('')
      setCategories((prev) => Array.from(new Set([...prev, data.name || trimmed])).sort())
      setCategory(data.name || trimmed)
      setCatDrawerOpen(false)
    } catch {
      setCatError('Błąd połączenia przy dodawaniu kategorii')
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
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'flex-end' }}>
            <Box sx={{ flex: 1 }}>
              <Autocomplete
                freeSolo
                disableClearable
                selectOnFocus
                clearOnBlur
                handleHomeEndKeys
                loading={catLoading}
                value={category}
                onInputChange={(_e, val) => setCategory(val)}
                onChange={(_e, newVal) => {
                  if (typeof newVal === 'string') {
                    setCategory(newVal)
                    return
                  }
                  const opt = newVal as CatOption | null
                  if (!opt) { setCategory(''); return }
                  if (opt.create && opt.inputValue) {
                    setNewCat(opt.inputValue)
                    setCatError(null)
                    setCatDrawerOpen(true)
                    return
                  }
                  setCategory(opt.label)
                }}
                options={categories.map<CatOption>((c) => ({ label: c }))}
                filterOptions={(opts, params) => {
                  const filtered = filter(opts, params)
                  const { inputValue } = params
                  const exists = categories.some((c) => c.toLowerCase() === inputValue.trim().toLowerCase())
                  if (inputValue && !exists) {
                    filtered.push({ label: `Dodaj "${inputValue}"`, inputValue, create: true })
                  }
                  return filtered
                }}
                getOptionLabel={(option) => {
                  if (typeof option === 'string') return option
                  const opt = option as CatOption
                  if (opt.inputValue) return opt.inputValue
                  return opt.label
                }}
                renderOption={(props, option) => {
                  const opt = option as CatOption
                  return (
                    <li {...props}>
                      {opt.create ? (
                        <>
                          <AddIcon style={{ marginRight: 8 }} /> {opt.label}
                        </>
                      ) : (
                        opt.label
                      )}
                    </li>
                  )
                }}
                renderInput={(params) => (
                  <TextField
                    {...params}
                    label="Kategoria"
                    required
                    error={!!catError}
                  />
                )}
              />
            </Box>
            <Button
              variant="outlined"
              startIcon={<AddIcon />}
              onClick={() => setCatDrawerOpen(true)}
              disabled={catLoading || !isAllowed}
              sx={{ whiteSpace: 'nowrap', alignSelf: { xs: 'stretch', sm: 'flex-end' }, height: { xs: 40, sm: 56 } }}
            >
              Dodaj kategorię
            </Button>
          </Stack>
          <Box sx={{ mt: 0.5 }}>
            {catError ? (
              <Typography variant="caption" color="error">{catError}</Typography>
            ) : (
              <Typography variant="caption" color="text.secondary">
                {catLoading ? 'Ładowanie kategorii…' : (categories.length ? 'Wybierz lub wpisz kategorię' : (
                  <>
                    Brak kategorii — wpisz nazwę i wybierz opcję dodania lub{' '}
                    <Link component="button" type="button" onClick={() => setCatDrawerOpen(true)} sx={{ fontSize: 'inherit' }}>
                      dodaj nową
                    </Link>
                  </>
                ))}
              </Typography>
            )}
          </Box>
          <TextField label="Marka" value={brand} onChange={(e) => setBrand(e.target.value)} fullWidth />
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

      {/* Drawer: Dodawanie kategorii */}
      <Drawer
        anchor="right"
        open={catDrawerOpen}
        onClose={() => setCatDrawerOpen(false)}
        PaperProps={{ sx: { width: { xs: '100%', sm: 380 }, p: 2 } }}
      >
        <Stack spacing={2} sx={{ height: '100%' }}>
          <Typography variant="h6">Nowa kategoria</Typography>
          <Typography variant="body2" color="text.secondary">
            Utwórz kategorię, aby szybko przypisać ją do produktu.
          </Typography>
          <Divider />
          {!!catError && <Alert severity="error">{catError}</Alert>}
          <TextField
            autoFocus
            label="Nazwa kategorii"
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); createCategory() } }}
            disabled={catLoading}
          />
          <Stack direction="row" spacing={1}>
            <Button variant="contained" onClick={createCategory} disabled={catLoading || !isAllowed}>Zapisz</Button>
            <Button variant="text" onClick={() => setCatDrawerOpen(false)}>Anuluj</Button>
          </Stack>
          <Box sx={{ flexGrow: 1 }} />
          <Typography variant="caption" color="text.secondary">
            Tylko użytkownicy z rolą „admin” lub „seller” mogą dodawać kategorie.
          </Typography>
        </Stack>
      </Drawer>
    </Box>
  )
}
