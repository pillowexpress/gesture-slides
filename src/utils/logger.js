// Simple logger that logs to console and appends to file via fetch to a local endpoint (fallback console-only)
export const Logger = {
  async write(file, message) {
    const line = `[${new Date().toISOString()}] ${message}`;
    console.log(line);
    try {
      await fetch(`/__log?file=${encodeURIComponent(file)}&line=${encodeURIComponent(line)}`);
    } catch (e) {
      // ignore if server route not present; console already has it
    }
  },
  build(msg) { return this.write('build-log.txt', `BUILD: ${msg}`) },
  gesture(msg) { return this.write('gesture-debug.txt', `GESTURE: ${msg}`) },
  error(msg) { return this.write('error-log.txt', `ERROR: ${msg}`) },
  display(msg) { return this.write('display-debug.txt', `DISPLAY: ${msg}`) },
};
