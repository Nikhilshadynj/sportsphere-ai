#!/usr/bin/env python3
"""
scripts/analyze_query.py

STEP 1c — Baseline Query Analysis (EXISTING INDEXES ONLY)

Queries analyze karti hai jo /api/list aur /api/conversation/{id}/messages
endpoints use karte hain. Har query 2 baar run hoti hai — RUN 1 (cold/warm cache)
aur RUN 2 (warm cache) — taaki shared_buffers hit vs disk read ka fark dikh sake.

Usage:
    python scripts/analyze_query.py
    python scripts/analyze_query.py --user loadtest-user-99
"""

import argparse
import asyncio
import re
import sys
from pathlib import Path

SERVICE_ROOT = Path(__file__).resolve().parent.parent
if str(SERVICE_ROOT) not in sys.path:
    sys.path.insert(0, str(SERVICE_ROOT))

from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from app.models.conversation import Conversation
from app.models.message import Message
from app.core.database import DATABASE_URL


def section(title: str):
    print()
    print("=" * 70)
    print(title)
    print("=" * 70)


def extract_exec_time(rows) -> str:
    """EXPLAIN output ki last line se Execution Time parse karo."""
    for row in reversed(rows):
        line = row[0]
        if "Execution Time" in line:
            return line.strip()
    return "Execution Time: not found"


async def run_explain(db, label: str, sql: str):
    """Ek query ko 2 baar EXPLAIN (ANALYZE, BUFFERS) karo, dono ka time print karo."""
    for run_num in (1, 2):
        tag = "RUN 1 (cold/warm cache)" if run_num == 1 else "RUN 2 (warm cache)"
        result = await db.execute(text(f"EXPLAIN (ANALYZE, BUFFERS) {sql}"))
        rows = result.fetchall()
        exec_time = extract_exec_time(rows)
        print(f"\n  [{label} — {tag}]")
        for row in rows:
            print(f"    {row[0]}")
        print(f"  → {exec_time}")


async def analyze(user_id: str):
    engine = create_async_engine(DATABASE_URL, echo=False)
    SessionLocal = async_sessionmaker(bind=engine, class_=AsyncSession, expire_on_commit=False)

    async with SessionLocal() as db:

        # ================================================================
        # QUERY 1: /api/list — all conversations for user, no limit
        # ================================================================
        section(f"QUERY 1 — /api/list  (user='{user_id}', ORDER BY updated_at DESC, no LIMIT)")

        q1 = (
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
        )
        compiled_q1 = str(q1.compile(dialect=engine.dialect, compile_kwargs={"literal_binds": True}))
        print(f"\n[Compiled SQL]\n{compiled_q1}")
        await run_explain(db, "Q1", compiled_q1)

        # ================================================================
        # QUERY 1b: /api/list — same + LIMIT 20  (real pagination scenario)
        # ================================================================
        section(f"QUERY 1b — /api/list + LIMIT 20  (user='{user_id}', ORDER BY updated_at DESC)")

        q1b = (
            select(Conversation)
            .where(Conversation.user_id == user_id)
            .order_by(Conversation.updated_at.desc())
            .limit(20)
        )
        compiled_q1b = str(q1b.compile(dialect=engine.dialect, compile_kwargs={"literal_binds": True}))
        print(f"\n[Compiled SQL]\n{compiled_q1b}")
        await run_explain(db, "Q1b", compiled_q1b)

        # ================================================================
        # Sample ek conversation id from this user
        # ================================================================
        rand_row = await db.execute(
            text("SELECT id FROM conversations WHERE user_id = :uid LIMIT 1"),
            {"uid": user_id}
        )
        sample_conv_id = rand_row.scalar_one_or_none()
        if sample_conv_id is None:
            print(f"\n⚠️  user_id='{user_id}' ke liye koi conversation nahi mili. --user argument check karo.")
            await engine.dispose()
            return

        # ================================================================
        # QUERY 2: messages for that conversation, ORDER BY created_at ASC
        # ================================================================
        section(f"QUERY 2 — /api/conversation/{{id}}/messages  (conversation_id={sample_conv_id}, ASC, no LIMIT)")

        q2 = (
            select(Message)
            .where(Message.conversation_id == sample_conv_id)
            .order_by(Message.created_at.asc())
        )
        compiled_q2 = str(q2.compile(dialect=engine.dialect, compile_kwargs={"literal_binds": True}))
        print(f"\n[Compiled SQL]\n{compiled_q2}")
        await run_explain(db, "Q2", compiled_q2)

        # ================================================================
        # QUERY 2b: messages, ORDER BY created_at DESC + LIMIT 50
        # ================================================================
        section(f"QUERY 2b — messages  (conversation_id={sample_conv_id}, DESC, LIMIT 50)")

        q2b = (
            select(Message)
            .where(Message.conversation_id == sample_conv_id)
            .order_by(Message.created_at.desc())
            .limit(50)
        )
        compiled_q2b = str(q2b.compile(dialect=engine.dialect, compile_kwargs={"literal_binds": True}))
        print(f"\n[Compiled SQL]\n{compiled_q2b}")
        await run_explain(db, "Q2b", compiled_q2b)

        # ================================================================
        # EXISTING INDEXES
        # ================================================================
        section("EXISTING INDEXES — conversations + messages tables")

        idx_result = await db.execute(text("""
            SELECT tablename, indexname, indexdef
            FROM pg_indexes
            WHERE tablename IN ('conversations', 'messages')
            ORDER BY tablename, indexname;
        """))
        print()
        for tablename, indexname, indexdef in idx_result.fetchall():
            print(f"  [{tablename}]  {indexname}")
            print(f"      {indexdef}")
            print()

        # ================================================================
        # BASELINE FOOTER
        # ================================================================
        section("⚠️  BASELINE — EXISTING INDEXES ONLY")
        print()
        print(f"  Analyzed user: '{user_id}'")
        print()
        print("  Jo indexes abhi hain:")
        print("    • ix_conversations_user_id   (single-column, no sort order)")
        print("    • ix_messages_conversation_id (single-column, no sort order)")
        print()
        print("  Step 3 me ye add honge:")
        print("    • 3a: composite (user_id, updated_at DESC) on conversations")
        print("    • 3b: composite (conversation_id, created_at) on messages")
        print()
        print("  RUN 1 vs RUN 2 comparison karo — agar RUN 2 kaafi faster hai")
        print("  toh shared_buffers caching ka effect dikh raha hai.")
        print()
        print("  Is output ko Step 4 ke output se compare karo — scan type,")
        print("  BUFFERS (shared hit vs read), aur Execution Time dekho.")
        print("=" * 70)

    await engine.dispose()


def main():
    parser = argparse.ArgumentParser(description="Baseline query EXPLAIN analysis for load-test data.")
    parser.add_argument(
        "--user",
        type=str,
        default="loadtest-user-42",
        help="user_id to filter conversations by (default: loadtest-user-42)"
    )
    args = parser.parse_args()
    asyncio.run(analyze(args.user))


if __name__ == "__main__":
    main()
