# Supabase Setup — report_snapshots table

Run this SQL in the Supabase dashboard (SQL Editor):
https://supabase.com/dashboard/project/sfxxjfnlsotjysphkohq/sql

```sql
CREATE TABLE IF NOT EXISTS report_snapshots (
  report_key TEXT PRIMARY KEY,
  data       JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE report_snapshots ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anon_read"   ON report_snapshots FOR SELECT USING (true);
CREATE POLICY "anon_insert" ON report_snapshots FOR INSERT WITH CHECK (true);
CREATE POLICY "anon_update" ON report_snapshots FOR UPDATE USING (true);
```

After creating the table, push the first snapshot:
```
cd C:\Users\Mouth\bscpro-scraper
node push_daily_snapshot.js
```
