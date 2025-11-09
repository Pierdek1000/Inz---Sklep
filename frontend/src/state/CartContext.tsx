import React, { createContext, useContext, useEffect, useMemo, useState } from 'react'
import type { Product } from '../components/ProductCard'

export type CartLine = {
  id: string
  name: string
  price: number
  currency: string
  image?: string
  quantity: number
  stock?: number
}

const STORAGE_KEY = 'cart'

function readStored(): CartLine[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return []
    const parsed = JSON.parse(raw)
    if (Array.isArray(parsed)) return parsed.filter(v => v && typeof v.id === 'string' && typeof v.quantity === 'number')
    return []
  } catch {
    return []
  }
}

function writeStored(lines: CartLine[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(lines)) } catch {}
}

interface CartContextValue {
  items: CartLine[]
  count: number
  total: number
  addItem: (product: Product | CartLine, qty?: number) => void
  updateQty: (id: string, qty: number) => void
  removeItem: (id: string) => void
  clear: () => void
}

const CartContext = createContext<CartContextValue | undefined>(undefined)

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartLine[]>(() => readStored())

  useEffect(() => { writeStored(items) }, [items])

  const addItem = (product: Product | CartLine, qty: number = 1) => {
    setItems(prev => {
      const id = (product as any)._id || (product as any).id
      const existing = prev.find(l => l.id === id)
      if (existing) {
        const cap = existing.stock ?? (product as any).stock ?? Infinity
        if (Number.isFinite(cap) && cap <= 0) return prev // out of stock, do nothing
        const requested = (existing.quantity || 0) + Math.max(1, qty)
        const nextQty = Math.min(cap, requested)
        const ensured = Math.max(1, nextQty)
        return prev.map(l => l.id === id ? { ...l, quantity: ensured, stock: l.stock ?? (product as any).stock } : l)
      }
      const cap = (product as any).stock ?? Infinity
      if (Number.isFinite(cap) && cap <= 0) return prev // out of stock, do not add new line
      const requested = Math.max(1, qty)
      const allowed = Math.min(cap, requested)
      const line: CartLine = {
        id,
        name: (product as any).name,
        price: (product as any).price,
        currency: (product as any).currency || 'PLN',
        image: (product as any).images?.[0] || (product as any).image,
        quantity: allowed,
        stock: (product as any).stock
      }
      return [...prev, line]
    })
  }

  const updateQty = (id: string, qty: number) => setItems(prev => prev.map(l => {
    if (l.id !== id) return l
    const cap = l.stock ?? Infinity
    const clamped = Math.max(1, Math.min(cap, qty))
    return { ...l, quantity: clamped }
  }))
  const removeItem = (id: string) => setItems(prev => prev.filter(l => l.id !== id))
  const clear = () => setItems([])

  const count = useMemo(() => items.reduce((sum, l) => sum + l.quantity, 0), [items])
  const total = useMemo(() => items.reduce((sum, l) => sum + l.price * l.quantity, 0), [items])

  const value: CartContextValue = { items, count, total, addItem, updateQty, removeItem, clear }
  return <CartContext.Provider value={value}>{children}</CartContext.Provider>
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext)
  if (!ctx) throw new Error('useCart must be used within CartProvider')
  return ctx
}
