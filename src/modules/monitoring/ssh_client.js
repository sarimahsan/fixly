import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { NodeSSH } from 'node-ssh';
import config from '../../common/config.js';
import logger from '../../common/logger.js';
import { SSHConnectionError, ValidationError } from '../../common/types.js';

export function expandHome(inputPath) {
  if (!inputPath || typeof inputPath !== 'string') return inputPath;
  if (inputPath === '~') return os.homedir();
  if (inputPath.startsWith('~/')) return path.join(os.homedir(), inputPath.slice(2));
  return inputPath;
}

export function buildSSHConfig(server = {}) {
  const host = server.host || config.ssh.host;
  const username = server.sshUser || server.username || server.user || config.ssh.user;
  const port = Number(server.port || config.ssh.port || 22);
  const privateKeyPath = expandHome(server.sshKeyPath || server.privateKeyPath || config.ssh.keyPath);

  if (!host) throw new ValidationError('SSH host is required');
  if (!username) throw new ValidationError('SSH username is required');
  if (!privateKeyPath) throw new ValidationError('SSH private key path is required');

  return {
    host,
    port,
    username,
    privateKeyPath,
    readyTimeout: Number(server.readyTimeout || process.env.SSH_READY_TIMEOUT_MS || 15000)
  };
}

export function assertKeyFileReadable(privateKeyPath) {
  const resolved = expandHome(privateKeyPath);
  try {
    fs.accessSync(resolved, fs.constants.R_OK);
  } catch (error) {
    throw new SSHConnectionError(`SSH private key is not readable: ${resolved}`, { cause: error.message });
  }
  return resolved;
}

export class MonitoringSSHClient {
  constructor({ ssh = new NodeSSH(), checkKeyFile = true } = {}) {
    this.ssh = ssh;
    this.checkKeyFile = checkKeyFile;
    this.connectionConfig = null;
  }

  async connect(server = {}) {
    const sshConfig = buildSSHConfig(server);
    if (this.checkKeyFile) assertKeyFileReadable(sshConfig.privateKeyPath);

    try {
      await this.ssh.connect(sshConfig);
      this.connectionConfig = sshConfig;
      logger.info('SSH monitoring connection established', {
        host: sshConfig.host,
        port: sshConfig.port,
        username: sshConfig.username
      });
      return this;
    } catch (error) {
      throw new SSHConnectionError('Failed to connect to monitored server via SSH', {
        host: sshConfig.host,
        port: sshConfig.port,
        cause: error.message
      });
    }
  }

  async exec(command, options = {}) {
    if (!command || typeof command !== 'string') {
      throw new ValidationError('SSH command must be a non-empty string');
    }

    try {
      const result = await this.ssh.execCommand(command, options);
      if (result.code && result.code !== 0) {
        logger.warn('SSH command returned a non-zero status', { command, code: result.code, stderr: result.stderr });
      }
      return result;
    } catch (error) {
      throw new SSHConnectionError('SSH command execution failed', { command, cause: error.message });
    }
  }

  async streamCommand(command, handlers = {}) {
    if (!command || typeof command !== 'string') {
      throw new ValidationError('SSH stream command must be a non-empty string');
    }

    const connection = this.ssh.connection || this.ssh.getConnection?.();
    if (!connection || typeof connection.exec !== 'function') {
      throw new SSHConnectionError('Active SSH connection does not support streaming exec');
    }

    return new Promise((resolve, reject) => {
      connection.exec(command, (error, stream) => {
        if (error) return reject(new SSHConnectionError('SSH stream command failed to start', { command, cause: error.message }));

        stream.on('data', (chunk) => handlers.onStdout?.(chunk.toString('utf8')));
        stream.stderr?.on('data', (chunk) => handlers.onStderr?.(chunk.toString('utf8')));
        stream.on('close', (code, signal) => handlers.onClose?.(code, signal));
        stream.on('error', (streamError) => handlers.onError?.(streamError));
        return resolve(stream);
      });
    });
  }

  dispose() {
    try {
      this.ssh.dispose?.();
    } finally {
      this.connectionConfig = null;
    }
  }
}

export async function createSSHClient(server, options = {}) {
  const client = new MonitoringSSHClient(options);
  return client.connect(server);
}

export default {
  MonitoringSSHClient,
  assertKeyFileReadable,
  buildSSHConfig,
  createSSHClient,
  expandHome
};
