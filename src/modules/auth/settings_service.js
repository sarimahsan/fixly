import { AppSetting } from '../../models/AppSetting.js';
import { AuditLog } from '../../models/AuditLog.js';
import { ValidationError } from '../../common/types.js';
import { encryptValue, maskSecret } from './crypto_utils.js';
import { requireAuthenticated } from './auth_service.js';
import { requireAdmin, requireViewer } from './rbac_middleware.js';

export const SettingKey = Object.freeze({
  GIT_ACCESS_TOKEN: 'GIT_ACCESS_TOKEN',
  GITHUB_TOKEN: 'GITHUB_TOKEN',
  GIT_REPOSITORY_URL: 'GIT_REPOSITORY_URL',
  AI_PROVIDER: 'AI_PROVIDER',
  AI_MODEL: 'AI_MODEL',
  SSH_HOST: 'SSH_HOST',
  SSH_PORT: 'SSH_PORT',
  SSH_USER: 'SSH_USER',
  SSH_KEY_PATH: 'SSH_KEY_PATH'
});

const SECRET_KEYS = new Set([SettingKey.GIT_ACCESS_TOKEN, SettingKey.GITHUB_TOKEN]);
const ALLOWED_KEYS = new Set(Object.values(SettingKey));

function normalizeSettings(input) {
  const source = input?.settings && typeof input.settings === 'object' ? input.settings : input;
  const entries = Object.entries(source || {}).filter(([, value]) => value !== undefined && value !== null);
  if (!entries.length) throw new ValidationError('At least one setting must be provided');

  for (const [key] of entries) {
    if (!ALLOWED_KEYS.has(key)) throw new ValidationError(`Unsupported setting key: ${key}`);
  }
  return Object.fromEntries(entries);
}

function buildMaskedValue(key, value) {
  return SECRET_KEYS.has(key) ? maskSecret(value) : String(value);
}

export async function listSettings() {
  const settings = await AppSetting.find({}).sort({ key: 1 }).lean();
  return settings.reduce((acc, setting) => {
    acc[setting.key] = setting.maskedValue;
    return acc;
  }, {});
}

export async function updateSettings(input, user = null) {
  const settings = normalizeSettings(input);
  const updatedKeys = [];

  for (const [key, value] of Object.entries(settings)) {
    await AppSetting.findOneAndUpdate(
      { key },
      {
        key,
        valueEncrypted: encryptValue(value),
        maskedValue: buildMaskedValue(key, value)
      },
      { upsert: true, new: true, setDefaultsOnInsert: true }
    );
    updatedKeys.push(key);
  }

  await AuditLog.create({
    userId: user?.sub || user?.id || undefined,
    action: 'SETTINGS_UPDATE',
    entityType: 'AppSetting',
    entityId: 'global',
    details: { updatedKeys }
  });

  return listSettings();
}

export async function getSettingsHandler(_req, res, next) {
  try {
    return res.status(200).json(await listSettings());
  } catch (error) {
    return next(error);
  }
}

export async function putSettingsHandler(req, res, next) {
  try {
    return res.status(200).json(await updateSettings(req.body || {}, req.user));
  } catch (error) {
    return next(error);
  }
}

export function registerSettingsRoutes(app) {
  app.get('/api/settings', requireAuthenticated, requireViewer, getSettingsHandler);
  app.put('/api/settings', requireAuthenticated, requireAdmin, putSettingsHandler);
  return app;
}

export default {
  SettingKey,
  listSettings,
  updateSettings,
  getSettingsHandler,
  putSettingsHandler,
  registerSettingsRoutes
};
