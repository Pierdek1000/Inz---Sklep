import { Request, Response } from "express";
import { User } from "../models/userModel";

// Lista użytkowników (tylko admin) – zwraca podstawowe dane bez hasła
export const listUsers = async (req: Request, res: Response) => {
  try {
    const { email } = req.query as { email?: string };
    const filter: any = {};
    if (email) {
      // Dokładne lub częściowe dopasowanie (case-insensitive)
      filter.email = { $regex: email, $options: "i" };
    }
    const users = await User.find(filter).select("_id username email role createdAt").sort({ createdAt: -1 }).limit(200);
    return res.json({ users: users.map(u => ({ id: u._id, username: u.username, email: u.email, role: u.role, createdAt: u.createdAt })) });
  } catch (err) {
    console.error("Błąd listUsers", err);
    return res.status(500).json({ message: "Wewnętrzny błąd serwera" });
  }
};

// Zmiana roli użytkownika – PATCH /api/users/:id/role { role }
export const updateUserRole = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { role } = req.body as { role?: string };

    if (!role) return res.status(400).json({ message: "Brak pola 'role'" });
    const allowed = ["user", "admin", "seller"] as const;
    if (!allowed.includes(role as any)) {
      return res.status(400).json({ message: "Nieprawidłowa rola" });
    }

    // Opcjonalnie: blokada zmiany własnej roli jeśli chce się usunąć admina ostatniego
    const requesting = (req as any).user as { id: string } | undefined;
    if (!requesting?.id) return res.status(401).json({ message: "Brak autoryzacji" });

    // Nie pozwól usunąć ostatniego admina w systemie
    if (requesting.id === id) {
      const adminCount = await User.countDocuments({ role: "admin" });
      if (adminCount === 1 && role !== "admin") {
        return res.status(400).json({ message: "Nie można zdegradować ostatniego administratora" });
      }
    }

    const user = await User.findById(id).select("_id username email role");
    if (!user) return res.status(404).json({ message: "Użytkownik nie znaleziony" });

    if (user.role === role) {
      return res.status(200).json({ message: "Rola bez zmian", user: { id: user._id, username: user.username, email: user.email, role: user.role } });
    }

    user.role = role as any;
    await user.save();
    return res.json({ message: "Zmieniono rolę użytkownika", user: { id: user._id, username: user.username, email: user.email, role: user.role } });
  } catch (err) {
    console.error("Błąd updateUserRole", err);
    return res.status(500).json({ message: "Wewnętrzny błąd serwera" });
  }
};
