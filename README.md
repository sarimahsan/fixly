# Fixly

Fixly is an AI-powered incident detection and self-healing system built with Node.js ES modules and Mongoose.

## Phase 1: Auth, Roles & Settings API

Implemented modules:

- `src/modules/auth/auth_service.js`
  - PBKDF2-SHA512 password hashing and verification.
  - HS256 JWT session creation and bearer token verification.
  - `/api/auth/login` route registration helper for Express-style apps.
- `src/modules/auth/rbac_middleware.js`
  - Admin vs viewer RBAC middleware.
  - Admin access: `ADMIN`.
  - Viewer access: `ADMIN`, `OPERATOR`, `READ_ONLY`.
- `src/modules/auth/settings_service.js`
  - `GET /api/settings` for masked settings.
  - `PUT /api/settings` for admin-only updates.
  - Encrypted storage for GitHub/Git access tokens.
- `src/modules/auth/crypto_utils.js`
  - AES-256-GCM encryption/decryption utilities.
  - Secret masking helpers.

## Configuration

Copy `.env.example` to `.env` and set at minimum:

```bash
MONGODB_URI=mongodb://localhost:27017/fixly
JWT_SECRET=your_jwt_secret_here
SETTINGS_ENCRYPTION_KEY=your_32_byte_or_longer_settings_secret_here
```

## Commands

```bash
npm install
npm run test:auth
npm run test:rbac
npm run test:settings
npm test
```

`npm run test:models` attempts a live MongoDB connection and may skip/fail that portion if MongoDB is unavailable.
