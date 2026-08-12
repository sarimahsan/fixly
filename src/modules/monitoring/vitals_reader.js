import { EventEmitter } from 'node:events';
import { ServerVitals } from '../../models/ServerVitals.js';
import { validateServerVitals, WSEventType } from '../../common/types.js';

export const DEFAULT_VITALS_COMMAND = [
  "CPU=$(awk '/^cpu / { idle=$5; total=0; for (i=2; i<=NF; i++) total += $i; printf(\"%.2f\", (1-idle/total)*100) }' /proc/stat)",
  "MEM=$(free | awk '/Mem:/ { printf(\"%.2f\", $3/$2*100) }')",
  "DISK=$(df -P / | awk 'NR==2 { gsub(/%/, \"\", $5); printf(\"%.2f\", $5) }')",
  "printf '{\"cpuUsagePercent\":%s,\"memoryUsagePercent\":%s,\"diskUsagePercent\":%s}' \"$CPU\" \"$MEM\" \"$DISK\""
].join('; ');

function clampPercent(value) {
  const numeric = Number.parseFloat(value);
  if (!Number.isFinite(numeric)) return null;
  return Math.min(100, Math.max(0, Number(numeric.toFixed(2))));
}

export function parseVitalsOutput(output) {
  const text = String(output || '').trim();
  if (!text) throw new Error('Vitals output is empty');

  try {
    const parsed = JSON.parse(text);
    const vitals = {
      cpuUsagePercent: clampPercent(parsed.cpuUsagePercent ?? parsed.cpu),
      memoryUsagePercent: clampPercent(parsed.memoryUsagePercent ?? parsed.memory ?? parsed.mem),
      diskUsagePercent: clampPercent(parsed.diskUsagePercent ?? parsed.disk)
    };
    validateServerVitals(vitals);
    return vitals;
  } catch (jsonError) {
    const keyValueVitals = parseKeyValueVitals(text);
    if (keyValueVitals) return keyValueVitals;
    throw jsonError;
  }
}

export function parseKeyValueVitals(output) {
  const text = String(output || '');
  const patterns = {
    cpuUsagePercent: /(?:cpu(?:UsagePercent)?|CPU)\D+([0-9]+(?:\.[0-9]+)?)/i,
    memoryUsagePercent: /(?:mem(?:ory)?(?:UsagePercent)?|RAM)\D+([0-9]+(?:\.[0-9]+)?)/i,
    diskUsagePercent: /(?:disk(?:UsagePercent)?)\D+([0-9]+(?:\.[0-9]+)?)/i
  };

  const vitals = Object.fromEntries(Object.entries(patterns).map(([key, regex]) => [key, clampPercent(text.match(regex)?.[1])]));
  if (Object.values(vitals).some((value) => value === null)) return null;
  validateServerVitals(vitals);
  return vitals;
}

export async function readVitalsOnce(sshClient, { serverId, command = DEFAULT_VITALS_COMMAND, persist = true } = {}) {
  if (!sshClient) throw new Error('readVitalsOnce requires an sshClient');
  const result = await sshClient.exec(command);
  const vitals = {
    serverId,
    ...parseVitalsOutput(result.stdout || result.stderr || ''),
    timestamp: new Date()
  };

  if (persist && serverId) {
    await ServerVitals.create(vitals);
  }

  return vitals;
}

export class VitalsReader extends EventEmitter {
  constructor({ sshClient, serverId, command = DEFAULT_VITALS_COMMAND, intervalMs = 5000, persist = true, broadcaster = null } = {}) {
    super();
    this.sshClient = sshClient;
    this.serverId = serverId;
    this.command = command;
    this.intervalMs = intervalMs;
    this.persist = persist;
    this.broadcaster = broadcaster;
    this.timer = null;
    this.lastVitals = null;
  }

  async tick() {
    try {
      const vitals = await readVitalsOnce(this.sshClient, {
        serverId: this.serverId,
        command: this.command,
        persist: this.persist
      });
      this.lastVitals = vitals;
      this.emit('vitals', vitals);
      this.broadcaster?.broadcast?.(WSEventType.VITALS_UPDATED, {
        serverId: vitals.serverId?.toString?.() || vitals.serverId,
        cpuUsagePercent: vitals.cpuUsagePercent,
        memoryUsagePercent: vitals.memoryUsagePercent,
        diskUsagePercent: vitals.diskUsagePercent,
        timestamp: vitals.timestamp?.toISOString?.() || vitals.timestamp
      });
      return vitals;
    } catch (error) {
      this.emit('error', error);
      return null;
    }
  }

  start({ immediate = true } = {}) {
    if (this.timer) return this;
    if (immediate) void this.tick();
    this.timer = setInterval(() => void this.tick(), this.intervalMs);
    this.emit('start', { intervalMs: this.intervalMs });
    return this;
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    this.emit('stop');
  }
}

export default {
  DEFAULT_VITALS_COMMAND,
  VitalsReader,
  parseKeyValueVitals,
  parseVitalsOutput,
  readVitalsOnce
};
