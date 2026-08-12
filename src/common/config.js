import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load .env file from project root if present
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  env: process.env.NODE_ENV || 'development',
  port: parseInt(process.env.PORT || '3000', 10),
  mongodb: {
    uri: process.env.MONGODB_URI || 'mongodb://localhost:27017/fixly',
    options: {}
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'fixly-default-dev-secret-change-in-production',
    expiresIn: process.env.JWT_EXPIRES_IN || '24h'
  },
  settings: {
    encryptionKey: process.env.SETTINGS_ENCRYPTION_KEY || process.env.JWT_SECRET || 'fixly-default-dev-secret-change-in-production'
  },
  ssh: {
    host: process.env.SSH_HOST || 'localhost',
    port: parseInt(process.env.SSH_PORT || '22', 10),
    user: process.env.SSH_USER || 'root',
    keyPath: process.env.SSH_KEY_PATH || '~/.ssh/id_rsa',
    logPath: process.env.MONITOR_LOG_PATH || '/var/log/syslog',
    vitalsIntervalMs: parseInt(process.env.VITALS_INTERVAL_MS || '5000', 10)
  },
  ai: {
    provider: process.env.AI_PROVIDER || 'GROQ',
    apiKey: process.env.GROQ_API_KEY || process.env.OPENAI_API_KEY || '',
    model: process.env.AI_MODEL || 'llama-3.3-70b-versatile'
  },
  github: {
    owner: process.env.GITHUB_OWNER || '',
    repo: process.env.GITHUB_REPO || '',
    token: process.env.GITHUB_TOKEN || process.env.GIT_ACCESS_TOKEN || '',
    baseBranch: process.env.GITHUB_BASE_BRANCH || 'main'
  }
};

export default config;
