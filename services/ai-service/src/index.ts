import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import aiRoutes from "./routes/ai.routes";
import connectDB from "./config/db";
import conversationRoutes from "./routes/conversation.routes";
import chatRoutes from "./routes/chat.routes";
import ragRoutes from "./routes/rag.routes";
import documentRoutes from "./routes/document.routes";
import documentRagRoutes from "./routes/document-rag.routes";
import matchAnalysisRoutes from "./routes/match-analysis.routes";
import commentaryRoutes from "./routes/commentary.routes";

dotenv.config();

const app = express();
connectDB();

app.use(cors());
app.use(express.json());
app.use("/", aiRoutes);
app.use("/", conversationRoutes);
app.use("/", chatRoutes);
app.use("/", ragRoutes);
app.use("/", documentRoutes);
app.use("/", documentRagRoutes);
app.use("/", matchAnalysisRoutes);
app.use("/", commentaryRoutes);


const PORT = process.env.PORT || 5002;

app.listen(PORT, () => {
  console.log(`AI Service running on ${PORT}`);
});