import mongoose, { Schema, Document, Types } from 'mongoose';

export interface IOrderItem {
  product: Types.ObjectId; // ref Product
  name: string;
  price: number;
  currency: string;
  quantity: number;
  image?: string;
}

export interface IOrder extends Document {
  user?: Types.ObjectId; // optional if guest checkout later
  items: IOrderItem[];
  total: number;
  currency: string;
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
  status: 'new' | 'paid' | 'shipped' | 'delivered' | 'cancelled';
  createdAt: Date;
  updatedAt: Date;
}

const orderItemSchema = new Schema<IOrderItem>({
  product: { type: Schema.Types.ObjectId, ref: 'Product', required: true },
  name: { type: String, required: true },
  price: { type: Number, required: true },
  currency: { type: String, default: 'PLN' },
  quantity: { type: Number, required: true, min: 1 },
  image: { type: String },
}, { _id: false });

const orderSchema = new Schema<IOrder>({
  user: { type: Schema.Types.ObjectId, ref: 'User' },
  items: { type: [orderItemSchema], required: true },
  total: { type: Number, required: true, min: 0 },
  currency: { type: String, default: 'PLN' },
  paymentMethod: { type: String, enum: ['cod', 'transfer'], required: true },
  shipping: {
    firstName: { type: String, required: true },
    lastName: { type: String, required: true },
    email: { type: String, required: true },
    phone: { type: String },
    street: { type: String, required: true },
    city: { type: String, required: true },
    postal: { type: String, required: true },
  },
  status: { type: String, enum: ['new', 'paid', 'shipped', 'delivered', 'cancelled'], default: 'new' },
}, { timestamps: true });

export const Order = mongoose.model<IOrder>('Order', orderSchema);
