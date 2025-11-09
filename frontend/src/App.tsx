
import './styles/App.css'
import { Routes, Route, Link, useLocation } from 'react-router-dom'
import LoginPage from './pages/Login'
import ForgotPasswordPage from './pages/ForgotPassword'
import ResetPasswordPage from './pages/ResetPassword'
import HomePage from './pages/Home'
import ProductsPage from './pages/Products'
import CartPage from './pages/Cart'
import AddProductPage from './pages/AddProduct'
import ManageProductsPage from './pages/ManageProducts'
import ManageOrdersPage from './pages/ManageOrders'
import ManageCategoriesPage from './pages/ManageCategories'
import AdminUsersPage from './pages/AdminUsers'
import ProductDetailsPage from './pages/ProductDetails'
import CheckoutPage from './pages/Checkout'
import AccountPage from './pages/Account'
import MyOrdersPage from './pages/MyOrders'
import { AppBar, Box, Button, Container, Toolbar, Menu, MenuItem, ListItemIcon, ListItemText, IconButton, Divider, Badge } from '@mui/material'
import ExpandMoreIcon from '@mui/icons-material/ExpandMore'
import MenuIcon from '@mui/icons-material/Menu'
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined'
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline'
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined'
import CategoryOutlinedIcon from '@mui/icons-material/CategoryOutlined'
import AccountCircleOutlinedIcon from '@mui/icons-material/AccountCircleOutlined'
import { useState } from 'react'
import { useAuth } from './state/AuthContext'
import { useCart } from './state/CartContext'
import { useEffect } from 'react'
import WhiteLogo from '../logo/Biale logo.png'

