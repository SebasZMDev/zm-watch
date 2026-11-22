export class Debouncer {
  private readonly timers = new Map<string, ReturnType<typeof setTimeout>>();

  constructor(
    private readonly delayMs: number,
    private readonly onFire: (key: string) => void,
  ) {}

  push(key: string): void {
    const existing = this.timers.get(key);
    if (existing !== undefined) {
      clearTimeout(existing);
    }
    this.timers.set(
      key,
      setTimeout(() => {
        this.timers.delete(key);
        this.onFire(key);
      }, this.delayMs),
    );
  }

  dispose(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}
