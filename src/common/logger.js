import config from './config.js';

const LOG_LEVELS = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3
};

const currentLevel = config.env === 'test' ? 'error' : (process.env.LOG_LEVEL || 'info');

function formatMessage(level, message, meta = {}) {
  const timestamp = new Date().toISOString();
  const metaStr = Object.keys(meta).length ? ` ${JSON.stringify(meta)}` : '';
  return `[${timestamp}] [${level.toUpperCase()}] ${message}${metaStr}`;
}

export const logger = {
  debug(message, meta) {
    if (LOG_LEVELS.debug >= LOG_LEVELS[currentLevel]) {
      console.debug(formatMessage('debug', message, meta));
    }
  },
  info(message, meta) {
    if (LOG_LEVELS.info >= LOG_LEVELS[currentLevel]) {
      console.log(formatMessage('info', message, meta));
    }
  },
  warn(message, meta) {
    if (LOG_LEVELS.warn >= LOG_LEVELS[currentLevel]) {
      console.warn(formatMessage('warn', message, meta));
    }
  },
  error(message, meta) {
    if (LOG_LEVELS.error >= LOG_LEVELS[currentLevel]) {
      console.error(formatMessage('error', message, meta));
    }
  }
};

export default logger;
