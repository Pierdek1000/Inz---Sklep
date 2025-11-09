import { Request, Response } from 'express';
import { Order } from '../models/orderModel';
import { Product } from '../models/productModel';

interface CreateOrderBody {
  items: Array<{ productId: string; quantity: number }>; // client sends product id + quantity
  paymentMethod: 'cod' | 'transfer';
  shipping: {
    firstName: string;
    lastName: string;
    email: string;
    phone?: string;
    street: string;
    city: string;
    postal: string;
  };
}

export const createOrder = async (req: Request<{}, {}, CreateOrderBody>, res: Response) => {
  try {
    const user = (req as any).user as { id: string } | undefined;
    const { items, paymentMethod, shipping } = req.body;

    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Brak pozycji zamówienia' });
    }
    if (!paymentMethod || !['cod', 'transfer'].includes(paymentMethod)) {
      return res.status(400).json({ message: 'Nieprawidłowa metoda płatności' });
    }
    const requiredShipping = ['firstName','lastName','email','street','city','postal'];
    for (const f of requiredShipping) {
      if (!(shipping as any)?.[f] || String((shipping as any)[f]).trim() === '') {
        return res.status(400).json({ message: 'Brak wymaganych danych wysyłki' });
      }
    }

    // Load products and validate stock
    const productIds = items.map(i => i.productId);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true });

    // Map for quick lookup
    const prodMap = new Map(products.map(p => [String(p._id), p]));

    const orderItems = [] as any[];
    let total = 0;

    for (const line of items) {
      const p = prodMap.get(line.productId);
      if (!p) return res.status(400).json({ message: 'Produkt niedostępny' });
      const qty = Number(line.quantity);
      if (!Number.isFinite(qty) || qty < 1) return res.status(400).json({ message: 'Nieprawidłowa ilość' });
      if (p.stock < qty) return res.status(400).json({ message: `Brak wystarczającego stanu dla produktu: ${p.name}` });
      orderItems.push({
        product: p._id,
        name: p.name,
        price: p.price,
        currency: p.currency || 'PLN',
        quantity: qty,
        image: p.images?.[0]
      });
      total += p.price * qty;
    }

    // Decrement stock (atomic-ish per product)
    for (const oi of orderItems) {
      await Product.findByIdAndUpdate(oi.product, { $inc: { stock: -oi.quantity } });
    }

    const order = await Order.create({
      user: user?.id,
      items: orderItems,
      total,
      currency: 'PLN',
      paymentMethod,
      shipping,
    });

    res.status(201).json({
      message: 'Zamówienie utworzone',
      orderId: order._id,
      total: order.total,
      status: order.status,
    });
  } catch (err) {
    console.error('createOrder error', err);
    res.status(500).json({ message: 'Wewnętrzny błąd serwera' });
  }
};

export const listMyOrders = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user as { id: string } | undefined;
    if (!user?.id) return res.status(401).json({ message: 'Nieautoryzowany' });
    const orders = await Order.find({ user: user.id }).sort({ createdAt: -1 }).lean();
    res.json({
      data: orders.map(o => ({
        id: o._id,
        createdAt: o.createdAt,
        total: o.total,
        status: o.status,
        paymentMethod: o.paymentMethod,
        items: o.items.map(i => ({ name: i.name, quantity: i.quantity, price: i.price, currency: i.currency, image: i.image }))
      }))
    });
  } catch (err) {
    console.error('listMyOrders error', err);
    res.status(500).json({ message: 'Wewnętrzny błąd serwera' });
  }
};

type AdminQuery = { page?: string; limit?: string; status?: string; q?: string };
export const listAllOrders = async (req: Request<{}, {}, {}, AdminQuery>, res: Response) => {
  try {
    const { page = '1', limit = '20', status, q } = req.query;
    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit as string, 10) || 20, 1), 100);
    const filter: any = {};
    if (status) filter.status = status;
    if (q) {
      const regex = new RegExp(String(q), 'i');
      filter.$or = [
        { 'shipping.firstName': regex },
        { 'shipping.lastName': regex },
        { 'shipping.email': regex },
      ];
    }
    const [items, total] = await Promise.all([
      Order.find(filter).sort({ createdAt: -1 }).skip((pageNum - 1) * limitNum).limit(limitNum).lean(),
      Order.countDocuments(filter),
    ]);
    res.json({ data: items, total, page: pageNum, pages: Math.ceil(total / limitNum) || 1 });
  } catch (err) {
    console.error('listAllOrders error', err);
    res.status(500).json({ message: 'Wewnętrzny błąd serwera' });
  }
};

export const updateOrderStatus = async (req: Request<{ id: string }, {}, { status?: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const next = String(req.body?.status || '');
  const allowed = ['new','paid','shipped','delivered','cancelled'];
    if (!allowed.includes(next)) return res.status(400).json({ message: 'Nieprawidłowy status' });
    const order = await Order.findById(id);
    if (!order) return res.status(404).json({ message: 'Zamówienie nie znalezione' });
    order.status = next as any;
    await order.save();
    res.json({ message: 'Status zaktualizowany', status: order.status });
  } catch (err) {
    console.error('updateOrderStatus error', err);
    res.status(500).json({ message: 'Wewnętrzny błąd serwera' });
  }
};
