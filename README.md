# K6 StressLoad guide (`ent*` scripts)

This document explains the enterprise (`ent*`) load scripts in:

`pert-testing/scenarios/StressLoad/`

## Scripts covered

- `ent.js`
- `ent-constant.js`
- `ent-constant-txn-mix.js`
- `ent-VaultLogin-AppRole-StressLoad.js`

## Common script components

All `ent*` scripts follow the same Vault load-testing shape:

1. **Imports and metrics**
   - `k6/http` for Vault API calls
   - `check` assertions for HTTP status validation
   - `Counter` metrics for request-volume tracking
   - `Trend` metrics (only in `ent-constant-txn-mix.js`) for request latency by request type

2. **`options` block**
   - Enforces thresholds:
     - `http_req_failed: rate<0.01`
     - `http_req_receiving: p(90)<201`
   - Defines scenario executor model and load profile.

3. **Vault config placeholders**
   - `const vault_api = "<VAULT_ADDR>";`
   - AppRole placeholders:
     - `secret_id`
     - `role_id`
   - KV read endpoint placeholder:
     - `/v1/root/int/kv/data/corp/esm/perf/test-secret`

4. **Authentication and request flow**
   - `setup()` performs AppRole login and returns `vault_token`.
   - `default()` executes KV reads using `X-Vault-Token`.
   - `check()` validates `200` responses.
   - `teardown()` prints aggregate counters/logging.

## Scenario behavior by script

| Script | Executor | Scenario profile | KV read pattern |
| --- | --- | --- | --- |
| `ent-constant.js` | `constant-arrival-rate` | 5m, rate 10/sec, `preAllocatedVUs: 2000`, `maxVUs: 3000` | 1 KV read per iteration (uses setup token) |
| `ent-constant-txn-mix.js` | `constant-arrival-rate` | 30m, rate 100/sec, `preAllocatedVUs: 2000`, `maxVUs: 3000` | Re-authenticates in `default()`, then 10 KV reads per iteration; adds request counters/trends with tags |
| `ent.js` | `ramping-arrival-rate` | Start 250/sec, stages 250→700→700→250→0, `preAllocatedVUs: 1000`, `maxVUs: 1500` | 150 KV reads per iteration (uses setup token) |
| `ent-VaultLogin-AppRole-StressLoad.js` | `ramping-arrival-rate` | Start 50/sec, stages 150→300→300→150→0, `preAllocatedVUs: 200`, `maxVUs: 400` | 150 KV reads per iteration (uses setup token) |

## How to execute with K6

Run from repository root (`hashicorp-test-automation`) unless noted otherwise.

### 1. Basic run commands (single script)

```bash
k6 run pert-testing/scenarios/StressLoad/ent-constant.js
k6 run pert-testing/scenarios/StressLoad/ent-constant-txn-mix.js
k6 run pert-testing/scenarios/StressLoad/ent.js
k6 run pert-testing/scenarios/StressLoad/ent-VaultLogin-AppRole-StressLoad.js
```

### 2. Run with log output file

```bash
k6 run --log-output=file=./k6.log pert-testing/scenarios/StressLoad/ent-constant.js
```

### 3. Run with CSV output (example)

```bash
k6 run --out csv=ent-const-results.csv --log-output=file=./k6.log pert-testing/scenarios/StressLoad/ent-constant.js
```

### 4. Run with web dashboard HTML export

```bash
K6_WEB_DASHBOARD=true \
K6_WEB_DASHBOARD_EXPORT=html-report.html \
k6 run --no-setup pert-testing/scenarios/StressLoad/ent-constant-txn-mix.js
```

### 5. Environment placeholders to update before running

Update these values in each script before execution:

- `vault_api` (`<VAULT_ADDR>`)
- `secret_id`
- `role_id`
- target KV path for reads
- optional namespace header value (`X-Vault-Namespace`) if needed for your target Vault layout

## Note about `oss*` scripts

The `oss*` StressLoad scripts are copy/equivalent variants of these `ent*` scripts, intended for execution against OSS Vault environments.
