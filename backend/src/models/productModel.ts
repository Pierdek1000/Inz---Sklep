import mongoose, { Schema, Document, Types } from "mongoose";

export interface IProduct extends Document {
  name: string;
  slug: string;
  description?: string;
  price: number;
  currency: string;
  stock: number;
  category?: string;
  brand?: string;
  images: string[];
  rating: number;
  numReviews: number;
  ratings: Array<{
    user: Types.ObjectId;
    value: number;
    createdAt?: Date;
    updatedAt?: Date;
  }>;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

function toSlug(str: string): string {
  return str
    .toLowerCase()
    .normalize("NFKD")
    .replace(/\p{Diacritic}+/gu, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

const productSchema = new Schema<IProduct>(
  {
    name: { type: String, required: true, trim: true },
    slug: { type: String, required: true, unique: true, index: true },
    description: { type: String },
    price: { type: Number, required: true, min: 0 },
    currency: { type: String, default: "PLN" },
    stock: { type: Number, required: true, min: 0, default: 0 },
    category: { type: String, index: true },
    brand: { type: String },
    images: { type: [String], default: [] },
    rating: { type: Number, default: 0, min: 0, max: 5 },
    numReviews: { type: Number, default: 0, min: 0 },
    ratings: {
      type: [
        new Schema(
          {
            user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
            value: { type: Number, required: true, min: 1, max: 5 },
          },
          { _id: false, timestamps: true }
        ),
      ],
      default: [],
    },
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

productSchema.pre("validate", function (next) {
  if (!this.slug && this.name) {
    this.slug = toSlug(this.name);
  }
  next();
});

export const Product = mongoose.model<IProduct>("Product", productSchema);

export const slugify = toSlug;
