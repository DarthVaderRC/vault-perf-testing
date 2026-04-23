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
  VaultLogin_LDAP:
  {   
    /*Executor designed for Requests to be pumped at a constant rate*/
    executor: 'constant-arrival-rate',

    /*Duration of the Load Test*/
    duration: '30m',

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
 
export default function ()
 {
    const res = http.put(    
    vault_api.concat('/v1/auth/root/xxxco/login/user1'), /*Please change Login ID to a Test User*/
    JSON.stringify({
      password: '' /*Please change password to Test User password*/    
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
      'Vault LDAP Login Status is 200': (r) => r.status === 200,
    });
 
    var parsedResponse = JSON.parse( res.body );
    var vault_token = parsedResponse.auth.client_token;    
    var result=readKV( vault_token );
    
  }
}

function readKV( token ) {
    const response = http.get(
        vault_api.concat('/v1/iam/int/kv/data/harinder/perftest1'), /*Please change KV URL to appropriate Test vault*/
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
        'Vault LDAP KV Read Status is 200': (r) => r.status === 200,        
    });
     
    return response.status;
    
}