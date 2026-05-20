import { Request } from "express";
import { Role } from "./role";

export interface JwtPayload {
  id: string;
  role: Role;
}

export interface AuthRequest extends Request {
  user?: JwtPayload;
}
