import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import morgan from 'morgan';
import routes from "./routes";
import http from "http";
import { initializeSocket } from "./config/socket";
import { connectRabbit } from "./config/rabbit";
import { startConversationConsumer } from "./consumers/conversation.consumer";

dotenv.config();

const app = express();
const server = http.createServer(app);

initializeSocket(server);

app.use(cors());
app.use(helmet());
app.use(morgan('dev'));

// Proxy routes must be registered before express.json() — body-parser
// consumes the request stream and breaks POST forwarding to upstream services.
app.use("/api", routes);

app.use(express.json());

const PORT = process.env.PORT || 4000;

app.get("/health", (_req, res) => {
  res.status(200).json({
    service: "api-gateway",
    status: "healthy",
    timestamp: new Date().toISOString(),
  });
});

const bootstrap = async () => {

  await connectRabbit();

  await startConversationConsumer();

  server.listen(PORT, () => {
    console.log(
      `API Gateway running on port ${PORT}`
    );
  });

};

bootstrap();