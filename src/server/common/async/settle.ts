/**
 * Runs a synchronous Dummy call and exposes it as a Promise, as a real network adapter would.
 * Thrown errors become rejections unchanged.
 */
export function settle<T>(fn: () => T): Promise<T> {
  try {
    return Promise.resolve(fn());
  } catch (e) {
    return Promise.reject(e instanceof Error ? e : new Error(String(e)));
  }
}
