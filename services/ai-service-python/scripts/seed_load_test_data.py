#!/usr/bin/env python3
"""
Load-test bulk data seeder for ai-service-python.

Uses asyncpg's copy_records_to_table (PostgreSQL binary COPY) for high-performance bulk ingestion.
All seeded records use user_id = 'loadtest-user' so they can be easily cleaned up.

Chunked approach: processes CHUNK_SIZE conversations at a time to keep memory usage
bounded — avoids holding millions of message rows in RAM simultaneously.
"""

import argparse
import asyncio
import os
import random
import sys
import time
import uuid
from datetime import datetime, timezone
from pathlib import Path
import asyncpg

# Add parent dir (ai-service-python root) to sys.path so app modules can be imported
SERVICE_ROOT = Path(__file__).resolve().parent.parent
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))


def get_db_dsn() -> str:
    """Resolve PostgreSQL DSN for asyncpg."""
    dsn = os.getenv("DATABASE_URL") or os.getenv("POSTGRES_URL")

    if not dsn:
        try:
            from app.core.database import DATABASE_URL
            dsn = DATABASE_URL
        except Exception:
            dsn = "postgresql://postgres:supersecretpassword@localhost:5432/sportsphere_ai"

    # asyncpg requires postgresql://, not postgresql+asyncpg://
    if dsn.startswith("postgresql+asyncpg://"):
        dsn = dsn.replace("postgresql+asyncpg://", "postgresql://", 1)
    elif dsn.startswith("postgresql+psycopg2://"):
        dsn = dsn.replace("postgresql+psycopg2://", "postgresql://", 1)

    return dsn


# Words pool for generating realistic Lorem-ipsum style text
LOREM_WORDS = (
    "cricket football match tournament player performance analysis strategy batting bowling "
    "goal score tactical formation defense counterattack coach training fitness stamina "
    "championship league premier division statistics metrics rating substitute possession referee"
).split()


def generate_content(min_len: int = 50, max_len: int = 200) -> str:
    """Generate random text between min_len and max_len characters."""
    target_len = random.randint(min_len, max_len)
    words = []
    current_len = 0
    while current_len < target_len:
        w = random.choice(LOREM_WORDS)
        words.append(w)
        current_len += len(w) + 1
    return " ".join(words)[:target_len].capitalize() + "."


# -----------------------------------------------------------------------
# Chunk size: kitni conversations ek baar mein process karni hain.
# 10,000 conversations × avg 10 msgs × ~300 bytes ≈ ~30 MB per chunk —
# comfortable for any machine. Increase if you want fewer COPY calls.
# -----------------------------------------------------------------------
CHUNK_SIZE = 10_000


async def seed_data(count: int):
    dsn = get_db_dsn()
    print(f"Connecting to database...")

    conn = await asyncpg.connect(dsn=dsn)
    try:
        now = datetime.now(timezone.utc)
        total_messages = 0
        chunks = (count + CHUNK_SIZE - 1) // CHUNK_SIZE  # ceiling division

        print(f"Seeding {count:,} conversations in {chunks} chunk(s) of up to {CHUNK_SIZE:,} each...")
        print(f"Each conversation will have 5-15 messages (alternating user/assistant).\n")

        insert_start = time.perf_counter()

        for chunk_idx in range(chunks):
            start_num = chunk_idx * CHUNK_SIZE + 1
            end_num = min(start_num + CHUNK_SIZE - 1, count)
            chunk_count = end_num - start_num + 1

            # --- Build conversation records for this chunk ---
            conv_records = []
            conv_ids = []
            for i in range(start_num, end_num + 1):
                conv_id = uuid.uuid4()
                conv_ids.append(conv_id)
                title = f"Test Conversation #{i}"
                conv_records.append((conv_id, "loadtest-user", title, now, now))

            # --- Build message records for this chunk ---
            msg_records = []
            for conv_id in conv_ids:
                num_msgs = random.randint(5, 15)
                for m_idx in range(num_msgs):
                    msg_id = uuid.uuid4()
                    role = "user" if m_idx % 2 == 0 else "assistant"
                    content = generate_content()
                    msg_records.append((msg_id, conv_id, role, content, now))

            chunk_msgs = len(msg_records)
            total_messages += chunk_msgs

            # --- COPY conversations for this chunk ---
            await conn.copy_records_to_table(
                "conversations",
                records=conv_records,
                columns=["id", "user_id", "title", "created_at", "updated_at"]
            )

            # --- COPY messages for this chunk ---
            await conn.copy_records_to_table(
                "messages",
                records=msg_records,
                columns=["id", "conversation_id", "role", "content", "created_at"]
            )

            elapsed_so_far = time.perf_counter() - insert_start
            print(
                f"  Chunk {chunk_idx + 1}/{chunks} done — "
                f"conversations {start_num:,}–{end_num:,} "
                f"({chunk_msgs:,} messages) | "
                f"elapsed: {elapsed_so_far:.1f}s"
            )

            # Explicitly clear lists so GC can reclaim memory before next chunk
            del conv_records, conv_ids, msg_records

        end_time = time.perf_counter()
        elapsed_sec = end_time - insert_start

        print("\n" + "=" * 55)
        print("✅ Bulk Seeding Completed Successfully!")
        print(f"   • Total Conversations Inserted : {count:,}")
        print(f"   • Total Messages Inserted      : {total_messages:,}")
        print(f"   • Database Insert Time (COPY)  : {elapsed_sec:.3f} seconds")
        print(f"   • Ingestion Speed              : {(count + total_messages) / elapsed_sec:,.0f} rows/second")
        print("=" * 55 + "\n")

    finally:
        await conn.close()


def main():
    parser = argparse.ArgumentParser(description="Seed bulk load-test conversations and messages.")
    parser.add_argument(
        "--count",
        type=int,
        default=1000,
        help="Number of conversations to generate (default: 1000)"
    )
    args = parser.parse_args()
    asyncio.run(seed_data(args.count))


if __name__ == "__main__":
    main()