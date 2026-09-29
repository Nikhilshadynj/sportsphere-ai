# LEARNING_NOTES.md
Concepts learned through actually implementing things in this project — not
general theory dumps. Add an entry after a concept was taught and used, not
before. Keep entries short: what the problem was, what the concept is, how
it was used here.

Format per entry:
```
## <Concept>
**Problem it solves here:**
**Core idea:**
**Where used in this project:**
**Trade-offs / production considerations:**
```

## Database Indexing — Seq Scan vs Index Scan

**Problem it solves here:**
Jab `/api/list` endpoint user ki conversations fetch karta hai (`SELECT * FROM conversations WHERE user_id = :uid ORDER BY updated_at DESC`), bina index ke PostgreSQL ko poori table row-by-row scan karni padti hai (**Sequential Scan**). 150,000 conversations aur ~1.5M messages ke dataset pe har request ~32–36ms le rahi thi, jo high concurrent traffic me DB CPU ko saturate kar deta hai.

**Core idea:**
PostgreSQL B-Tree index ek sorted lookup tree banata hai jo `O(log N)` time me matching rows ke pointers (TIDs) dhoondh leta hai, full table scan avoid karke (**Bitmap Index Scan / Index Scan**).

- **Practical Test & Numbers (Verified):**
  - Dataset: 150,000 conversations distributed across 5,000 users (`loadtest-user-0` se `loadtest-user-4999`), ~30 conversations per user.
  - Test Target: `loadtest-user-99` (30 rows).
  - **With Index (`ix_conversations_user_id`):** ~0.3ms – 1.9ms (Index Scan / Bitmap Index Scan).
  - **Without Index (Index dropped):** ~32ms – 36ms (Seq Scan across all 150,000 rows).
  - **Result:** ~100x query speedup with a single-column index.

- **Selectivity Concept:**
  Index tabhi kaam karta hai jab query **selective** ho (e.g., 30 rows / 150,000 = ~0.02% table). Jab selectivity bohot low hoti hai (e.g. pehle test me saari 1.5L rows ek hi user ki thi — 100% table match), tab PostgreSQL planner index ko ignore karke Seq Scan choose karta hai kyunki 100% rows index tree se dhoondh kar heap pe jump karna random I/O overhead badha deta hai.

- **Index Types & Concepts:**
  - **Single-column index:** Ek specific column pe B-Tree index (e.g. `conversations.user_id`). Filtering fast karta hai, lekin sort order (`updated_at`) ko optimize nahi karta — separate Sort step lagta hai.
  - **Composite index & Leftmost-prefix rule:** Multiple columns ka combined index (e.g. `(user_id, updated_at DESC)`). Filter aur Order dono index level pe satisfy ho jaate hain (no sort step). *Leftmost-prefix rule:* Query me leftmost column(s) ka filter hona zaroori hai tabhi index use hoga (sirf `updated_at` pe query karoge toh composite index use nahi hoga).
  - **Unique index:** Guarantees uniqueness across column values while speeding up lookups. PostgreSQL automatically creates this for `PRIMARY KEY` and `UNIQUE` constraints.
  - **Covering index / Index-Only Scan:** Agar SELECT me maange gaye saare columns index ke andar hi available hon (via composite columns ya `INCLUDE`), toh engine ko actual table heap read hi nahi karna padta, seedha index se response de deta hai.
  - **Partial index:** Conditional index (e.g. `CREATE INDEX ... WHERE is_active = true`). Sirf matching subset rows index hoti hain, jisse index size chhota rehta hai aur write penalty kam hoti hai.

- **Status on Composite Index:**
  - Composite index `(user_id, updated_at DESC)` abhi test **NAHI** hua hai (**TODO baad me**). Abhi sirf single-column `user_id` index benchmark hua hai.

**Where used in this project:**
`ix_conversations_user_id` on `conversations(user_id)` aur `ix_messages_conversation_id` on `messages(conversation_id)`.

**Trade-offs / production considerations:**
- **Write amplification:** Har `INSERT`, `UPDATE`, ya `DELETE` pe index tree ko bhi rebalance/update karna padta hai. Zyada indexes write throughput gira dete hain.
- **Storage & Memory footprint:** Har index RAM (`shared_buffers`) me space leta hai. Redundant indexes (jaise PK pe duplicate index) dead weight hote hain.
- **Maintenance:** High churn tables pe index bloat hota hai, periodic `REINDEX` ya autovacuum tuning zaroori hoti hai.
