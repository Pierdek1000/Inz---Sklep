import { Request, Response } from "express";
import { Category, catSlugify } from "../models/categoryModel";
import { Product } from "../models/productModel";

export const listCategories = async (_req: Request, res: Response) => {
  try {
    const cats = await Category.find({ isActive: true }).sort({ name: 1 }).lean();
    res.json({ categories: cats.map((c) => c.name) });
  } catch (err) {
    console.error("listCategories error", err);
    res.status(500).json({ message: "Wewnętrzny błąd serwera" });
  }
};

export const createCategory = async (req: Request, res: Response) => {
  try {
    const { name } = req.body as { name?: string };
    const trimmed = (name || "").trim();
    if (!trimmed) return res.status(400).json({ message: "Nazwa kategorii jest wymagana" });

    // Ensure uniqueness case-insensitive
    const slug = catSlugify(trimmed);
    const exists = await Category.findOne({ slug });
    if (exists) return res.status(409).json({ message: "Taka kategoria już istnieje" });

    const created = await Category.create({ name: trimmed, slug });
    res.status(201).json(created);
  } catch (err) {
    console.error("createCategory error", err);
    res.status(500).json({ message: "Wewnętrzny błąd serwera" });
  }
};

export const adminListCategories = async (_req: Request, res: Response) => {
  try {
    const cats = await Category.find({}).sort({ name: 1 }).lean();
    res.json({ data: cats });
  } catch (err) {
    console.error("adminListCategories error", err);
    res.status(500).json({ message: "Wewnętrzny błąd serwera" });
  }
};

export const updateCategory = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const { name, isActive } = req.body as { name?: string; isActive?: boolean };

    const cat = await Category.findById(id);
    if (!cat) return res.status(404).json({ message: "Kategoria nie znaleziona" });

    const prevName = cat.name;
    let nameChanged = false;
    if (typeof name === "string") {
      const trimmed = name.trim();
      if (!trimmed) return res.status(400).json({ message: "Nazwa nie może być pusta" });
      if (trimmed.toLowerCase() !== prevName.toLowerCase()) {
        const slug = catSlugify(trimmed);
        const exists = await Category.findOne({ slug, _id: { $ne: cat._id } });
        if (exists) return res.status(409).json({ message: "Taka kategoria już istnieje" });
        cat.name = trimmed;
        cat.slug = slug;
        nameChanged = true;
      }
    }
    if (typeof isActive === "boolean") {
      cat.isActive = isActive;
    }

    await cat.save();

    // If name changed, update products referencing this category name
    if (nameChanged) {
      await Product.updateMany({ category: prevName }, { $set: { category: cat.name } });
    }

    res.json(cat);
  } catch (err) {
    console.error("updateCategory error", err);
    res.status(500).json({ message: "Wewnętrzny błąd serwera" });
  }
};

export const deleteCategory = async (req: Request<{ id: string }>, res: Response) => {
  try {
    const { id } = req.params;
    const cat = await Category.findById(id);
    if (!cat) return res.status(404).json({ message: "Kategoria nie znaleziona" });

    // Soft delete by deactivating
    cat.isActive = false;
    await cat.save();
    res.json({ message: "Dezaktywowano kategorię" });
  } catch (err) {
    console.error("deleteCategory error", err);
    res.status(500).json({ message: "Wewnętrzny błąd serwera" });
  }
};
