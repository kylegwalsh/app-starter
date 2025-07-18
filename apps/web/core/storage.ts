/** The type safe storage options available */
type StorageKey = 'sessionExisted';

/** An interface to interact with our underlying storage mechanism (localStorage on web) */
export const storage = {
  /** Write an item to our storage */
  set: (key: StorageKey, value: string) => {
    localStorage?.setItem?.(key, value);
  },
  /** Retrieve an item from our storage */
  get: (key: StorageKey) => {
    return localStorage?.getItem?.(key);
  },
  /** Delete an item from our storage */
  delete: (key: StorageKey) => {
    localStorage?.removeItem?.(key);
  },
  /** Clear the storage */
  clear: () => {
    localStorage?.clear?.();
  },
};
