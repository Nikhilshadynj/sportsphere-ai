import { Request, Response } from "express";
import bcrypt from "bcryptjs";
import User from "../models/User";
import generateToken from "../utils/generateToken";
import { isRole } from "../types/role";

const sanitizeUser = (user: InstanceType<typeof User>) => {
  const { password: _password, ...safeUser } = user.toObject();
  return safeUser;
};

export const register = async (req: Request, res: Response) => {
  try {
    const { name, email, password, role: requestedRole } = req.body;

    if (requestedRole && requestedRole !== "user") {
      return res.status(403).json({
        message: "Cannot self-assign elevated roles. Default role is user.",
      });
    }

    if (requestedRole && !isRole(requestedRole)) {
      return res.status(400).json({ message: "Invalid role" });
    }

    const existingUser = await User.findOne({ email });

    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const user = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "user",
    });

    res.status(201).json({
      message: "User registered successfully",
      token: generateToken(user._id.toString(), user.role),
      user: sanitizeUser(user),
    });
  } catch {
    res.status(500).json({ message: "Registration failed" });
  }
};

export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    const isMatch = await bcrypt.compare(password, user.password);

    if (!isMatch) {
      return res.status(400).json({ message: "Invalid credentials" });
    }

    res.status(200).json({
      message: "Login successful",
      token: generateToken(user._id.toString(), user.role),
      user: sanitizeUser(user),
    });
  } catch {
    res.status(500).json({ message: "Login failed" });
  }
};
