// LDAP login + KV read peak-load test (constant-arrival-rate).
// Each iteration performs an LDAP userpass login and one KV read with the
// resulting token, held at a steady rate. Formerly VaultScript-LDAP-PeakLoad-V1.js.
import http from 'k6/http';
import { check } from 'k6';
import { Counter, Trend } from 'k6/metrics';

const kvGetCounter = new Counter('kv_get_reqs');
const kvGetTrend = new Trend('kv_get_duration', true);
const loginCounter = new Counter('ldap_login_reqs');
const loginTrend = new Trend('ldap_login_duration', true);

// --- Config (override with -e KEY=value) ---
const VAULT_ADDR = __ENV.VAULT_ADDR || '<VAULT_ADDR>';
const VAULT_NAMESPACE = __ENV.VAULT_NAMESPACE || '';
const LDAP_USER = __ENV.LDAP_USER || 'user1';
const LDAP_PASSWORD = __ENV.LDAP_PASSWORD || '';
const LDAP_LOGIN_PATH = __ENV.LDAP_LOGIN_PATH || '/v1/auth/root/xxxco/login/';
const KV_PATH = __ENV.KV_PATH || '/v1/iam/int/kv/data/harinder/perftest1';

// --- Load profile (override with -e KEY=value) ---
const RATE = Number(__ENV.RATE || 6);
const DURATION = __ENV.DURATION || '30m';
const PRE_VUS = Number(__ENV.PRE_VUS || 10);

export const options = {
  thresholds: {
    // Fail the test if more than 1% of requests error out.
    http_req_failed: ['rate<0.01'],
    // 90% of response bodies should be received within 200ms.
    http_req_receiving: ['p(90)<201'],
  },
  scenarios: {
    ldap_kvread_peak: {
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

  const ok = check(res, { 'Vault LDAP KV read status is 200': (r) => r.status === 200 });
  if (!ok) {
    console.error(`FAILED READ: ${res.status} ${res.body}`);
  } else {
    kvGetCounter.add(1);
    kvGetTrend.add(res.timings.duration);
  }
}

export default function () {
  const res = http.put(
    VAULT_ADDR + LDAP_LOGIN_PATH + LDAP_USER,
    JSON.stringify({ password: LDAP_PASSWORD }),
    { headers: vaultHeaders(), tags: { name: 'ldap_login' } }
  );

  const ok = check(res, { 'Vault LDAP login status is 200': (r) => r.status === 200 });
  if (!ok) {
    console.error(`LOGIN FAIL: ${res.status} ${res.body}`);
    return;
  }

  loginCounter.add(1);
  loginTrend.add(res.timings.duration);
  readKV(JSON.parse(res.body).auth.client_token);
}

export function teardown() {
  console.log(`Vault target: ${VAULT_ADDR}`);
}
