import assert from 'node:assert/strict';
import config from '../src/common/config.js';

assert.ok(config.settings.encryptionKey, 'settings encryption key config should be present');
console.log('PASSED: Auth/settings config smoke test!');
