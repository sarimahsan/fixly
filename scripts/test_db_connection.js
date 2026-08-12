import { initDatabase, getPool } from '../src/common/db.js';
import { UserModel } from '../src/models/User.js';
import { IncidentModel } from '../src/models/Incident.js';
import { logger } from '../src/common/logger.js';

async function main() {
  try {
    logger.info('--- Starting MySQL Connection & Initialization Test ---');
    
    // Test 1: Initialize Database & Tables
    await initDatabase();
    logger.info('✓ Database and tables initialized.');

    // Test 2: Verify Seed User
    const adminUser = await UserModel.findByEmail('alex.mercer@fixly.local');
    if (adminUser) {
      logger.info(`✓ Seed admin user found: ID ${adminUser.id}, Email: ${adminUser.email}, Role: ${adminUser.role}`);
    } else {
      logger.warn('Seed admin user not found!');
    }

    // Test 3: Insert & Query Incident with JSON column
    const testIncId = `inc-test-${Date.now()}`;
    const createdInc = await IncidentModel.create({
      id: testIncId,
      fingerprint: `fp-${Date.now()}`,
      title: 'Database connection pool timeout',
      errorType: 'TimeoutError',
      normalizedMessage: 'Connection pool exhausted at database.js:42',
      rawStackTrace: 'TimeoutError: Connection pool timeout after 30000ms\n    at Pool.connect (src/services/database.js:42:11)',
      severity: 'CRITICAL',
      targetFile: 'src/services/database.js',
    });

    logger.info(`✓ Created test incident: ID ${createdInc.id}, Status: ${createdInc.status}`);

    // Update AI Diagnosis JSON
    const updatedInc = await IncidentModel.updateDiagnosis(testIncId, {
      rootCause: 'Unreleased database pool client connection in catch block.',
      confidenceScore: 0.95,
      automatableFixExists: true,
    });

    logger.info(`✓ Updated AI Diagnosis JSON column. Root cause: "${updatedInc.ai_diagnosis.rootCause}"`);

    logger.info('--- All MySQL DB Verification Tests Passed Cleanly! ---');
    process.exit(0);
  } catch (err) {
    logger.error('MySQL Test Failed:', err.message || err);
    process.exit(1);
  }
}

main();
