// AppRole login + KV read + log-rotation static-cred read (constant-arrival-rate).
// Each iteration logs in with AppRole, reads a KV secret, then reads a
// log-rotation / static-credential endpoint to exercise credential rotation
// under steady load. Formerly LogRotationPolicyTest/VaultLogin-AppRole-StressLoad-V2.js.
import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const kvGetCounter = new Counter('kv_get_reqs');
const kvGetTrend = new Trend('kv_get_duration', true);
const rotationCounter = new Counter('rotation_read_reqs');
const rotationTrend = new Trend('rotation_read_duration', true);
const loginCounter = new Counter('approle_login_reqs');
const loginTrend = new Trend('approle_login_duration', true);

// --- Config (override with -e KEY=value) ---
const VAULT_ADDR = __ENV.VAULT_ADDR || '<VAULT_ADDR>';
const VAULT_NAMESPACE = __ENV.VAULT_NAMESPACE || '';
const SECRET_ID = __ENV.SECRET_ID || 'EnterSecretIdforCiCdAppRoleHere';
const ROLE_ID = __ENV.ROLE_ID || 'EnterRoleIdforCiCdAppRoleHere';
const APPROLE_LOGIN_PATH = __ENV.APPROLE_LOGIN_PATH || '/v1/auth/team1/approle/applicx/login';
const KV_PATH = __ENV.KV_PATH || '/v1/team1/int/kv/data/np/putyoursecretshere';
const ROTATION_PATH = __ENV.ROTATION_PATH || '/v1/team1/ldap/data/xxxdv/static-cred/svc_hcp_dv_rotate';

// --- Load profile (override with -e KEY=value) ---
const RATE = Number(__ENV.RATE || 10);
const DURATION = __ENV.DURATION || '10m';
const PRE_VUS = Number(__ENV.PRE_VUS || 10);

export const options = {
  thresholds: {
    // Fail the test if more than 1% of requests error out.
    http_req_failed: ['rate<0.01'],
    // 90% of response bodies should be received within 200ms.
    http_req_receiving: ['p(90)<201'],
  },
  scenarios: {
    approle_logrotation_read: {
      executor: 'constant-arrival-rate',
      duration: DURATION,
      rate: RATE,
      timeUnit: '1s',
      preAllocatedVUs: PRE_VUS,
    },
  },
};

function vaultHeaders(token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['X-Vault-Token'] = token;
  if (VAULT_NAMESPACE) headers['X-Vault-Namespace'] = VAULT_NAMESPACE;
  return headers;
}

function readKV(token) {
  const res = http.get(VAULT_ADDR + KV_PATH, {
    headers: vaultHeaders(token),
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

function readRotationLog(token) {
  const res = http.get(VAULT_ADDR + ROTATION_PATH, {
    headers: vaultHeaders(token),
    tags: { name: 'rotation_read' },
  });

  const ok = check(res, { 'Vault AppRole rotation read status is 200': (r) => r.status === 200 });
  if (!ok) {
    console.error(`FAILED ROTATION READ: ${res.status} ${res.body}`);
  } else {
    rotationCounter.add(1);
    rotationTrend.add(res.timings.duration);
  }
}

export default function () {
  const res = http.post(
    VAULT_ADDR + APPROLE_LOGIN_PATH,
    JSON.stringify({ secret_id: SECRET_ID, role_id: ROLE_ID }),
    { headers: vaultHeaders(), tags: { name: 'approle_login' } }
  );

  const ok = check(res, { 'Vault AppRole login status is 200': (r) => r.status === 200 });
  if (!ok) {
    console.error(`LOGIN FAIL: ${res.status} ${res.body}`);
    return;
  }

  loginCounter.add(1);
  loginTrend.add(res.timings.duration);

  const token = JSON.parse(res.body).auth.client_token;
  readKV(token);
  readRotationLog(token);
}

export function teardown() {
  console.log(`Vault target: ${VAULT_ADDR}`);
}
