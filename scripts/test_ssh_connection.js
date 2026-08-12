import { NodeSSH } from 'node-ssh';
import config from '../src/common/config.js';
import { logger } from '../src/common/logger.js';
import fs from 'fs';

async function testSSH() {
  const ssh = new NodeSSH();

  logger.info('--- Starting Remote VPS SSH Connection & Log Readability Test ---');
  logger.info(`Target Host: ${config.ssh.host}:${config.ssh.port}`);
  logger.info(`SSH User:    ${config.ssh.user}`);
  logger.info(`Key File:    ${config.ssh.keyPath}`);
  logger.info(`Configured Log Path: ${config.ssh.logPath}`);

  if (!fs.existsSync(config.ssh.keyPath)) {
    logger.error(`Local SSH key file NOT found at: ${config.ssh.keyPath}`);
    process.exit(1);
  }

  try {
    logger.info('Connecting to AWS EC2 instance over SSH...');
    await ssh.connect({
      host: config.ssh.host,
      port: config.ssh.port,
      username: config.ssh.user,
      privateKeyPath: config.ssh.keyPath,
      readyTimeout: 10000,
    });

    logger.info('✓ SSH Connection Established Successfully as ec2-user!');

    // Check System Uptime
    const uptimeResult = await ssh.execCommand('uptime');
    logger.info(`✓ VPS System Uptime: ${uptimeResult.stdout.trim()}`);

    // Check System Kernel
    const unameResult = await ssh.execCommand('uname -a');
    logger.info(`✓ VPS Kernel Info:  ${unameResult.stdout.trim()}`);

    // Candidate log paths to test
    const candidatePaths = [
      config.ssh.logPath,
      '/var/log/messages',
      '/var/log/syslog',
      '/var/log/nginx/error.log',
      '/home/ec2-user/app/logs/app.log',
      '/home/ec2-user/logs/app.log',
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
      } else {
        logger.warn(`✕ Log path (${logPath}) not readable: ${res.stderr.trim() || 'File not found / permission denied'}`);
      }
    }

    if (!readablePathFound) {
      logger.warn('No default system log files were readable without sudo permissions.');
      logger.info('Tip: You can grant read access to a log file on your EC2 by running: sudo chmod +r /var/log/messages');
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
