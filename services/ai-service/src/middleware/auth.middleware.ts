import { Request, Response, NextFunction } from "express";

declare module "express-serve-static-core" {
  interface Request {
    userId?: string;
  }
}

export const authenticate = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  req.userId = req.headers["x-user-id"] as string;

  next();
};