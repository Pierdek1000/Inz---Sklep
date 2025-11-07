import { Card, CardActionArea, CardContent, Stack, Typography, Box, Rating } from '@mui/material'

export type Product = {
  _id: string
  name: string
  slug: string
  price: number
  currency: string
  images: string[]
  rating?: number
  numReviews?: number
}

type Props = {
  product: Product
  onClick?: (product: Product) => void
}

export default function ProductCard({ product, onClick }: Props) {
  const image = product.images?.[0] || '/placeholder.svg'
  return (
    <Card sx={{ overflow: 'hidden', borderRadius: 2, boxShadow: 2, '&:hover': { boxShadow: 4 } }}>
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
        <CardContent sx={{ py: 1.5 }}>
          <Stack spacing={0.5}>
            <Typography variant="subtitle1" sx={{ fontWeight: 600, display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden' }}>
              {product.name}
            </Typography>
            {(product.rating != null) && (
              <Stack direction="row" spacing={1} alignItems="center">
                <Rating name="read-only" value={Number(product.rating) || 0} precision={0.5} size="small" readOnly />
                <Typography variant="caption" color="text.secondary">({product.numReviews ?? 0})</Typography>
              </Stack>
            )}
            <Typography variant="subtitle1" fontWeight={800}>{product.price.toFixed(2)} {product.currency}</Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
