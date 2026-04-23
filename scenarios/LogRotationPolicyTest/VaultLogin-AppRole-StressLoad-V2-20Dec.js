import http from 'k6/http';
import { sleep, check } from 'k6';
import { Counter } from 'k6/metrics'
 
export const requests = new Counter('http_reqs');
 
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
    duration: '10m',    

    /*Rate at which Requests will be pumped*/
    rate: 10,

    /*Unit of time at which above defined rate will be pumped*/
    timeUnit: '1s',

    /*Pre-allocation of Virtual Users to be spun up for the Scenario*/
    preAllocatedVUs: 10,

  },
 }, 
};
 
/*Vault URL below - Please change to approprirate Envrionment*/
const vault_api = "<VAULT_ADDR>"
 
export default function () {
  const res = http.post(
    vault_api.concat('/v1/auth/team1/approle/applicx/login'),
    
    JSON.stringify({
      secret_id: 'EnterSecretIdforCiCdAppRoleHere', /*Please change secret_id & role_id according to the envrironment*/
      role_id: 'EnterRoleIdforCiCdAppRoleHere',
    }),
    {
      headers: {
        'Content-Type': 'application/json',
        'X-Vault-Namespace': ''
      }
    }
  );
  
  if ( res.status != 200 ) {
    console.log("FAIL: ", res.status, res.body )
  } else {
    const checkRes = check(res, {
      'Vault Approle Login Status is 200': (r) => r.status === 200,
    });
 
    var parsedResponse = JSON.parse( res.body );
    var vault_token = parsedResponse.auth.client_token;  
    var result=readKV( vault_token );
    //Adding line for Reading Log Rotation Policy
    var RotationResult =readLog(vault_token); 
  
  }
}
 
//Adding Function to Read from Log Rotation Policy
function readLog (token)
{
  const LogResponse = http.get(vault_api.concat('/v1/team1/ldap/data/xxxdv/static-cred/svc_hcp_dv_rotate'), /*Please change KeyVault Rotation URL appropriate for the Envrionment*/
  {
    headers:{
      'Content-Type': 'application/json',
      'X-Vault-Token': token
    }
  }
  );
console.log('Rotation Log Response time was '+ String(LogResponse.timings.duration)+ 'ms');
if (LogResponse.status !=200)
{
  console.log("FAILED READ:", LogResponse.status,log.body)
}
const CheckLogRes = check(LogResponse,{
  'Vault AppRole Rotation Log Status is 200:' : (r) => r.status === 200,
});

return LogResponse.status;
}
function readKV( token ) {
    const response = http.get(
        vault_api.concat('/v1/team1/int/kv/data/np/putyoursecretshere'), /*Please change KeyVault URL appropriate for the Envrionment*/
        {
          headers: {
            'Content-Type': 'application/json',
            'X-Vault-Token': token
          }
        }
      );  

    /*Capturing Response time for Vault read*/  
    console.log('Response time was ' + String(response.timings.duration) + ' ms');  

    if ( response.status != 200 ) {
        console.log("FAILED READ: ", response.status, response.body )
    }
    const checkRes = check(response, {
      'Vault Approle KV Status is 200': (r) => r.status === 200,
    });
 
    return response.status;
}