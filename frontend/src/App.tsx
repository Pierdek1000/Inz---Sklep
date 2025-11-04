
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
import { AppBar, Box, Button, Container, Toolbar, Typography, Menu, MenuItem, ListItemIcon, ListItemText } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import { useState } from 'react'
import { useAuth } from './state/AuthContext'
import { useEffect } from 'react'

export default function App() {
  const { user } = useAuth()
  const location = useLocation()
  const [anchorElAdmin, setAnchorElAdmin] = useState<null | HTMLElement>(null)
  const adminOpen = Boolean(anchorElAdmin)
  const openAdminMenu = (e: React.MouseEvent<HTMLButtonElement>) => setAnchorElAdmin(e.currentTarget)
  const closeAdminMenu = () => setAnchorElAdmin(null)

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
              <Button
                variant="outlined"
                color="inherit"
                className="admin-panel-btn"
                id="admin-menu-button"
                aria-controls={adminOpen ? 'admin-menu' : undefined}
                aria-haspopup="true"
                aria-expanded={adminOpen ? 'true' : undefined}
                onClick={openAdminMenu}
                endIcon={<ExpandMoreIcon />}
                sx={{
                  borderRadius: 9999,
                  borderColor: 'rgba(255,255,255,0.5)',
                  color: '#ffffff',
                  textTransform: 'none',
                  '&:hover': {
                    borderColor: '#ffffff',
                    backgroundColor: 'rgba(255,255,255,0.08)'
                  }
                }}
              >
                Panel Sprzedawcy
              </Button>
              <Menu
                id="admin-menu"
                anchorEl={anchorElAdmin}
                open={adminOpen}
                onClose={closeAdminMenu}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                PaperProps={{
                  sx: {
                    mt: 1.5,
                    borderRadius: 2,
                    minWidth: 220,
                    overflow: 'visible',
                    filter: 'drop-shadow(0px 6px 12px rgba(0,0,0,0.15))'
                  }
                }}
              >
                <MenuItem component={Link} to="/products/new" onClick={closeAdminMenu}>
                  <ListItemIcon>
                    <AddCircleOutlineIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Dodaj produkt" />
                </MenuItem>
                <MenuItem component={Link} to="/products/manage" onClick={closeAdminMenu}>
                  <ListItemIcon>
                    <Inventory2OutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Zarządzaj produktami" />
                </MenuItem>
                <MenuItem component={Link} to="/categories/manage" onClick={closeAdminMenu}>
                  <ListItemIcon>
                    <CategoryOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Zarządzaj kategoriami" />
                </MenuItem>
              </Menu>
            </>
          )}
          {user && (
            <Button
              color="inherit"
              component={Link}
              to="/account"
              startIcon={<AccountCircleOutlinedIcon />}
              sx={{ textTransform: 'none', color: '#ffffff' }}
              aria-label="Konto"
            >
              {user.username}
            </Button>
          )}
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
