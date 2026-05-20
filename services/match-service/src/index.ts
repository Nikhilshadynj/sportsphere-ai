import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import connectDB from "./config/db";
import matchRoutes from "./routes/match.routes";
import liveMatchRoutes from "./routes/live-match.routes";

dotenv.config();

const app = express();

app.use(cors());
app.use(express.json());

connectDB();

app.get("/health", (_req, res) => {
  res.json({
    message: "Match Service running",
  });
});

app.use("/matches", matchRoutes);
app.use("/", liveMatchRoutes);

const PORT = Number(process.env.PORT) || 5003;

app.listen(PORT, "0.0.0.0", () => {
  console.log(`Match Service running on port ${PORT}`);
});