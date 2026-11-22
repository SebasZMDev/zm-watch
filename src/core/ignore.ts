export function shouldIgnore(relativePath: string, ignore: string[]): boolean {
  if (ignore.length === 0) {
    return false;
  }
  return relativePath.split(/[\\/]/).some((segment) => ignore.includes(segment));
}
