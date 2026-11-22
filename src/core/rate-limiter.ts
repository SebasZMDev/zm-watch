export class RateLimiter {
  private stamps: number[] = [];

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  tryAcquire(now: number): boolean {
    this.stamps = this.stamps.filter((t) => now - t < this.windowMs);
    if (this.stamps.length >= this.max) {
      return false;
    }
    this.stamps.push(now);
    return true;
  }
}