export default function App() {
  const { user } = useAuth()
  const { count } = useCart()
  const location = useLocation()
  const [anchorElAdmin, setAnchorElAdmin] = useState<null | HTMLElement>(null)
  const [anchorElMobile, setAnchorElMobile] = useState<null | HTMLElement>(null)
  const adminOpen = Boolean(anchorElAdmin)
  const mobileOpen = Boolean(anchorElMobile)
  const openAdminMenu = (e: React.MouseEvent<HTMLButtonElement>) => setAnchorElAdmin(e.currentTarget)
  const closeAdminMenu = () => setAnchorElAdmin(null)
  const openMobileMenu = (e: React.MouseEvent<HTMLElement>) => setAnchorElMobile(e.currentTarget)
  const closeMobileMenu = () => setAnchorElMobile(null)

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
          <Box
            component={Link}
            to="/"
            sx={{
              display: 'flex',
              alignItems: 'center',
              textDecoration: 'none',
              color: 'inherit',
              mr: 2
            }}
          >
            <Box
              component="img"
              src={WhiteLogo}
              alt="Logo"
              sx={{ height: { xs: 32, sm: 72 }, width: 'auto', mr: 1 }}
              loading="lazy"
            />

          </Box>
          <Box sx={{ flexGrow: 1 }} />
          {/* Desktop navigation */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, alignItems: 'center', gap: 1 }}>
            <Button color="inherit" component={Link} to="/">Strona główna</Button>
            <Button color="inherit" component={Link} to="/products">Produkty</Button>
            <IconButton color="inherit" component={Link} to="/cart" aria-label="Koszyk">
              <Badge color="secondary" badgeContent={count} overlap="circular" invisible={count <= 0}>
                <ShoppingCartOutlinedIcon />
              </Badge>
            </IconButton>
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
                  <MenuItem component={Link} to="/orders/manage" onClick={closeAdminMenu}>
                    <ListItemIcon>
                      <Inventory2OutlinedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Zarządzaj zamówieniami" />
                  </MenuItem>
                  {user && user.role === 'admin' && (
                    <MenuItem component={Link} to="/admin/userrole" onClick={closeAdminMenu}>
                      <ListItemIcon>
                        <AccountCircleOutlinedIcon fontSize="small" />
                      </ListItemIcon>
                      <ListItemText primary="Zarządzanie rolami" />
                    </MenuItem>
                  )}
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
          </Box>

          {/* Mobile menu button */}
          <Box sx={{ display: { xs: 'flex', md: 'none' } }}>
            <IconButton
              color="inherit"
              aria-label="Otwórz menu"
              aria-controls={mobileOpen ? 'mobile-menu' : undefined}
              aria-haspopup="true"
              aria-expanded={mobileOpen ? 'true' : undefined}
              onClick={openMobileMenu}
              size="large"
            >
              <MenuIcon />
            </IconButton>
          </Box>

          {/* Mobile menu */}
          <Menu
            id="mobile-menu"
            anchorEl={anchorElMobile}
            open={mobileOpen}
            onClose={closeMobileMenu}
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
            <MenuItem component={Link} to="/" onClick={closeMobileMenu}>
              <ListItemText primary="Strona główna" />
            </MenuItem>
            <MenuItem component={Link} to="/products" onClick={closeMobileMenu}>
              <ListItemText primary="Produkty" />
            </MenuItem>
            <MenuItem component={Link} to="/cart" onClick={closeMobileMenu}>
              <ListItemText primary="Koszyk" />
            </MenuItem>
            {user && (user.role === 'admin' || user.role === 'seller') && (
              <>
                <Divider sx={{ my: 0.5 }} />
                <MenuItem component={Link} to="/products/new" onClick={closeMobileMenu}>
                  <ListItemIcon>
                    <AddCircleOutlineIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Dodaj produkt" />
                </MenuItem>
                <MenuItem component={Link} to="/products/manage" onClick={closeMobileMenu}>
                  <ListItemIcon>
                    <Inventory2OutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Zarządzaj produktami" />
                </MenuItem>
                <MenuItem component={Link} to="/categories/manage" onClick={closeMobileMenu}>
                  <ListItemIcon>
                    <CategoryOutlinedIcon fontSize="small" />
                  </ListItemIcon>
                  <ListItemText primary="Zarządzaj kategoriami" />
                </MenuItem>
                {user && user.role === 'admin' && (
                  <MenuItem component={Link} to="/admin/userrole" onClick={closeMobileMenu}>
                    <ListItemIcon>
                      <AccountCircleOutlinedIcon fontSize="small" />
                    </ListItemIcon>
                    <ListItemText primary="Zarządzanie rolami" />
                  </MenuItem>
                )}
              </>
            )}
            <Divider sx={{ my: 0.5 }} />
            {user ? (
              <MenuItem component={Link} to="/account" onClick={closeMobileMenu}>
                <ListItemIcon>
                  <AccountCircleOutlinedIcon fontSize="small" />
                </ListItemIcon>
                <ListItemText primary={user.username} />
              </MenuItem>
            ) : (
              <MenuItem component={Link} to="/login" onClick={closeMobileMenu}>
                <ListItemText primary="Logowanie" />
              </MenuItem>
            )}
          </Menu>
        </Toolbar>
      </AppBar>
      <Routes>
        <Route path="/" element={<Container maxWidth="lg"><HomePage /></Container>} />
  <Route path="/login" element={<Container maxWidth="sm"><LoginPage /></Container>} />
  <Route path="/forgot-password" element={<Container maxWidth="sm"><ForgotPasswordPage /></Container>} />
  <Route path="/reset-password" element={<Container maxWidth="sm"><ResetPasswordPage /></Container>} />
  <Route path="/account" element={<Container maxWidth="md"><AccountPage /></Container>} />
  <Route path="/account/orders" element={<Container maxWidth="lg"><MyOrdersPage /></Container>} />
  <Route path="/cart" element={<Container maxWidth="lg"><CartPage /></Container>} />
        {/* Pełna szerokość dla listy produktów */}
        <Route path="/products" element={<Box sx={{ px: { xs: 2, sm: 3 } }}><ProductsPage /></Box>} />
  {/* Formularz dodawania w węższym układzie */}
        <Route path="/products/new" element={<Container maxWidth="md"><AddProductPage /></Container>} />
  {/* Panel zarządzania produktami */}
  <Route path="/products/manage" element={<Container maxWidth="lg"><ManageProductsPage /></Container>} />
  {/* Panel zarządzania kategoriami */}
  <Route path="/categories/manage" element={<Container maxWidth="lg"><ManageCategoriesPage /></Container>} />
  <Route path="/orders/manage" element={<Container maxWidth="lg"><ManageOrdersPage /></Container>} />
  {/* Szczegóły produktu mogą iść szerzej, ale z delikatnym paddingiem */}
  <Route path="/products/:idOrSlug" element={<Box sx={{ px: { xs: 2, sm: 3 } }}><ProductDetailsPage /></Box>} />
  {/* Admin - role użytkowników */}
  <Route path="/admin/userrole" element={<Container maxWidth="lg"><AdminUsersPage /></Container>} />
  {/* Checkout */}
  <Route path="/checkout" element={<Container maxWidth="lg"><CheckoutPage /></Container>} />
      </Routes>
    </Box>
  )
}
