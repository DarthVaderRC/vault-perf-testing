# K6 Vault performance testing guide

This repository contains [k6](https://k6.io/) scripts for load- and
performance-testing HashiCorp Vault. Scripts live under `scenarios/`, grouped by
load profile:

- `scenarios/StressLoad/` — sustained/aggressive load to find limits
- `scenarios/PeakLoad/` — realistic ramp-up to a peak and back down
- `scenarios/LogRotationPolicyTest/` — credential/log-rotation read under load

All scripts target Vault Enterprise or OSS. Enterprise namespaces are supported
via the optional `VAULT_NAMESPACE` env var (sent as `X-Vault-Namespace` only when
set).

## Starter pack artifacts

Use these templates as a starting point for a full Vault performance engagement:

- Test plan template: `docs/vault-performance-test-plan-template.md`
- Results report template: `docs/vault-performance-test-results-report-template.md`
- Grafana dashboard JSON: `dashboards/grafana/vault-performance-observability-dashboard.json`
- Grafana usage guide: `docs/vault-grafana-dashboard-guide.md`
- Concrete 5-node on-prem example plan: `docs/vault-performance-test-plan-5node-onprem-example.md`
- Local Grafana preview runbook: `docs/vault-grafana-local-preview-guide.md`

## Monitoring updates (Grafana + Prometheus local preview)

The monitoring starter pack includes:

- Dashboard sections split into:
  - **Performance Metrics**
  - **Capacity Metrics** (Vault CPU, memory, disk, network)
  - **Injector Capacity Metrics** (injector CPU, memory, disk, network)
- Local synthetic Prometheus rules to populate all dashboard sections with sample data in preview mode:
  - `monitoring/local-preview/prometheus/rules/vault-synthetic.yml`
- Local preview stack for quick visual validation:
  - `monitoring/local-preview/docker-compose.yml`
- Latest dashboard preview screenshot artifact:
  - `docs/assets/grafana-dashboard-preview.png`

## Naming convention

Scripts are named `<auth>-<workload>-<loadprofile>.js` so the filename describes
what the script does:

- **auth** — `approle` or `ldap`
- **workload** — `kvread`, `login-kvread` (re-auth + read mix), `logrotation-read`
- **loadprofile** — `stress`, `peak`, plus the executor shape (`ramping` / `constant`)

## Scripts

| Script | Auth | Workload | Executor / load | Notes |
| --- | --- | --- | --- | --- |
| `StressLoad/approle-kvread-stress-ramping.js` | AppRole (login once in `setup`) | N KV reads per iteration (default 150) | `ramping-arrival-rate`, 250 → 700 → 700 → 250 → 0 | Aggressive KV-read stress; reuses one token |
| `StressLoad/approle-kvread-stress-constant.js` | AppRole (login once) | N KV reads per iteration (default 1) | `constant-arrival-rate`, 5m @ 10/s | Steady low-rate baseline |
| `StressLoad/approle-login-kvread-stress-mix.js` | AppRole (re-auth every iteration) | login + N KV reads (default 10) | `constant-arrival-rate`, 30m @ 100/s | Exercises the auth path too; per-type latency Trends |
| `StressLoad/ldap-kvread-stress-constant.js` | LDAP (login every iteration) | login + 1 KV read | `constant-arrival-rate`, 30m @ 10/s | LDAP userpass login + read |
| `PeakLoad/approle-kvread-peak-ramping.js` | AppRole (login once) | N KV reads per iteration (default 10) | `ramping-arrival-rate`, 20 → 60 → 60 → 20 → 0 over ~35m | Realistic peak-load profile |
| `PeakLoad/ldap-kvread-peak-constant.js` | LDAP (login every iteration) | login + 1 KV read | `constant-arrival-rate`, 30m @ 6/s | LDAP peak baseline |
| `LogRotationPolicyTest/approle-logrotation-read-constant.js` | AppRole (login every iteration) | login + KV read + rotation static-cred read | `constant-arrival-rate`, 10m @ 10/s | Exercises credential/log rotation reads |

> **Note:** The previous `oss*` scripts were removed. They were duplicates of the
> `ent*` scripts differing only in load numbers. Target OSS vs Enterprise using
> the same scripts and adjust load / namespace via env vars (below).

## Common script structure

Every script follows the same shape:

1. **Imports and metrics** — `k6/http`, `check`, plus `Counter`/`Trend` metrics.
   Requests are tagged (`ldap_login`, `approle_login`, `kv_read`,
   `rotation_read`) so per-request-type latency is separable.
2. **`options` block** — thresholds (`http_req_failed: rate<0.01`,
   `http_req_receiving: p(90)<201`) and the scenario executor / load profile.
3. **Config via `__ENV`** — no secrets or endpoints are hardcoded; every value
   has a safe placeholder default and is overridable at runtime.
4. **Auth + request flow** — AppRole/LDAP login, then KV (and optionally
   rotation) reads validated with `check()`; `teardown()` logs the target.

## Configuration (environment variables)

Pass with `-e KEY=value`. Defaults are placeholders — set the ones relevant to
your target Vault.

| Variable | Applies to | Default | Purpose |
| --- | --- | --- | --- |
| `VAULT_ADDR` | all | `<VAULT_ADDR>` | Vault base URL |
| `VAULT_NAMESPACE` | all | *(empty)* | Enterprise namespace (`X-Vault-Namespace`); sent only if set |
| `SECRET_ID` / `ROLE_ID` | AppRole scripts | placeholders | AppRole credentials |
| `APPROLE_LOGIN_PATH` | AppRole scripts | `/v1/auth/root/approle/cicd/login` | AppRole login endpoint |
| `LDAP_USER` / `LDAP_PASSWORD` | LDAP scripts | `user1` / *(empty)* | LDAP test user credentials |
| `LDAP_LOGIN_PATH` | LDAP scripts | `/v1/auth/root/xxxco/login/` | LDAP login base path (user appended) |
| `KV_PATH` | all | script-specific | KV read endpoint |
| `ROTATION_PATH` | log-rotation script | `/v1/team1/ldap/data/xxxdv/static-cred/svc_hcp_dv_rotate` | Rotation static-cred endpoint |
| `GETS_PER_ITER` | KV-read scripts | script-specific | KV reads per iteration |
| `RATE`, `DURATION`, `PRE_VUS`, `MAX_VUS`, `START_RATE`, `PEAK_RATE`, `RAMP_RATE` | where applicable | script-specific | Load-profile tuning |

## How to execute with k6

Run from the repository root.

### 1. Basic run (with config)

```bash
k6 run \
  -e VAULT_ADDR=https://vault.example.com:8200 \
  -e SECRET_ID=... -e ROLE_ID=... \
  -e KV_PATH=/v1/root/int/kv/data/corp/esm/perf/test-secret \
  scenarios/StressLoad/approle-kvread-stress-ramping.js
```

### 2. Tune the load profile at runtime

```bash
k6 run \
  -e VAULT_ADDR=https://vault.example.com:8200 \
  -e SECRET_ID=... -e ROLE_ID=... \
  -e START_RATE=100 -e PEAK_RATE=1000 -e PRE_VUS=2000 -e MAX_VUS=3000 -e GETS_PER_ITER=50 \
  scenarios/StressLoad/approle-kvread-stress-ramping.js
```

### 3. Enterprise namespace

```bash
k6 run -e VAULT_ADDR=... -e VAULT_NAMESPACE=admin/team1 -e SECRET_ID=... -e ROLE_ID=... \
  scenarios/PeakLoad/approle-kvread-peak-ramping.js
```

### 4. LDAP scripts

```bash
k6 run -e VAULT_ADDR=... -e LDAP_USER=perfuser -e LDAP_PASSWORD=... \
  -e LDAP_LOGIN_PATH=/v1/auth/root/xxxco/login/ \
  scenarios/StressLoad/ldap-kvread-stress-constant.js
```

### 5. Log output to file

```bash
k6 run --log-output=file=./k6.log -e VAULT_ADDR=... \
  scenarios/StressLoad/approle-kvread-stress-constant.js
```

### 6. CSV output

```bash
k6 run --out csv=results.csv --log-output=file=./k6.log -e VAULT_ADDR=... \
  scenarios/StressLoad/approle-kvread-stress-constant.js
```

### 7. Web dashboard HTML export

```bash
K6_WEB_DASHBOARD=true \
K6_WEB_DASHBOARD_EXPORT=html-report.html \
k6 run --no-setup -e VAULT_ADDR=... \
  scenarios/StressLoad/approle-login-kvread-stress-mix.js
```

## Security note

Credentials are **not** committed to source. Provide `SECRET_ID`, `ROLE_ID`, and
`LDAP_PASSWORD` at runtime via `-e` (or a k6 environment file). The in-script
defaults are inert placeholders.
