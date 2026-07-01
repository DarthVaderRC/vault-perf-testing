// AppRole auth + KV read stress test (ramping-arrival-rate).
// Logs in once (setup) with AppRole, then hammers a KV read endpoint while the
// request rate ramps up to a peak and back down. Consolidates the former
// ent.js and ent-VaultLogin-AppRole-StressLoad.js (identical shape, only load
// numbers differed) into one env-tunable script.
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
const GETS_PER_ITER = Number(__ENV.GETS_PER_ITER || 150);

// --- Load profile (override with -e KEY=value) ---
const START_RATE = Number(__ENV.START_RATE || 250);
const PEAK_RATE = Number(__ENV.PEAK_RATE || 700);
const PRE_VUS = Number(__ENV.PRE_VUS || 1000);
const MAX_VUS = Number(__ENV.MAX_VUS || 1500);

export const options = {
  thresholds: {
    // Fail the test if more than 1% of requests error out.
    http_req_failed: ['rate<0.01'],
    // 90% of response bodies should be received within 200ms.
    http_req_receiving: ['p(90)<201'],
  },
  scenarios: {
    approle_kvread_ramping: {
      executor: 'ramping-arrival-rate',
      startRate: START_RATE,
      timeUnit: '1s',
      preAllocatedVUs: PRE_VUS,
      maxVUs: MAX_VUS,
      stages: [
        { target: START_RATE, duration: '0.5m' }, // warm up at the start rate
        { target: PEAK_RATE, duration: '1m' },     // ramp up to peak
        { target: PEAK_RATE, duration: '1m' },     // hold at peak
        { target: START_RATE, duration: '0.5m' },  // ramp back down
        { target: 0, duration: '0.5m' },           // drain
      ],
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
