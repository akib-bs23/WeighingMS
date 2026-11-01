/** `6 min 41 s` from a duration in milliseconds (Screen 3 summary, story 006). */
export function formatElapsed(elapsedMs: number): string {
  const totalSeconds = Math.round(elapsedMs / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes} min ${seconds} s`;
}

/** `HH:MM:SS` extracted from an ISO instant, for `"CONFIRMED HH:MM:SS"` (story 006). */
export function formatTime(iso: string): string {
  return iso.slice(11, 19);
}
