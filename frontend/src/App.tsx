
import './styles/App.css'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import LoginPage from './pages/Login'
import HomePage from './pages/Home'
import ProductsPage from './pages/Products'
import AddProductPage from './pages/AddProduct'
import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material'
import { useAuth } from './state/AuthContext'
import { useEffect } from 'react'

export default function App() {
  const { user } = useAuth()
  const location = useLocation()

  useEffect(() => {
    const body = document.body
    const toRemove: string[] = []
    body.classList.forEach((cls) => { if (cls.startsWith('route-')) toRemove.push(cls) })
    toRemove.forEach((cls) => body.classList.remove(cls))

    const segment = location.pathname === '/'
      ? 'home'
      : location.pathname.slice(1).replace(/\/+/, '-').replace(/[^a-z0-9\-]/gi, '') || 'page'
    body.classList.add(`route-${segment}`)
  }, [location.pathname])
  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>TEST</Typography>
          <Button color="inherit" component={Link} to="/">Strona główna</Button>
          <Button color="inherit" component={Link} to="/products">Produkty</Button>
          {user && (user.role === 'admin' || user.role === 'seller') && (
            <Button color="inherit" component={Link} to="/products/new">Dodaj produkt</Button>
          )}
          {!user && <Button color="inherit" component={Link} to="/login">Logowanie</Button>}
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/products" element={<ProductsPage />} />
          <Route path="/products/new" element={<AddProductPage />} />
        </Routes>
      </Container>
    </Box>
  )
}
