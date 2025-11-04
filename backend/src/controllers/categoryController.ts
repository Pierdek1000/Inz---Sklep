import { Request, Response } from "express";
import { Category, catSlugify } from "../models/categoryModel";

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
