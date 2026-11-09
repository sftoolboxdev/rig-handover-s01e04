import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

let app: ReturnType<typeof createApp>;

beforeAll(() => {
  const dir = mkdtempSync(join(tmpdir(), 'rig-runs-'));
  writeFileSync(
    join(dir, '2026-01-01.jsonl'),
    [
      '{"at":"2026-01-01T01:00:00+01:00","job":"b/job","status":"ok","owner":"rook"}',
      '{"at":"2026-01-01T02:00:00+01:00","job":"a/job","status":"fail","owner":null,"error":"boom"}',
      'not json',
    ].join('\n') + '\n',
  );
  writeFileSync(join(dir, '2026-01-02.jsonl'), '');
  app = createApp({ adapter: 'shim', installed: '2026-10-29T14:06:00+01:00', beatEverySeconds: 60, runsDir: dir });
});

describe('GET /digest/:night', () => {
  it('200 with rows sorted by job, bad line noted, null owner as —', async () => {
    const res = await app.request('/digest/2026-01-01');
    const html = await res.text();
    expect(res.status).toBe(200);
    expect(html.indexOf('a/job')).toBeLessThan(html.indexOf('b/job'));
    expect(html).toContain('1 bad line skipped');
    expect(html).toContain('—');
  });
  it('404 for a night with no file', async () => {
    expect((await app.request('/digest/2026-02-02')).status).toBe(404);
  });
  it('empty night renders "nothing ran"', async () => {
    const res = await app.request('/digest/2026-01-02');
    expect(res.status).toBe(200);
    expect(await res.text()).toContain('nothing ran');
  });
});

describe('GET /api/digest/:night', () => {
  it('200 with the same jobs in the same order, and the bad-line count', async () => {
    const res = await app.request('/api/digest/2026-01-01');
    const body = (await res.json()) as { badLines: number; rows: { job: string }[] };
    expect(res.status).toBe(200);
    expect(body.rows.map((r) => r.job)).toEqual(['a/job', 'b/job']);
    expect(body.badLines).toBe(1);
  });
  it('404 for a night with no file', async () => {
    expect((await app.request('/api/digest/2026-02-02')).status).toBe(404);
  });
  it('empty night returns no rows', async () => {
    const body = (await (await app.request('/api/digest/2026-01-02')).json()) as { rows: unknown[] };
    expect(body.rows).toEqual([]);
  });
  it('page and JSON agree on 2026-10-28', async () => {
    const real = createApp({ adapter: 'shim', installed: 'x', beatEverySeconds: 60, runsDir: 'runs' });
    const html = await (await real.request('/digest/2026-10-28')).text();
    const body = (await (await real.request('/api/digest/2026-10-28')).json()) as { rows: { job: string }[] };
    const jobs = body.rows.map((r) => r.job);
    const pos = jobs.map((j) => html.indexOf(`<td>${j}</td>`));
    expect(pos.every((p) => p > -1)).toBe(true);
    expect([...pos].sort((a, b) => a - b)).toEqual(pos);
  });
});
