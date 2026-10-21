import {describe,it,expect,vi} from 'vitest';
import {readIntegrationTarget,createIntegrationFetch} from './integration-target.js';
const env = { CI:'true', ROYALTYPORT_TEST_ENVIRONMENT:'staging', ROYALTYPORT_TEST_BASE_URL:'https://royaltyport-api-env-staging-royaltyport.vercel.app', ROYALTYPORT_TEST_PROJECT_ID:'d4000000-0000-4000-8000-000000000021', ROYALTYPORT_TEST_API_KEY:'synthetic-key', ROYALTYPORT_TEST_PROTECTION_BYPASS:'synthetic-bypass' };
describe('integration target boundary',()=>{
  it('rejects missing configuration and Production destinations',()=>{
    expect(()=>readIntegrationTarget({})).toThrow('explicit');
    expect(()=>readIntegrationTarget({...env,ROYALTYPORT_TEST_BASE_URL:'https://api.royaltyport.com'})).toThrow('Staging');
    expect(()=>readIntegrationTarget({...env,ROYALTYPORT_TEST_BASE_URL:'https://unrelated.vercel.app'})).toThrow('Staging');
    expect(()=>readIntegrationTarget({...env,ROYALTYPORT_TEST_BASE_URL:'http://localhost:3000'})).toThrow('Hosted');
    expect(()=>readIntegrationTarget({...env,ROYALTYPORT_TEST_PROTECTION_BYPASS:undefined})).toThrow('credential');
  });
  it('allows explicit local tests without a hosted bypass',()=>{
    expect(readIntegrationTarget({...env,CI:undefined,ROYALTYPORT_TEST_BASE_URL:'http://localhost:3000'}).bypass).toBeUndefined();
  });
  it('adds protection only at the API origin and refuses redirects there',async()=>{
    const fetchMock=vi.fn().mockResolvedValue(new Response('{}'));
    const request=createIntegrationFetch(readIntegrationTarget(env),fetchMock);
    await request(env.ROYALTYPORT_TEST_BASE_URL+'/v1/projects',{headers:{authorization:'Bearer synthetic-key'}});
    expect(new Headers(fetchMock.mock.calls[0][1].headers).get('x-vercel-protection-bypass')).toBe('synthetic-bypass');
    expect(fetchMock.mock.calls[0][1].redirect).toBe('error');
    await request('https://fixture.supabase.co/storage/file',{headers:{authorization:'must-not-leak','Royaltyport-Version':'must-not-leak','x-vercel-protection-bypass':'must-not-leak'}});
    const headers=new Headers(fetchMock.mock.calls[1][1].headers);
    for(const key of ['authorization','royaltyport-version','x-vercel-protection-bypass'])expect(headers.has(key)).toBe(false);
  });
});
