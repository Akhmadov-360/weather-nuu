export type ProgressStore = {
  get(): string;
  set(text: string): void;
  /** For `useSyncExternalStore`; returns the function that unsubscribes. */
  subscribe(listener: () => void): () => void;
};

/**
 * The text of a running download ("3,2 MB / 12,0 MB"). A toast cannot be updated once it is shown, so its
 * body reads the text from here and redraws itself when the download moves on.
 */
export function createProgressStore(initial: string): ProgressStore {
  let text = initial;
  const listeners = new Set<() => void>();
  return {
    get: () => text,
    set(next) {
      if (next === text) return;
      text = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => void listeners.delete(listener);
    },
  };
}
