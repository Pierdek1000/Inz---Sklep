import { Card, CardActionArea, CardContent, Stack, Typography, Box, Rating, Button, Snackbar, Alert } from '@mui/material'
import { useState } from 'react'
import { useCart } from '../state/CartContext'

export type Product = {
  _id: string
  name: string
  slug: string
  price: number
  currency: string
  images: string[]
  stock?: number
  rating?: number
  numReviews?: number
}

type Props = {
  product: Product
  onClick?: (product: Product) => void
}

export default function ProductCard({ product, onClick }: Props) {
  const image = product.images?.[0] || '/placeholder.svg'
  const { addItem } = useCart()
  const [addedOpen, setAddedOpen] = useState(false)
  const handleAdd = (e?: React.MouseEvent) => {
    e?.stopPropagation()
    addItem(product, 1)
    setAddedOpen(true)
  }
  return (
    <>
    <Card
      sx={{
        position: 'relative',
        overflow: 'hidden',
        borderRadius: 2,
        boxShadow: 2,
        '&:hover': { boxShadow: 4 },
        '&:hover .hover-add': { opacity: 1, transform: 'translateY(0%)', pointerEvents: 'auto' },
        '&:hover .meta-area': { opacity: 0 }
      }}
    >
      {/* Kliknięcie w obraz prowadzi do szczegółów */}
      <CardActionArea onClick={() => onClick?.(product)}>
        <Box sx={{ position: 'relative', width: '100%', aspectRatio: '1 / 1', overflow: 'hidden' }}>
          <Box
            component="img"
            src={image}
            alt={product.name}
            onError={(e: any) => { (e.target as HTMLImageElement).src = '/placeholder.svg' }}
            loading="lazy"
            sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform .3s',
              '&:hover': { transform: 'scale(1.06)' } }}
          />
        </Box>
      </CardActionArea>

      {/* Strefa dolna: info + wersja hover z przyciskiem */}
      <Box sx={{ position: 'relative', minHeight: 88 }}>
        {/* Standardowe informacje: NAZWA zawsze widoczna */}
        <CardContent sx={{ py: 1.5 }}>
          <Stack spacing={0.5}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {product.name}
            </Typography>
            {/* Meta (ocena + cena) znika przy hoverze */}
            <Box className="meta-area" sx={{ transition: 'opacity .18s ease' }}>
              {(product.rating != null) && (
                <Stack direction="row" spacing={1} alignItems="center">
                  <Rating name="read-only" value={Number(product.rating) || 0} precision={0.5} size="small" readOnly />
                  <Typography variant="caption" color="text.secondary">({product.numReviews ?? 0})</Typography>
                </Stack>
              )}
              <Typography variant="subtitle1" fontWeight={800}>{product.price.toFixed(2)} {product.currency}</Typography>
            </Box>
          </Stack>
        </CardContent>

        {/* Overlay z przyciskiem na hoverze */}
        <Box
          className="hover-add"
          sx={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 0,
            p: 0,
            bgcolor: 'transparent',
            display: 'flex',
            justifyContent: 'stretch',
            opacity: 0,
            transform: 'translateY(8%)',
            transition: 'opacity .18s ease, transform .18s ease',
            pointerEvents: 'none'
          }}
        >
          <Button
            fullWidth
            variant="contained"
            size="medium"
            onClick={handleAdd}
            sx={{
              borderRadius: 0,
              height: '100%',
              py: 2,
              textTransform: 'none'
            }}
          >
            Dodaj do koszyka
          </Button>
        </Box>
      </Box>
    </Card>
    <Snackbar
      open={addedOpen}
      autoHideDuration={1800}
      onClose={() => setAddedOpen(false)}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
    >
      <Alert onClose={() => setAddedOpen(false)} severity="success" variant="filled" sx={{ width: '100%' }}>
        Dodano do koszyka: {product.name} x1
      </Alert>
    </Snackbar>
    </>
  )
}
