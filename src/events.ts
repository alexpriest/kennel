// Push instead of polling: refresh while anyone listens, emit only on change.

type Listener<T> = (value: T) => void;

export class JobEvents<T> {
  private listeners = new Set<Listener<T>>();
  private timer: NodeJS.Timeout | null = null;
  private last: string | null = null;
  private lastValue: T | null = null;
  private inflight: Promise<void> | null = null;

  constructor(private load: () => Promise<T>, private opts: { intervalMs: number }) {}

  subscribe(listener: Listener<T>): () => void {
    this.listeners.add(listener);
    if (this.lastValue !== null && this.timer) listener(this.lastValue);
    if (!this.timer) {
      this.timer = setInterval(() => { void this.poke(); }, this.opts.intervalMs);
      void this.poke(true);
    }
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0 && this.timer) {
        clearInterval(this.timer);
        this.timer = null;
        this.last = null;
        this.lastValue = null;
      }
    };
  }

  /** Refresh now; emits if the list changed. */
  poke(force = false): Promise<void> {
    if (this.inflight) return this.inflight;
    this.inflight = (async () => {
      try {
        const value = await this.load();
        const serialized = JSON.stringify(value);
        if (force || serialized !== this.last) {
          this.last = serialized;
          this.lastValue = value;
          for (const listener of this.listeners) listener(value);
        }
      } catch {
        // keep the last good list; the next tick tries again
      } finally {
        this.inflight = null;
      }
    })();
    return this.inflight;
  }
}
