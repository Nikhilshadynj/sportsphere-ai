import http from "http";
import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import aiRoutes from "./routes/ai.routes";
import connectDB from "./config/db";
import conversationRoutes from "./routes/conversation.routes";
import chatRoutes from "./routes/chat.routes";
import ragRoutes from "./routes/rag.routes";
import documentRoutes from "./routes/document.routes";
import matchAnalysisRoutes from "./routes/match-analysis.routes";
import commentaryRoutes from "./routes/commentary.routes";
import { connectRedis } from "./config/redis";
import { authenticate } from "./middleware/auth.middleware";
import { connectRabbit } from "./config/rabbit";
import { startChatConsumer } from "./consumers/chat.consumer";
import {
  startDocumentConsumer,
} from "./consumers/document.consumer";
import { initializeSocket } from "./config/socket";
import { initializeVectorStore } from "./services/rag/embedding.service";

dotenv.config();

const app = express();
const server = http.createServer(app);
app.use(cors());
app.use(express.json());
app.use(authenticate);

app.use("/", aiRoutes);
app.use("/", conversationRoutes);
app.use("/", chatRoutes);
app.use("/", ragRoutes);
app.use("/documents", documentRoutes);
app.use("/", matchAnalysisRoutes);
app.use("/", commentaryRoutes);

initializeSocket(server);

const PORT = process.env.PORT || 5002;

const bootstrap = async () => {
  try {
    await connectDB();

    await connectRedis();

    await connectRabbit();

    await startChatConsumer();

    await initializeVectorStore();

    startDocumentConsumer();
    server.listen(PORT, () => {
      console.log(
        `AI Service running on ${PORT}`
      );
    });
  } catch (error) {
    console.error(error);
    process.exit(1);
  }
};

bootstrap();