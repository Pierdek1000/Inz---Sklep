
import './styles/App.css'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import LoginPage from './pages/Login'
import HomePage from './pages/Home'
import ProductsPage from './pages/Products'
import AddProductPage from './pages/AddProduct'
import ManageProductsPage from './pages/ManageProducts'
import ManageCategoriesPage from './pages/ManageCategories'
import ProductDetailsPage from './pages/ProductDetails'
import AccountPage from './pages/Account'
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
            <>
              <Button color="inherit" component={Link} to="/products/new">Dodaj produkt</Button>
              <Button color="inherit" component={Link} to="/products/manage">Zarządzaj</Button>
              <Button color="inherit" component={Link} to="/categories/manage">Kategorie</Button>
            </>
          )}
          {user && <Button color="inherit" component={Link} to="/account">Konto</Button>}
          {!user && <Button color="inherit" component={Link} to="/login">Logowanie</Button>}
        </Toolbar>
      </AppBar>
      <Routes>
        <Route path="/" element={<Container maxWidth="lg"><HomePage /></Container>} />
  <Route path="/login" element={<Container maxWidth="sm"><LoginPage /></Container>} />
  <Route path="/account" element={<Container maxWidth="md"><AccountPage /></Container>} />
        {/* Pełna szerokość dla listy produktów */}
        <Route path="/products" element={<Box sx={{ px: { xs: 2, sm: 3 } }}><ProductsPage /></Box>} />
  {/* Formularz dodawania w węższym układzie */}
        <Route path="/products/new" element={<Container maxWidth="md"><AddProductPage /></Container>} />
  {/* Panel zarządzania produktami */}
  <Route path="/products/manage" element={<Container maxWidth="lg"><ManageProductsPage /></Container>} />
  {/* Panel zarządzania kategoriami */}
  <Route path="/categories/manage" element={<Container maxWidth="lg"><ManageCategoriesPage /></Container>} />
        {/* Szczegóły produktu mogą iść szerzej, ale z delikatnym paddingiem */}
        <Route path="/products/:idOrSlug" element={<Box sx={{ px: { xs: 2, sm: 3 } }}><ProductDetailsPage /></Box>} />
      </Routes>
    </Box>
  )
}
