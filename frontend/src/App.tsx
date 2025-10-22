
import './App.css'
import { Button, Container, Typography, Stack } from '@mui/material'

function App() {
  return (
    <Container maxWidth="sm" sx={{ textAlign: 'center', mt: 8 }}>
      <Stack spacing={3} alignItems="center">
        <Typography variant="h4" component="h1">
          Działa
        </Typography>
        <Button variant="contained" color="primary">
          Przycisk MUI
        </Button>
      </Stack>
    </Container>
  );
}

export default App
