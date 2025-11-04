import { useEffect, useMemo, useState } from 'react'
import { Alert, AppBar, Box, Button, Chip, Drawer, IconButton, InputAdornment, LinearProgress, Paper, Stack, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, TextField, Toolbar, Tooltip, Typography } from '@mui/material'
import EditIcon from '@mui/icons-material/Edit'
import CloseIcon from '@mui/icons-material/Close'
import CheckIcon from '@mui/icons-material/Check'
import AddIcon from '@mui/icons-material/Add'
import SearchIcon from '@mui/icons-material/Search'

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5000'

type Cat = { _id: string; name: string; slug: string; isActive: boolean; createdAt: string; updatedAt: string }

export default function ManageCategoriesPage() {
  const [cats, setCats] = useState<Cat[]>([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [newName, setNewName] = useState('')
  const [savingId, setSavingId] = useState<string | null>(null)

  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingName, setEditingName] = useState('')
  const [query, setQuery] = useState('')
  const [addOpen, setAddOpen] = useState(false)

  const load = () => {
    setLoading(true)
    setError(null)
    fetch(`${API_BASE}/api/categories/manage`, { credentials: 'include' })
      .then(async (res) => {
        const data = await res.json().catch(() => ({}))
        if (!res.ok) throw new Error(data?.message || 'Nie udało się pobrać kategorii')
        return data as { data: Cat[] }
      })
      .then(({ data }) => setCats(data || []))
      .catch((e: any) => setError(e?.message || 'Błąd kategorii'))
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const visibleCats = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return cats
    return cats.filter(c => c.name.toLowerCase().includes(q) || c.slug.toLowerCase().includes(q))
  }, [cats, query])

  const addCategory = async () => {
    const name = newName.trim()
    if (!name) return
    setSavingId('new')
    try {
      const res = await fetch(`${API_BASE}/api/categories`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ name })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Nie udało się dodać')
      setNewName('')
      setAddOpen(false)
      load()
    } catch (e: any) {
      alert(e?.message || 'Błąd dodawania kategorii')
    } finally {
      setSavingId(null)
    }
  }

  const startRename = (c: Cat) => {
    setEditingId(c._id)
    setEditingName(c.name)
  }
  const cancelRename = () => {
    setEditingId(null)
    setEditingName('')
  }
  const saveRename = async (c: Cat) => {
    const name = editingName.trim()
    if (!name || name === c.name) { cancelRename(); return }
    setSavingId(c._id)
    try {
      const res = await fetch(`${API_BASE}/api/categories/${c._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ name })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Nie udało się zapisać')
      cancelRename()
      load()
    } catch (e: any) {
      alert(e?.message || 'Błąd zapisu kategorii')
    } finally {
      setSavingId(null)
    }
  }

  const toggleActive = async (c: Cat, next: boolean) => {
    setSavingId(c._id)
    try {
      const res = await fetch(`${API_BASE}/api/categories/${c._id}`, {
        method: 'PUT', headers: { 'Content-Type': 'application/json' }, credentials: 'include', body: JSON.stringify({ isActive: next })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) throw new Error(data?.message || 'Nie udało się zapisać')
      load()
    } catch (e: any) {
      alert(e?.message || 'Błąd zmiany statusu')
    } finally {
      setSavingId(null)
    }
  }

  // Usuwanie wyłączone w UI — używamy tylko aktywacji/dezaktywacji

  return (
    <Box sx={{ py: 3 }}>
      <Typography variant="h5" sx={{ mb: 2 }}>Zarządzanie kategoriami</Typography>

      {/* Szukanie + dodawanie */}
      <Paper sx={{ p: 2, mb: 2 }}>
        <Stack
          direction={{ xs: 'column', md: 'row' }}
          spacing={2}
          alignItems={{ xs: 'stretch', md: 'center' }}
          justifyContent="space-between"
        >
          <TextField
            label="Szukaj"
            placeholder="Nazwa lub slug"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
            sx={{ maxWidth: 400, flex: 1 }}
          />
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => setAddOpen(true)} sx={{ alignSelf: { xs: 'stretch', md: 'auto' } }}>
            Dodaj kategorię
          </Button>
        </Stack>
      </Paper>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      {loading && <LinearProgress sx={{ mb: 1 }} />}

      <Paper>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Nazwa</TableCell>
                <TableCell>Slug</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Akcje</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {visibleCats.map((c) => (
                <TableRow key={c._id} hover>
                  <TableCell sx={{ width: 320 }}>
                    {editingId === c._id ? (
                      <Stack direction="row" spacing={1} alignItems="center">
                        <TextField size="small" value={editingName} onChange={(e) => setEditingName(e.target.value)} />
                        <IconButton size="small" onClick={() => saveRename(c)} disabled={savingId === c._id}><CheckIcon fontSize="small" /></IconButton>
                        <IconButton size="small" onClick={cancelRename}><CloseIcon fontSize="small" /></IconButton>
                      </Stack>
                    ) : (
                      <Typography variant="body2" fontWeight={600}>{c.name}</Typography>
                    )}
                  </TableCell>
                  <TableCell>{c.slug}</TableCell>
                  <TableCell>
                    {c.isActive ? (
                      <Chip size="small" label="Aktywna" color="success" variant="outlined" />
                    ) : (
                      <Chip size="small" label="Nieaktywna" color="default" variant="outlined" />
                    )}
                  </TableCell>
                  <TableCell align="right">
                    {editingId !== c._id && (
                      <Tooltip title="Zmień nazwę">
                        <IconButton size="small" onClick={() => startRename(c)}><EditIcon fontSize="small" /></IconButton>
                      </Tooltip>
                    )}
                    {c.isActive ? (
                      <Button size="small" onClick={() => toggleActive(c, false)} disabled={savingId === c._id}>Dezaktywuj</Button>
                    ) : (
                      <Button size="small" onClick={() => toggleActive(c, true)} disabled={savingId === c._id}>Aktywuj</Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {visibleCats.length === 0 && !loading && (
                <TableRow>
                  <TableCell colSpan={4}>
                    <Typography align="center" color="text.secondary" sx={{ py: 2 }}>Brak kategorii</Typography>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Drawer: Dodawanie kategorii */}
      <Drawer anchor="right" open={addOpen} onClose={() => setAddOpen(false)} PaperProps={{ sx: { width: { xs: '100%', sm: 420 } } }}>
        <AppBar position="relative" color="inherit" elevation={0} sx={{ borderBottom: 1, borderColor: 'divider' }}>
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1 }}>Nowa kategoria</Typography>
            <IconButton edge="end" onClick={() => setAddOpen(false)} aria-label="close"><CloseIcon /></IconButton>
          </Toolbar>
        </AppBar>
        <Box sx={{ p: 2 }}>
          <Stack spacing={2}>
            <TextField
              autoFocus
              label="Nazwa kategorii"
              placeholder="np. Laptopy, Konsole, Akcesoria"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); addCategory() } }}
              disabled={savingId === 'new'}
            />
            <Stack direction="row" spacing={1}>
              <Button variant="contained" onClick={addCategory} disabled={savingId === 'new'}>Zapisz</Button>
              <Button variant="text" onClick={() => setAddOpen(false)}>Anuluj</Button>
            </Stack>
            <Typography variant="caption" color="text.secondary">Tylko aktywne kategorie są widoczne w formularzach produktów.</Typography>
          </Stack>
        </Box>
      </Drawer>
    </Box>
  )
}
