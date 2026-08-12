import { NodeSSH } from 'node-ssh';
import config from '../src/common/config.js';
import { logger } from '../src/common/logger.js';
import fs from 'fs';

async function testSSH() {
  const ssh = new NodeSSH();

  logger.info('--- Starting Remote Hostinger VPS SSH Connection Test ---');
  logger.info(`Target Host: ${config.ssh.host}:${config.ssh.port}`);
  logger.info(`SSH User:    ${config.ssh.user}`);
  logger.info(`Auth Method: ${config.ssh.password ? 'Password' : 'Key File (' + config.ssh.keyPath + ')'}`);

  const sshOpts = {
    host: config.ssh.host,
    port: config.ssh.port,
    username: config.ssh.user,
    readyTimeout: 10000,
  };

  if (config.ssh.password) {
    sshOpts.password = config.ssh.password;
  } else if (fs.existsSync(config.ssh.keyPath)) {
    sshOpts.privateKey = fs.readFileSync(config.ssh.keyPath, 'utf8');
  }

  try {
    logger.info('Connecting to Hostinger VPS over SSH...');
    await ssh.connect(sshOpts);

    logger.info('✓ Hostinger VPS SSH Connection Established Successfully!');

    // Check System Uptime
    const uptimeResult = await ssh.execCommand('uptime');
    logger.info(`✓ VPS System Uptime: ${uptimeResult.stdout.trim()}`);

    // Check System Kernel
    const unameResult = await ssh.execCommand('uname -a');
    logger.info(`✓ VPS Kernel Info:  ${unameResult.stdout.trim()}`);

    // Candidate log paths to test
    const candidatePaths = [
      config.ssh.logPath,
      '/var/log/syslog',
      '/var/log/messages',
      '/var/log/nginx/error.log',
    ];

    logger.info('--- Scanning Log Paths on VPS ---');
    let readablePathFound = false;

    for (const logPath of candidatePaths) {
      if (!logPath) continue;
      const res = await ssh.execCommand(`tail -n 5 ${logPath}`);
      if (res.code === 0) {
        logger.info(`✓ LOG ACCESSIBLE (${logPath}):`);
        if (res.stdout.trim()) {
          console.log(`\n--- Last 5 lines of ${logPath} ---\n${res.stdout.trim()}\n-----------------------------------`);
        } else {
          console.log(`   (File exists and readable, but currently empty)`);
        }
        readablePathFound = true;
      }
    }

    ssh.dispose();
    logger.info('--- Test Finished ---');
    process.exit(0);
  } catch (err) {
    logger.error('SSH Connection Failed:', err.message || err);
    process.exit(1);
  }
}

testSSH();
