export function safe(fn, context = 'unknown') {
  return async (...args) => {
    try {
      return await fn(...args);
    } catch (e) {
      console.error(`[ERROR][${context}]`, e);
      try {
        await fetch(`/__log?file=error-log.txt&line=${encodeURIComponent(`[${new Date().toISOString()}] ${context}: ${e?.stack || e}`)}`);
      } catch (_) {}
      throw e;
    }
  }
}
