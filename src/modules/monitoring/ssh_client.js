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
  const password = server.password || config.ssh.password;
  const privateKeyPath = expandHome(server.sshKeyPath || server.privateKeyPath || config.ssh.keyPath);

  if (!host) throw new ValidationError('SSH host is required');
  if (!username) throw new ValidationError('SSH username is required');

  const sshOpts = {
    host,
    port,
    username,
    readyTimeout: Number(server.readyTimeout || process.env.SSH_READY_TIMEOUT_MS || 15000)
  };

  if (password) {
    sshOpts.password = password;
  } else if (privateKeyPath) {
    const resolvedPath = expandHome(privateKeyPath);
    sshOpts.privateKeyPath = resolvedPath;
    if (fs.existsSync(resolvedPath)) {
      sshOpts.privateKey = fs.readFileSync(resolvedPath, 'utf8');
    }
  }

  return sshOpts;
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

  disconnect() {
    try {
      this.ssh.dispose();
    } catch {}
  }
}

export default {
  MonitoringSSHClient,
  assertKeyFileReadable,
  buildSSHConfig,
  expandHome
};
