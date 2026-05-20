import express from "express";
import dotenv from "dotenv";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { connectDB } from "./config/db";
import authRoutes from "./routes/auth.routes";
import rbacRoutes from "./routes/rbac.routes";
import adminRoutes from "./routes/admin.routes";
import testRoutes from "./routes/test.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(helmet());
app.use(express.json());
app.use(morgan("dev"));
app.use("/", authRoutes);
app.use("/rbac", rbacRoutes);
app.use("/admin", adminRoutes);
app.use("/test", testRoutes);
app.get("/health", (req, res) => {
  res.json({ status: "auth-service running" });
});

const start = async () => {
  await connectDB();

  const PORT = process.env.PORT || 5001;

  app.listen(PORT, () => {
    console.log(`Auth Service running on port ${PORT}`);
  });
};

start();