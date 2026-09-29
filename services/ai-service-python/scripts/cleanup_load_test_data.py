#!/usr/bin/env python3
"""
Cleanup load-test data from PostgreSQL.

Deletes all conversations (and their cascade-linked messages) where
user_id LIKE 'loadtest-user%' — covers both single-user ('loadtest-user')
and distributed-user setups ('loadtest-user-0' through 'loadtest-user-4999').
"""

import asyncio
import os
import sys
import time
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

    if dsn.startswith("postgresql+asyncpg://"):
        dsn = dsn.replace("postgresql+asyncpg://", "postgresql://", 1)
    elif dsn.startswith("postgresql+psycopg2://"):
        dsn = dsn.replace("postgresql+psycopg2://", "postgresql://", 1)

    return dsn


async def cleanup_data():
    dsn = get_db_dsn()
    print("Connecting to database...")

    conn = await asyncpg.connect(dsn=dsn)
    try:
        # LIKE 'loadtest-user%' matches:
        #   'loadtest-user'                            (old single-user data)
        #   'loadtest-user-0' .. 'loadtest-user-4999' (new distributed data)
        print("Cleaning up load-test data (user_id LIKE 'loadtest-user%')...")
        start_time = time.perf_counter()

        # Delete messages first — FK constraint (messages.conversation_id → conversations.id)
        msg_result = await conn.execute(
            """
            DELETE FROM messages
            WHERE conversation_id IN (
                SELECT id FROM conversations WHERE user_id LIKE $1
            );
            """,
            "loadtest-user%"
        )
        msgs_deleted = int(msg_result.split()[-1]) if msg_result.startswith("DELETE") else 0

        # Delete conversations for all loadtest users
        conv_result = await conn.execute(
            "DELETE FROM conversations WHERE user_id LIKE $1;",
            "loadtest-user%"
        )
        convs_deleted = int(conv_result.split()[-1]) if conv_result.startswith("DELETE") else 0

        end_time = time.perf_counter()
        elapsed_sec = end_time - start_time

        print("\n" + "=" * 50)
        print("🧹 Cleanup Completed Successfully!")
        print(f"   • Conversations Deleted : {convs_deleted:,}")
        print(f"   • Messages Deleted      : {msgs_deleted:,}")
        print(f"   • Time Taken            : {elapsed_sec:.3f} seconds")
        print("=" * 50 + "\n")

    finally:
        await conn.close()


def main():
    asyncio.run(cleanup_data())


if __name__ == "__main__":
    main()