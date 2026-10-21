const stagingHost = 'royaltyport-api-env-staging-royaltyport.vercel.app';
export function readIntegrationTarget(env: Record<string, string | undefined>) {
  const baseUrl = env.ROYALTYPORT_TEST_BASE_URL;
  const projectId = env.ROYALTYPORT_TEST_PROJECT_ID;
  const apiKey = env.ROYALTYPORT_TEST_API_KEY;
  if (!baseUrl || !projectId || !apiKey) throw new Error('Set an explicit integration API origin, synthetic project ID and API key; no Production defaults are used.');
  const url = new URL(baseUrl);
  const local = ['localhost','127.0.0.1','[::1]'].includes(url.hostname);
  if (url.username || url.password || url.pathname !== '/' || url.search || url.hash || (!local && (url.protocol !== 'https:' || url.hostname !== stagingHost))) throw new Error('Integration tests accept only the configured Staging API origin or loopback.');
  if (env.CI && (local || env.ROYALTYPORT_TEST_ENVIRONMENT !== 'staging')) throw new Error('Hosted integration jobs require an explicit Staging target.');
  if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(projectId)) throw new Error('A valid synthetic project UUID is required.');
  const bypass = env.ROYALTYPORT_TEST_PROTECTION_BYPASS;
  if (!local && !bypass) throw new Error('Staging integration protection credential is required.');
  return { baseUrl: url.origin, projectId, apiKey, bypass: local ? undefined : bypass };
}
export function createIntegrationFetch(target: ReturnType<typeof readIntegrationTarget>, request: typeof fetch): typeof fetch {
  return async (input, init) => {
    const url = new URL(input instanceof Request ? input.url : String(input));
    const headers = new Headers(input instanceof Request ? input.headers : undefined);
    new Headers(init?.headers).forEach((value,key)=>headers.set(key,value));
    if (url.origin === target.baseUrl) {
      if (target.bypass) headers.set('x-vercel-protection-bypass',target.bypass);
      return request(input,{...init,headers,redirect:'error'});
    }
    for (const key of ['authorization','royaltyport-version','x-vercel-protection-bypass']) headers.delete(key);
    return request(input,{...init,headers});
  };
}
