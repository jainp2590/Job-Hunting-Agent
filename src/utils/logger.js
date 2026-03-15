const LOG_LEVELS = { debug: 0, info: 1, warn: 2, error: 3 };
const current_level =
  LOG_LEVELS[process.env.LOG_LEVEL || "info"] ?? LOG_LEVELS.info;

function timestamp() {
  return new Date().toISOString();
}

function log(level, ...args) {
  if (LOG_LEVELS[level] < current_level) {
    return;
  }
  const prefix = `[${timestamp()}] [${level.toUpperCase()}]`;
  const out = level === "debug" ? console.log : console[level];
  out(prefix, ...args);
  if (level === "error") {
    const err = args.find((a) => a instanceof Error);
    if (err && err.stack) {
      console.error(err.stack);
    }
  }
}

const logger = {
  debug(...args) {
    log("debug", ...args);
  },
  info(...args) {
    log("info", ...args);
  },
  warn(...args) {
    log("warn", ...args);
  },
  error(...args) {
    log("error", ...args);
  },
};

module.exports = logger;
