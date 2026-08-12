import { EventEmitter } from 'node:events';
import { IncidentSeverity } from '../../common/types.js';

const ERROR_LEVEL_PATTERN = /\b(error|fatal|critical|exception|unhandled|traceback|panic)\b/i;
const STACK_LOCATION_PATTERN = /\s+at\s+.*\(?[^\s()]+:\d+:\d+\)?/g;
const ISO_DATE_PATTERN = /\b\d{4}-\d{2}-\d{2}[T\s]\d{2}:\d{2}:\d{2}(?:\.\d+)?Z?\b/g;
const SYSLOG_DATE_PATTERN = /\b(?:Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2}\s+\d{2}:\d{2}:\d{2}\b/g;
const UUID_PATTERN = /\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi;
const HEX_PATTERN = /\b0x[0-9a-f]+\b/gi;
const NUMBER_PATTERN = /\b\d+\b/g;

export function isErrorLogLine(line) {
  return typeof line === 'string' && ERROR_LEVEL_PATTERN.test(line);
}

export function inferErrorType(line) {
  if (!line) return 'UnknownError';
  const namedError = line.match(/\b([A-Z][A-Za-z0-9_]*(?:Error|Exception))\b/);
  if (namedError) return namedError[1];
  const level = line.match(/\b(CRITICAL|FATAL|ERROR|WARN(?:ING)?|PANIC)\b/i);
  if (level) return level[1].toUpperCase();
  return 'UnknownError';
}

export function normalizeLogMessage(line) {
  return String(line || '')
    .replace(ISO_DATE_PATTERN, '<timestamp>')
    .replace(SYSLOG_DATE_PATTERN, '<timestamp>')
    .replace(STACK_LOCATION_PATTERN, ' at <stack-location>')
    .replace(UUID_PATTERN, '<uuid>')
    .replace(HEX_PATTERN, '<hex>')
    .replace(NUMBER_PATTERN, '<num>')
    .replace(/\s+/g, ' ')
    .trim();
}

export function inferSeverity(line) {
  const source = String(line || '').toLowerCase();
  if (/\b(critical|fatal|panic|out of memory|oom|segmentation fault)\b/.test(source)) return IncidentSeverity.CRITICAL;
  if (/\b(unhandled|uncaught|exception|timeout|connection refused|database|db)\b/.test(source)) return IncidentSeverity.HIGH;
  if (/\b(error|failed|failure)\b/.test(source)) return IncidentSeverity.MEDIUM;
  return IncidentSeverity.LOW;
}

export function parseLogLine(line, context = {}) {
  if (!isErrorLogLine(line)) return null;
  const rawLogLine = String(line).trim();
  const errorType = inferErrorType(rawLogLine);
  const normalizedMessage = normalizeLogMessage(rawLogLine);
  return {
    rawLogLine,
    errorType,
    normalizedMessage,
    title: `${errorType}: ${normalizedMessage}`.slice(0, 180),
    severity: inferSeverity(rawLogLine),
    timestamp: context.timestamp || new Date(),
    serverId: context.serverId,
    rawStackTrace: context.rawStackTrace
  };
}

export class LogReader extends EventEmitter {
  constructor({ sshClient, logPath = process.env.MONITOR_LOG_PATH || '/var/log/syslog', command, serverId } = {}) {
    super();
    this.sshClient = sshClient;
    this.logPath = logPath;
    this.command = command || `tail -n 0 -F ${shellQuote(logPath)}`;
    this.serverId = serverId;
    this.buffer = '';
    this.stream = null;
    this.running = false;
  }

  async start() {
    if (!this.sshClient) throw new Error('LogReader requires an sshClient');
    if (this.running) return this;
    this.running = true;
    this.stream = await this.sshClient.streamCommand(this.command, {
      onStdout: (chunk) => this.consume(chunk),
      onStderr: (chunk) => this.emit('stderr', chunk),
      onError: (error) => this.emit('error', error),
      onClose: (code, signal) => {
        this.running = false;
        this.emit('close', { code, signal });
      }
    });
    this.emit('start', { command: this.command });
    return this;
  }

  consume(chunk) {
    this.buffer += chunk;
    const lines = this.buffer.split(/\r?\n/);
    this.buffer = lines.pop() || '';
    for (const line of lines) this.handleLine(line);
  }

  handleLine(line) {
    const parsed = parseLogLine(line, { serverId: this.serverId });
    if (!parsed) return;
    this.emit('error-log', parsed);
  }

  stop() {
    this.running = false;
    if (this.stream?.close) this.stream.close();
    if (this.stream?.destroy) this.stream.destroy();
    this.emit('stop');
  }
}

function shellQuote(value) {
  return `'${String(value).replace(/'/g, `'\\''`)}'`;
}

export default {
  LogReader,
  inferErrorType,
  inferSeverity,
  isErrorLogLine,
  normalizeLogMessage,
  parseLogLine
};
