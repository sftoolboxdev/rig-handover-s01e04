export type DigestStatus = 'ok' | 'retry' | 'fail';

// One row per job in a night's run log.
export type DigestRow = {
  job: string;
  // null when the log line has no owner; views render it as "—".
  owner: string | null;
  // Number of log lines for this job.
  runs: number;
  // Number of those lines with status "retry".
  retries: number;
  lastStatus: DigestStatus;
  // Error of the last line that carried one, else null.
  lastError: string | null;
  // `at` values as written in the log (offset kept, never converted).
  firstAt: string;
  lastAt: string;
};

export type Night = {
  night: string;
  rows: DigestRow[];
  // Lines that did not parse; counted, never thrown.
  badLines: number;
};

// Reads runs/<night>.jsonl. Returns null when the file does not exist.
export type ReadNight = (runsDir: string, night: string) => Night | null;
