export class TabOrder {
  private keys: string[] = [];

  touch(key: string): void {
    this.keys = this.keys.filter((k) => k !== key);
    this.keys.push(key);
  }

  prune(open: Set<string>): void {
    this.keys = this.keys.filter((k) => open.has(k));
  }

  overflow(max: number): string[] {
    return this.keys.splice(0, Math.max(0, this.keys.length - max));
  }
}
