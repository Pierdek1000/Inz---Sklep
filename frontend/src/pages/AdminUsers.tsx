import { useEffect, useRef, useState } from 'react'
import { Alert, Box, Chip, FormControl, InputLabel, MenuItem, Select, Snackbar, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Typography, TextField, IconButton, InputAdornment } from '@mui/material'
import SearchIcon from '@mui/icons-material/Search'
import CloseIcon from '@mui/icons-material/Close'
import { useAuth } from '../state/AuthContext'
import { useNavigate } from 'react-router-dom'

type Role = 'user' | 'seller' | 'admin'

type AdminUser = {
  id: string
  username: string
  email: string
  role: Role
  createdAt?: string
}

const API_BASE = (import.meta as any).env?.VITE_API_URL ?? 'http://localhost:5000'

export default function AdminUsersPage() {
  const { user, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const [rows, setRows] = useState<AdminUser[]>([])
  const [listLoading, setListLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [snack, setSnack] = useState<{ open: boolean; message: string; severity: 'success' | 'error' }>({ open: false, message: '', severity: 'success' })
  const [searchEmail, setSearchEmail] = useState('')
  const debounceRef = useRef<number | undefined>(undefined)

  const isAdmin = user?.role === 'admin'

  const roleLabel = (r: Role) => {
    switch (r) {
      case 'admin': return 'Administrator'
      case 'seller': return 'Sprzedawca'
      default: return 'Użytkownik'
    }
  }

  const roleColor = (r: Role) => (r === 'admin' ? 'error' : r === 'seller' ? 'warning' : 'default') as any

  const fetchUsers = async (emailFilter?: string) => {
    setListLoading(true)
    setError(null)
    try {
      const url = new URL(`${API_BASE}/api/users`)
      if (emailFilter) url.searchParams.set('email', emailFilter)
      const res = await fetch(url.toString(), { credentials: 'include' })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        setError(data?.message ?? 'Nie udało się pobrać użytkowników')
      } else {
        setRows(Array.isArray(data?.users) ? data.users : [])
      }
    } catch {
      setError('Błąd połączenia z serwerem')
    } finally {
      setListLoading(false)
    }
  }

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchUsers()
    }
  }, [user?.role])

  useEffect(() => {
    if (user?.role !== 'admin') return
    // debounce wyszukiwania
    if (debounceRef.current) window.clearTimeout(debounceRef.current)
    debounceRef.current = window.setTimeout(() => {
      fetchUsers(searchEmail.trim() || undefined)
    }, 400)
    return () => { if (debounceRef.current) window.clearTimeout(debounceRef.current) }
  }, [searchEmail, user?.role])

  // Brak uprawnień: natychmiastowe przekierowanie bez komunikatu
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      navigate('/', { replace: true })
    }
  }, [authLoading, user, navigate])

  const handleChangeRole = async (id: string, newRole: Role) => {
    const prev = rows.find(r => r.id === id)?.role
    if (!prev || prev === newRole) return

    setSaving(id)
    setRows(rs => rs.map(r => r.id === id ? { ...r, role: newRole } : r))
    try {
      const res = await fetch(`${API_BASE}/api/users/${id}/role`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ role: newRole })
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok) {
        // rollback
        setRows(rs => rs.map(r => r.id === id ? { ...r, role: prev } : r))
        setSnack({ open: true, message: data?.message ?? 'Nie udało się zmienić roli', severity: 'error' })
      } else {
        setSnack({ open: true, message: `Zmieniono rolę użytkownika na: ${roleLabel(newRole)}`, severity: 'success' })
      }
    } catch {
      setRows(rs => rs.map(r => r.id === id ? { ...r, role: prev! } : r))
      setSnack({ open: true, message: 'Błąd połączenia z serwerem', severity: 'error' })
    } finally {
      setSaving(null)
    }
  }

  if (!authLoading && !isAdmin) return null

  return (
    <Box sx={{ py: 3 }}>
  <Typography variant="h4" sx={{ mb: 2 }}>Zarządzanie rolami</Typography>
  <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', justifyContent: 'center' }}>
        <TextField
          label="Szukaj po emailu"
          size="small"
          value={searchEmail}
          onChange={e => setSearchEmail(e.target.value)}
          sx={{ minWidth: { xs: 280, sm: 360 }, width: { xs: '90%', sm: '70%', md: '50%' }, maxWidth: 720 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
            endAdornment: searchEmail ? (
              <InputAdornment position="end">
                <IconButton size="small" aria-label="Wyczyść" onClick={() => setSearchEmail('')}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : undefined
          }}
        />
      </Box>
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}
      <TableContainer>
        <Table size="small">
          <TableHead>
            <TableRow>
              <TableCell>Nazwa</TableCell>
              <TableCell>Email</TableCell>
              <TableCell>Rola</TableCell>
              <TableCell align="right">Akcje</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {listLoading ? (
              <TableRow><TableCell colSpan={4}>Ładowanie…</TableCell></TableRow>
            ) : rows.length === 0 ? (
              <TableRow><TableCell colSpan={4}>Brak użytkowników</TableCell></TableRow>
            ) : rows.map(u => (
              <TableRow key={u.id} hover>
                <TableCell>{u.username}</TableCell>
                <TableCell>{u.email}</TableCell>
                <TableCell>
                  <FormControl size="small" sx={{ minWidth: 160 }}>
                    <InputLabel id={`role-${u.id}`}>Rola</InputLabel>
                    <Select
                      labelId={`role-${u.id}`}
                      label="Rola"
                      value={u.role}
                      onChange={(e) => handleChangeRole(u.id, e.target.value as Role)}
                      disabled={saving === u.id}
                    >
                      <MenuItem value="user">Użytkownik</MenuItem>
                      <MenuItem value="seller">Sprzedawca</MenuItem>
                      <MenuItem value="admin">Administrator</MenuItem>
                    </Select>
                  </FormControl>
                </TableCell>
                <TableCell align="right">
                  <Chip size="small" color={roleColor(u.role)} label={roleLabel(u.role)} />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>

      <Snackbar
        open={snack.open}
        autoHideDuration={2500}
        onClose={() => setSnack(s => ({ ...s, open: false }))}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
      >
        <Alert onClose={() => setSnack(s => ({ ...s, open: false }))} severity={snack.severity} variant="filled" sx={{ width: '100%' }}>
          {snack.message}
        </Alert>
      </Snackbar>
    </Box>
  )
}
