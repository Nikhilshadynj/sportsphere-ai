import jwt from "jsonwebtoken";
import { Role } from "../types/role";

const generateToken = (id: string, role: Role) => {
  return jwt.sign({ id, role }, process.env.JWT_SECRET as string, {
    expiresIn: "7d",
  });
};

export default generateToken;
