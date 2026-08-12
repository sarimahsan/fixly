# Fixly — Remote Target Demo App & Intentional Error Triggers

This document provides complete instructions for building, deploying, and triggering intentional errors in an external target application to test **Fixly** end-to-end.

---

## 1. Architecture & Deployment Overview

The target application is an independent server application (e.g. Node.js Express service) deployed on a remote server/VM that Fixly monitors over SSH.

### Prerequisites on Remote Target Server
1. **Node.js v18+ & PM2 / Systemd**: Runs the target web server process.
2. **SSH Key Access**: A dedicated SSH user (e.g. `deploy` or `ubuntu`) with key-based authentication for Fixly.
3. **Log Stream Location**: App writes logs to a dedicated log file, e.g.:
   `/var/log/target_app/app.log` or `/home/ubuntu/target_app/logs/app.log`
4. **Git Repository Access**: The target app code is hosted on GitHub/GitLab, matching the repository token configured in Fixly Settings.

---

## 2. Intentional Error Scenarios

The target app contains dedicated endpoints to trigger reproducible errors on demand. These simulate real production bugs for Fixly to detect, diagnose, and auto-fix.

### Scenario 1 — Database Connection Pool Exhaustion
- **Trigger Endpoint**: `GET /api/trigger/db-timeout`
- **Target File in Repo**: `src/services/database.js`
- **Simulated Log Output**:
  ```log
  [2026-08-12T11:15:00.123Z] ERROR [db_service]: Connection pool timeout after 30000ms. Max connections (10) reached at src/services/database.js:42
  ```
- **Root Cause**: Missing connection release in `catch` block (`client.release()` omitted).
- **Fixly Action**: AI identifies unreleased DB pool client in `src/services/database.js`, generates a diff patch adding `finally { client.release(); }`, and pushes a Git commit.

---

### Scenario 2 — Null Pointer / TypeError Reference Error
- **Trigger Endpoint**: `GET /api/trigger/null-ref`
- **Target File in Repo**: `src/routes/user_profile.js`
- **Simulated Log Output**:
  ```log
  [2026-08-12T11:15:15.456Z] ERROR [user_profile]: TypeError: Cannot read properties of undefined (reading 'account_status') at src/routes/user_profile.js:88
  ```
- **Root Cause**: Accessing `req.user.account_status` without checking if `req.user` exists.
- **Fixly Action**: AI adds optional chaining / null check (`req.user?.account_status`), creates line diff, and commits fix.

---

### Scenario 3 — Unhandled Promise Rejection (API Key Expiry)
- **Trigger Endpoint**: `GET /api/trigger/unhandled-rejection`
- **Target File in Repo**: `src/services/payment_gateway.js`
- **Simulated Log Output**:
  ```log
  [2026-08-12T11:15:30.789Z] ERROR [payment_gateway]: UnhandledPromiseRejection: Invalid or expired API signature token at src/services/payment_gateway.js:104
  ```
- **Root Cause**: Missing `.catch()` handler or missing `try/catch` around asynchronous API call.
- **Fixly Action**: AI wraps async call in try/catch block with fallback error handling.

---

### Scenario 4 — High CPU / Memory Resource Spike (Vitals Alert)
- **Trigger Endpoint**: `GET /api/trigger/resource-spike`
- **Simulated Behavior**: Runs an intensive loop for 15 seconds to spike CPU usage > 90%.
- **Fixly Action**: Fixly SSH Vitals parser detects elevated CPU/RAM metrics and updates the Live Vitals widget in the UI feed.

---

## 3. Remote Error Trigger Commands

You can trigger errors manually from your terminal or test scripts using `curl`:

```bash
# 1. Trigger DB Connection Timeout
curl -X GET http://<YOUR_TARGET_SERVER_IP>:3000/api/trigger/db-timeout

# 2. Trigger Null Pointer TypeError
curl -X GET http://<YOUR_TARGET_SERVER_IP>:3000/api/trigger/null-ref

# 3. Trigger Unhandled Promise Rejection
curl -X GET http://<YOUR_TARGET_SERVER_IP>:3000/api/trigger/unhandled-rejection

# 4. Trigger CPU / Resource Spike
curl -X GET http://<YOUR_TARGET_SERVER_IP>:3000/api/trigger/resource-spike
```

### Automation Script (`trigger_test_suite.sh`)
```bash
#!/bin/bash
TARGET_HOST=${1:-"localhost:3000"}

echo "=== Triggering Target App Error Harness on $TARGET_HOST ==="
echo "[1/3] Triggering DB Timeout Error..."
curl -s "http://$TARGET_HOST/api/trigger/db-timeout" > /dev/null
sleep 2

echo "[2/3] Triggering Null Reference Error..."
curl -s "http://$TARGET_HOST/api/trigger/null-ref" > /dev/null
sleep 2

echo "[3/3] Triggering Unhandled Rejection Error..."
curl -s "http://$TARGET_HOST/api/trigger/unhandled-rejection" > /dev/null

echo "=== Trigger sequence complete. Check Fixly Dashboard for live detection ==="
```

---

## 4. How Fixly Verifies Self-Healing

1. **Detection**: Fixly reads log lines over SSH and fingerprints errors using SHA-256 (stripping timestamps and dynamic IDs).
2. **Deduplication**: Repeated trigger hits increment occurrence count for the open incident.
3. **AI Diagnosis & Fix**: Fixly matches the error trace to the repo file (`src/services/database.js` or `src/routes/user_profile.js`), calls the AI engine, and produces a git commit.
4. **Auto-Recovery**: Once the commit is deployed on the target server, recurring hits stop, and Fixly automatically marks the incident as `Resolved`.
