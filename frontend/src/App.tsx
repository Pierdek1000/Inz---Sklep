
import './App.css'
import { Routes, Route, Link } from 'react-router-dom'
import LoginPage from './pages/Login'
import HomePage from './pages/Home'
import { AppBar, Box, Button, Container, Toolbar, Typography } from '@mui/material'
import { useAuth } from './state/AuthContext'

export default function App() {
  const { user } = useAuth()
  return (
    <Box>
      <AppBar position="static">
        <Toolbar>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>Inz - Sklep</Typography>
          <Button color="inherit" component={Link} to="/">Strona główna</Button>
          {!user && <Button color="inherit" component={Link} to="/login">Logowanie</Button>}
        </Toolbar>
      </AppBar>
      <Container maxWidth="lg">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
        </Routes>
      </Container>
    </Box>
  )
}
