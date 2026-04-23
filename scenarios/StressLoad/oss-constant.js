import http from 'k6/http';
import { check } from 'k6';
import { Counter } from 'k6/metrics';

export const requests = new Counter('http_reqs');
export const kvGetRequestCounter = new Counter('kv_get_reqs');

export const options = {
    /*Tresholds define conditions against which Test results are validated*/
    thresholds:
   {
    /*Treshold to validate if failure rate is <1%*/
     http_req_failed: ['rate<0.01'],
    /*Treshold to validate that response time for 90% requests is within 200 ms*/
    http_req_receiving: ['p(90)<201'],
   },

   scenarios:
   {
    VaultLogin_AppRole:
    {

    /*Executor designed for Requests to be pumped at a constant rate*/
      executor: 'constant-arrival-rate',

      /*Duration of the Load Test*/
      duration: '15m',

      /*Rate at which Requests will be pumped*/
      rate: 2000,

      /*Unit of time at which above defined rate will be pumped*/
      timeUnit: '1s',

      /*Pre-allocation of Virtual Users to be spun up for the Scenario*/
      preAllocatedVUs: 2000,
      maxVUs: 3000,
    },
   },
  };

/* Vault URL below - Please change to appropriate Environment */
const vault_api = "<VAULT_ADDR>";

/* Secret ID and Role ID to be defined and changed according to Approle */
const secret_id = 'EnterSecretIdforCiCdAppRoleHere'; // Change as needed
const role_id = 'EnterRoleIdforCiCdAppRoleHere'; // Change as needed

/* Number of GET requests to be sent, this can be adjusted */
const numberOfGetRequests = 150; // Change as needed

export function setup() {
  const loginRes = http.post(
    vault_api.concat('/v1/auth/root/approle/cicd/login'),
    JSON.stringify({ secret_id: secret_id, role_id: role_id }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Vault-Namespace': ''
      }
    }
  );

  if (loginRes.status !== 200) {
    console.log("FAIL: ", loginRes.status, loginRes.body);
    throw new Error('Login failed');
  }

  const parsedResponse = JSON.parse(loginRes.body);
  const vault_token = parsedResponse.auth.client_token;

  return { vault_token };
}

export default function (data) {
  for (let i = 0; i < numberOfGetRequests; i++) {
    const response = http.get(
      vault_api.concat('/v1/root/int/kv/data/corp/esm/perf/test-secret'), // Change KeyVault URL as needed
      {
        headers: {
          'Content-Type': 'application/json',
          'X-Vault-Token': data.vault_token
        }
      }
    );

    console.log('Response time was ' + String(response.timings.duration) + ' ms');

    if (response.status !== 200) {
      console.log("FAILED READ: ", response.status, response.body);
    }

    check(response, {
      'Vault Approle KV Status is 200': (r) => r.status === 200,
    });

    // Increment the KV GET request counter
    kvGetRequestCounter.add(1);
  }
}

export function teardown(data) {
  console.log(`Total number of KV GET requests sent: ${kvGetRequestCounter}`);
}
