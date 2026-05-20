import { Response } from "express";
import { AuthRequest } from "../types/auth";
import { isRole, Role } from "../types/role";
import User from "../models/User";

export const listUsers = async (_req: AuthRequest, res: Response) => {
  try {
    const users = await User.find().select("-password");
    res.status(200).json({ users });
  } catch {
    res.status(500).json({ message: "Failed to fetch users" });
  }
};

export const updateUserRole = async (req: AuthRequest, res: Response) => {
  try {
    const { role } = req.body as { role?: Role };

    if (!role || !isRole(role)) {
      return res.status(400).json({
        message: "Valid role is required",
        allowedRoles: ["user", "admin", "ai-agent"],
      });
    }

    const user = await User.findByIdAndUpdate(
      req.params.id,
      { role },
      { new: true, runValidators: true }
    ).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "Role updated successfully",
      user,
    });
  } catch {
    res.status(500).json({ message: "Failed to update role" });
  }
};
