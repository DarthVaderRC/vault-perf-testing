// AppRole auth + KV read stress test (constant-arrival-rate).
// Logs in once (setup) with AppRole, then issues KV reads at a steady rate for
// a fixed duration. Formerly ent-constant.js.
import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const kvGetCounter = new Counter('kv_get_reqs');
const kvGetTrend = new Trend('kv_get_duration', true);

// --- Config (override with -e KEY=value) ---
const VAULT_ADDR = __ENV.VAULT_ADDR || '<VAULT_ADDR>';
const VAULT_NAMESPACE = __ENV.VAULT_NAMESPACE || '';
const SECRET_ID = __ENV.SECRET_ID || 'EnterSecretIdforCiCdAppRoleHere';
const ROLE_ID = __ENV.ROLE_ID || 'EnterRoleIdforCiCdAppRoleHere';
const APPROLE_LOGIN_PATH = __ENV.APPROLE_LOGIN_PATH || '/v1/auth/root/approle/cicd/login';
const KV_PATH = __ENV.KV_PATH || '/v1/root/int/kv/data/corp/esm/perf/test-secret';
const GETS_PER_ITER = Number(__ENV.GETS_PER_ITER || 1);

// --- Load profile (override with -e KEY=value) ---
const RATE = Number(__ENV.RATE || 10);
const DURATION = __ENV.DURATION || '5m';
const PRE_VUS = Number(__ENV.PRE_VUS || 2000);
const MAX_VUS = Number(__ENV.MAX_VUS || 3000);

export const options = {
  thresholds: {
    // Fail the test if more than 1% of requests error out.
    http_req_failed: ['rate<0.01'],
    // 90% of response bodies should be received within 200ms.
    http_req_receiving: ['p(90)<201'],
  },
  scenarios: {
    approle_kvread_constant: {
      executor: 'constant-arrival-rate',
      duration: DURATION,
      rate: RATE,
      timeUnit: '1s',
      preAllocatedVUs: PRE_VUS,
      maxVUs: MAX_VUS,
    },
  },
};

function vaultHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Vault-Token'] = token;
  if (VAULT_NAMESPACE) headers['X-Vault-Namespace'] = VAULT_NAMESPACE;
  return headers;
}

export function setup() {
  const res = http.post(
    VAULT_ADDR + APPROLE_LOGIN_PATH,
    JSON.stringify({ secret_id: SECRET_ID, role_id: ROLE_ID }),
    { headers: vaultHeaders(), tags: { name: 'approle_login' } }
  );

  if (res.status !== 200) {
    throw new Error(`AppRole login failed: ${res.status} ${res.body}`);
  }
  return { token: JSON.parse(res.body).auth.client_token };
}

export default function (data) {
  for (let i = 0; i < GETS_PER_ITER; i++) {
    const res = http.get(VAULT_ADDR + KV_PATH, {
      headers: vaultHeaders(data.token),
      tags: { name: 'kv_read' },
    });

    const ok = check(res, { 'Vault AppRole KV read status is 200': (r) => r.status === 200 });
    if (!ok) {
      console.error(`FAILED READ: ${res.status} ${res.body}`);
    } else {
      kvGetCounter.add(1);
      kvGetTrend.add(res.timings.duration);
    }
  }
}

export function teardown() {
  console.log(`Vault target: ${VAULT_ADDR}`);
}
