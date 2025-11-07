import { Box } from '@mui/material'
import type { SxProps, Theme } from '@mui/material/styles'

type Props = {
  label: string
  selected?: boolean
  onClick?: () => void
  onClear?: () => void
  sx?: SxProps<Theme>
}

export default function CategoryLink({ label, selected, onClick, onClear, sx }: Props) {
  return (
    <Box
      component="span"
      onClick={selected ? undefined : onClick}
      sx={{
        position: 'relative',
        display: 'inline-flex',
        alignItems: 'center',
        gap: 0.5,
        cursor: selected ? 'default' : onClick ? 'pointer' : 'default',
  color: 'text.primary',
        fontWeight: selected ? 700 : 500,
        lineHeight: 1.8,
        userSelect: 'none',
        px: 0.25,
        // Improve underline visibility on mixed/bright backgrounds
        textDecoration: 'none',
        '&::after': {
          content: '""',
          position: 'absolute',
          left: 0,
          bottom: 0,
          height: 2,
          width: '100%',
          bgcolor: 'currentColor',
          transform: selected ? 'scaleX(1)' : 'scaleX(0)',
          transformOrigin: 'left',
          transition: 'transform 220ms ease',
          borderRadius: 2,
          pointerEvents: 'none',
          // Slight shadow for visibility over gradients
          boxShadow: '0 0 0.5px rgba(0,0,0,0.3)',
        },
        '&:hover::after': {
          transform: 'scaleX(1)',
        },
        '&:focus-visible': {
          outline: '2px solid',
          outlineColor: 'text.secondary',
          outlineOffset: 2,
        },
        ...sx,
      }}
    >
      {label}
      {selected && onClear && (
        <Box
          component="button"
          type="button"
          onClick={(e) => { e.stopPropagation(); onClear(); }}
          aria-label="Wyczyść kategorię"
          sx={{
            ml: 0.5,
            border: 'none',
            background: 'transparent',
            color: 'inherit',
            cursor: 'pointer',
            p: 0,
            lineHeight: 1,
            fontSize: 16,
          }}
        >
          ×
        </Box>
      )}
    </Box>
  )
}
