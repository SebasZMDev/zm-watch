export interface SnapshotLimits {
  maxFiles: number;
  maxBytes: number;
}

const DEFAULT_LIMITS: SnapshotLimits = { maxFiles: 2000, maxBytes: 20 * 1024 * 1024 };

export class SnapshotStore {
  private readonly entries = new Map<string, string>();
  private totalBytes = 0;

  constructor(private readonly limits: SnapshotLimits = DEFAULT_LIMITS) {}

  get size(): number {
    return this.entries.size;
  }

  get bytes(): number {
    return this.totalBytes;
  }

  get(path: string): string | undefined {
    const content = this.entries.get(path);
    if (content === undefined) {
      return undefined;
    }
    this.entries.delete(path);
    this.entries.set(path, content);
    return content;
  }

  set(path: string, content: string): void {
    this.delete(path);
    const size = Buffer.byteLength(content);
    if (size > this.limits.maxBytes) {
      return;
    }
    this.entries.set(path, content);
    this.totalBytes += size;
    while (this.entries.size > this.limits.maxFiles || this.totalBytes > this.limits.maxBytes) {
      const oldest = this.entries.keys().next().value as string;
      this.delete(oldest);
    }
  }

  delete(path: string): void {
    const content = this.entries.get(path);
    if (content === undefined) {
      return;
    }
    this.totalBytes -= Buffer.byteLength(content);
    this.entries.delete(path);
  }
}
