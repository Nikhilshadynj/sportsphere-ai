# app/core/redis.py
import redis.asyncio as redis

# Create an async redis client
redis_client = redis.Redis(host='localhost', port=6379, decode_responses=True)

async def invalidate_cache(*keys):
    for key in keys:
        await redis_client.delete(key)