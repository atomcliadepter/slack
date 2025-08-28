// Simple in-memory cache for performance
class SimpleCache {
  private cache = new Map<string, { value: any; expires: number }>();

  set(key: string, value: any, ttlMs = 300000): void {
    this.cache.set(key, {
      value,
      expires: Date.now() + ttlMs
    });
  }

  get(key: string): any {
    const item = this.cache.get(key);
    if (!item || Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    return item.value;
  }

  clear(): void {
    this.cache.clear();
  }
}

export const cache = new SimpleCache();
