import { Response } from "express";
import { AuthRequest } from "../types/auth";
import User from "../models/User";

export const getProfile = async (req: AuthRequest, res: Response) => {
  try {
    const user = await User.findById(req.user?.id).select("-password");

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ user });
  } catch {
    res.status(500).json({ message: "Failed to fetch profile" });
  }
};

export const userArea = (_req: AuthRequest, res: Response) => {
  res.json({
    message: "User area — accessible by user, admin, and ai-agent",
    role: _req.user?.role,
  });
};

export const adminArea = (_req: AuthRequest, res: Response) => {
  res.json({
    message: "Admin area — admin only",
    role: _req.user?.role,
  });
};

export const aiAgentArea = (_req: AuthRequest, res: Response) => {
  res.json({
    message: "AI agent area — ai-agent only",
    role: _req.user?.role,
  });
};
