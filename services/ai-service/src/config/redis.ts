import { createClient } from "redis";

const REDIS_URL =
  process.env.REDIS_URL ??
  "redis://localhost:6379";

export const redisClient = createClient({
  url: REDIS_URL,
});

redisClient.on("error", (err) => {
  console.error("Redis Error:", err);
});

export const connectRedis = async () => {
  await redisClient.connect();
  console.log("✅ Redis Connected");
};