import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

export type NightCounts = { ok: number; retry: number; fail: number };

// Count valid log lines per status for one night. Bad lines are skipped.
export function countNight(runsDir: string, night: string): NightCounts | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(night)) return null;
  const file = join(runsDir, `${night}.jsonl`);
  if (!existsSync(file)) return null;

  const counts: NightCounts = { ok: 0, retry: 0, fail: 0 };
  for (const text of readFileSync(file, 'utf8').split('\n')) {
    if (text.trim() === '') continue;
    let v: unknown;
    try {
      v = JSON.parse(text);
    } catch {
      continue;
    }
    if (typeof v !== 'object' || v === null) continue;
    const o = v as Record<string, unknown>;
    if (typeof o.at !== 'string' || typeof o.job !== 'string') continue;
    if (o.status === 'ok' || o.status === 'retry' || o.status === 'fail') counts[o.status]++;
  }
  return counts;
}
