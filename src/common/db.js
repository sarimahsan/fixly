import mysql from 'mysql2/promise';
import { config } from './config.js';
import { logger } from './logger.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let pool = null;

/**
 * Get active MySQL connection pool
 */
export function getPool() {
  if (!pool) {
    pool = mysql.createPool({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      database: config.mysql.database,
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      multipleStatements: true,
    });
  }
  return pool;
}

/**
 * Initialize Database & Tables (Auto-bootstrapping for MySQL & phpMyAdmin)
 */
export async function initDatabase() {
  try {
    logger.info(`Connecting to MySQL host at ${config.mysql.host}:${config.mysql.port}...`);
    
    // Step 1: Connect to server without database selected to ensure DB exists
    const rootConn = await mysql.createConnection({
      host: config.mysql.host,
      port: config.mysql.port,
      user: config.mysql.user,
      password: config.mysql.password,
      multipleStatements: true,
    });

    await rootConn.query(`CREATE DATABASE IF NOT EXISTS \`${config.mysql.database}\` DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`);
    await rootConn.end();
    logger.info(`Database '${config.mysql.database}' confirmed/created.`);

    // Step 2: Initialize connection pool with database
    const dbPool = getPool();

    // Step 3: Load and execute init SQL script
    const sqlPath = path.resolve(__dirname, '../../scripts/init_mysql.sql');
    if (fs.existsSync(sqlPath)) {
      const sqlContent = fs.readFileSync(sqlPath, 'utf8');
      await dbPool.query(sqlContent);
      logger.info('MySQL tables and seed records initialized successfully from init_mysql.sql.');
    } else {
      logger.warn(`SQL init file not found at ${sqlPath}. Skipping SQL script execution.`);
    }

    // Step 4: Auto-migrate existing tables if missing new columns
    try {
      const [cols] = await dbPool.query("SHOW COLUMNS FROM `users` LIKE 'two_factor_secret';");
      if (cols.length === 0) {
        await dbPool.query("ALTER TABLE `users` ADD COLUMN `two_factor_secret` VARCHAR(255) NULL AFTER `api_token`;");
        logger.info("Auto-migration: Added 'two_factor_secret' column to `users` table.");
      }
    } catch (migErr) {
      logger.warn(`Auto-migration check (two_factor_secret): ${migErr.message}`);
    }

    try {
      const [cols] = await dbPool.query("SHOW COLUMNS FROM `users` LIKE 'two_factor_enabled';");
      if (cols.length === 0) {
        await dbPool.query("ALTER TABLE `users` ADD COLUMN `two_factor_enabled` BOOLEAN NOT NULL DEFAULT FALSE AFTER `two_factor_secret`;");
        logger.info("Auto-migration: Added 'two_factor_enabled' column to `users` table.");
      }
    } catch (migErr) {
      logger.warn(`Auto-migration check (two_factor_enabled): ${migErr.message}`);
    }

    return true;
  } catch (err) {
    logger.error('Failed to initialize MySQL Database:', err.message);
    throw err;
  }
}

export default { getPool, initDatabase };
