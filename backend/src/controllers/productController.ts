import { Request, Response } from "express";
import { Product, slugify } from "../models/productModel";
import { Category } from "../models/categoryModel";

type Query = {
  page?: string;
  limit?: string;
  sort?: string; // e.g. '-createdAt,price'
  q?: string;
  category?: string;
  minPrice?: string;
  maxPrice?: string;
  inStock?: string; // 'true'|'false'
};

export const listProducts = async (req: Request<{}, {}, {}, Query>, res: Response) => {
  try {
    const {
      page = "1",
      limit = "12",
      sort = "-createdAt",
      q,
      category,
      minPrice,
      maxPrice,
      inStock,
    } = req.query;

    const pageNum = Math.max(parseInt(page as string, 10) || 1, 1);
    const limitNum = Math.min(Math.max(parseInt(limit as string, 10) || 12, 1), 100);

    const filter: Record<string, any> = { isActive: true };
    if (q) {
      const regex = new RegExp(q, "i");
      filter.$or = [{ name: regex }, { description: regex }];
    }
    if (category) filter.category = category;
    if (minPrice || maxPrice) {
      filter.price = {};
      if (minPrice) filter.price.$gte = Number(minPrice);
      if (maxPrice) filter.price.$lte = Number(maxPrice);
    }
    if (inStock === "true") filter.stock = { $gt: 0 };
    if (inStock === "false") filter.stock = 0;

    const sortFields = (sort || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
      .join(" ");

    const [items, total] = await Promise.all([
      Product.find(filter)
        .sort(sortFields || "-createdAt")
        .skip((pageNum - 1) * limitNum)
        .limit(limitNum),
      Product.countDocuments(filter),
    ]);

    res.json({
      data: items,
      total,
      page: pageNum,
      pages: Math.ceil(total / limitNum) || 1,
    });
  } catch (err) {
    console.error("listProducts error", err);
    res.status(500).json({ message: "Wewnętrzny błąd serwera" });
  }
};

export const getProduct = async (req: Request<{ idOrSlug: string }>, res: Response) => {
  try {
    const { idOrSlug } = req.params;

    let product = null;
    if (idOrSlug.match(/^[0-9a-fA-F]{24}$/)) {
      product = await Product.findById(idOrSlug);
    }
    if (!product) {
      product = await Product.findOne({ slug: idOrSlug });
    }

    if (!product) return res.status(404).json({ message: "Produkt nie znaleziony" });
    res.json(product);
  } catch (err) {
    console.error("getProduct error", err);
    res.status(500).json({ message: "Wewnętrzny błąd serwera" });
  }
};

export const listCategories = async (_req: Request, res: Response) => {
  try {
    // Now based on Category collection
    const cats = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
    res.json({ categories: cats.map((c) => c.name) });
  } catch (err) {
    console.error("listCategories error", err);
    res.status(500).json({ message: "Wewnętrzny błąd serwera" });
  }
};

export const createProduct = async (req: Request, res: Response) => {
  try {
    const { name, description, price, stock, category, brand, images, currency } = req.body as {
      name?: string;
      description?: string;
      price?: number;
      stock?: number;
      category?: string;
      brand?: string;
      images?: string[];
      currency?: string;
    };

    if (!name || price == null) {
      return res.status(400).json({ message: "Brak wymaganych pól (name, price)" });
    }

    // Enforce existing category
    const catName = (category || "").trim();
    if (!catName) return res.status(400).json({ message: "Wybierz istniejącą kategorię" });
    const cat = await Category.findOne({ name: catName, isActive: true });
    if (!cat) return res.status(400).json({ message: "Wybrana kategoria nie istnieje" });

    // generate unique slug
    const baseSlug = slugify(name);
    let finalSlug = baseSlug;
    let i = 1;
    while (await Product.findOne({ slug: finalSlug })) {
      i += 1;
      finalSlug = `${baseSlug}-${i}`;
      if (i > 1000) break; // safety
    }

    const product = await Product.create({
      name,
      slug: finalSlug,
      description,
      price,
      stock: stock ?? 0,
      category: cat.name,
      brand,
      images: Array.isArray(images) ? images : [],
      currency: currency || "PLN",
    });

    res.status(201).json(product);
  } catch (err) {
    console.error("createProduct error", err);
    res.status(500).json({ message: "Wewnętrzny błąd serwera" });
  }
};

export const updateProduct = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const patch = req.body as Partial<{
      name: string;
      description: string;
      price: number;
      stock: number;
      category: string;
      brand: string;
      images: string[];
      currency: string;
      isActive: boolean;
    }>;

    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Produkt nie znaleziony" });

    const nameChanged = patch.name && patch.name !== product.name;
    if (patch.name) product.name = patch.name;
    if (patch.description !== undefined) product.description = patch.description;
    if (patch.price !== undefined) product.price = patch.price;
    if (patch.stock !== undefined) product.stock = patch.stock;
    if (patch.category !== undefined) {
      const nextCat = (patch.category || "").trim();
      if (!nextCat) return res.status(400).json({ message: "Wybierz istniejącą kategorię" });
      const cat = await Category.findOne({ name: nextCat, isActive: true });
      if (!cat) return res.status(400).json({ message: "Wybrana kategoria nie istnieje" });
      product.category = cat.name;
    }
    if (patch.brand !== undefined) product.brand = patch.brand;
    if (patch.images !== undefined) product.images = Array.isArray(patch.images) ? patch.images : [];
    if (patch.currency !== undefined) product.currency = patch.currency;
    if (patch.isActive !== undefined) product.isActive = patch.isActive;

    if (nameChanged) {
      const baseSlug = slugify(product.name);
      let finalSlug = baseSlug;
      let i = 1;
      while (await Product.findOne({ slug: finalSlug, _id: { $ne: product._id } })) {
        i += 1;
        finalSlug = `${baseSlug}-${i}`;
        if (i > 1000) break;
      }
      product.slug = finalSlug;
    }

    await product.save();
    res.json(product);
  } catch (err) {
    console.error("updateProduct error", err);
    res.status(500).json({ message: "Wewnętrzny błąd serwera" });
  }
};

export const deleteProduct = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const product = await Product.findById(id);
    if (!product) return res.status(404).json({ message: "Produkt nie znaleziony" });
    await product.deleteOne();
    res.json({ message: "Usunięto" });
  } catch (err) {
    console.error("deleteProduct error", err);
    res.status(500).json({ message: "Wewnętrzny błąd serwera" });
  }
};
