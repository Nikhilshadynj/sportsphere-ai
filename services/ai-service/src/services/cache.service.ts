import { redisClient } from "../config/redis";

class CacheService {
  async get<T>(key: string): Promise<T | null> {
    const data = await redisClient.get(key);

    if (!data) return null;

    return JSON.parse(data);
  }

  async set(key: string, value: unknown, ttl = 300) {
    await redisClient.set(
      key,
      JSON.stringify(value),
      {
        EX: ttl,
      }
    );
  }

  async del(key: string) {
    await redisClient.del(key);
  }
}

export default new CacheService();