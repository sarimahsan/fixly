import assert from 'node:assert/strict';
import { encryptValue, decryptValue, maskSecret } from '../src/modules/auth/crypto_utils.js';
import { SettingKey, updateSettings, listSettings } from '../src/modules/auth/settings_service.js';
import { AppSetting } from '../src/models/AppSetting.js';
import { AuditLog } from '../src/models/AuditLog.js';
import { UserRole, ValidationError } from '../src/common/types.js';

console.log('--- Running Phase 1.3 Unit Tests (Settings Service) ---');

const secret = 'ghp_abcdefghijklmnopqrstuvwxyz123456';
const encrypted = encryptValue(secret);
assert.notEqual(encrypted, secret);
assert.ok(encrypted.startsWith('v1:'));
assert.equal(decryptValue(encrypted), secret);
assert.equal(maskSecret(secret), 'ghp_****3456');
console.log('✓ AES-GCM encryption, decryption, and masking verified.');

const store = new Map();
const audits = [];

const originalFind = AppSetting.find;
const originalFindOneAndUpdate = AppSetting.findOneAndUpdate;
const originalCreate = AuditLog.create;

AppSetting.find = () => ({
  sort: () => ({
    lean: async () => Array.from(store.values()).sort((a, b) => a.key.localeCompare(b.key))
  })
});

AppSetting.findOneAndUpdate = async (query, update) => {
  const record = { key: query.key, ...update };
  store.set(query.key, record);
  return record;
};

AuditLog.create = async (entry) => {
  audits.push(entry);
  return entry;
};

try {
  const result = await updateSettings({
    [SettingKey.GIT_ACCESS_TOKEN]: secret,
    [SettingKey.AI_PROVIDER]: 'GROQ'
  }, { sub: '507f1f77bcf86cd799439011', role: UserRole.ADMIN });

  assert.equal(result.GIT_ACCESS_TOKEN, 'ghp_****3456');
  assert.equal(result.AI_PROVIDER, 'GROQ');
  assert.notEqual(store.get(SettingKey.GIT_ACCESS_TOKEN).valueEncrypted, secret);
  assert.equal(decryptValue(store.get(SettingKey.GIT_ACCESS_TOKEN).valueEncrypted), secret);
  assert.equal(audits.length, 1);
  assert.deepEqual(audits[0].details.updatedKeys.sort(), [SettingKey.AI_PROVIDER, SettingKey.GIT_ACCESS_TOKEN].sort());

  const listed = await listSettings();
  assert.deepEqual(listed, result);
  await assert.rejects(() => updateSettings({ NOT_ALLOWED: 'x' }), ValidationError);
  console.log('✓ Settings persistence contract, masked output, and audit log verified.');
} finally {
  AppSetting.find = originalFind;
  AppSetting.findOneAndUpdate = originalFindOneAndUpdate;
  AuditLog.create = originalCreate;
}

console.log('PASSED: Phase 1.3 Settings Service Test Suite!');
