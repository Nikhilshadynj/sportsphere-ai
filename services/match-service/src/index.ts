import "dotenv/config";
import express, {
  NextFunction,
  Request,
  Response,
} from "express";

import connectDB from "./config/db";
import matchRoutes from "./routes/match.routes";
import liveMatchRoutes from "./routes/live-match.routes";

const app = express();

const PORT = Number(process.env.PORT) || 5003;

app.use(express.json());

app.get("/health", (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    service: "match-service",
    status: "healthy",
  });
});

app.use("/matches", matchRoutes);
app.use("/live-matches", liveMatchRoutes);

app.use(
  (
    _req: Request,
    res: Response
  ): void => {
    res.status(404).json({
      success: false,
      message: "Route not found",
    });
  }
);

app.use(
  (
    error: unknown,
    _req: Request,
    res: Response,
    _next: NextFunction
  ): void => {
    console.error("Unhandled match-service error:", error);

    res.status(500).json({
      success: false,
      message: "Internal server error",
    });
  }
);

const startServer = async (): Promise<void> => {
  try {
    await connectDB();

    app.listen(PORT, () => {
      console.log(`Match Service running on port ${PORT}`);
    });
  } catch (error) {
    console.error("Match Service startup failed:", error);
    process.exit(1);
  }
};

void startServer();