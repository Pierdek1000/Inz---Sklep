import { Card, CardActionArea, CardContent, CardMedia, Stack, Typography } from '@mui/material'

export type Product = {
  _id: string
  name: string
  slug: string
  price: number
  currency: string
  images: string[]
}

type Props = {
  product: Product
  onClick?: (product: Product) => void
}

export default function ProductCard({ product, onClick }: Props) {
  const image = product.images?.[0] || '/placeholder.svg'
  return (
    <Card>
      <CardActionArea onClick={() => onClick?.(product)}>
        <CardMedia component="img" height="180" image={image} alt={product.name} onError={(e: any) => { (e.target as HTMLImageElement).src = '/placeholder.svg' }} />
        <CardContent>
          <Stack direction="row" alignItems="center" justifyContent="space-between" spacing={2}>
            <Typography variant="subtitle1" noWrap>{product.name}</Typography>
            <Typography variant="subtitle1" fontWeight={700}>{product.price.toFixed(2)} {product.currency}</Typography>
          </Stack>
        </CardContent>
      </CardActionArea>
    </Card>
  )
}
