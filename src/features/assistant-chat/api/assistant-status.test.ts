import { afterEach, describe, expect, it, vi } from 'vitest';
import { fetchAssistantStatus } from './assistant-status';

afterEach(() => vi.unstubAllGlobals());

const reply = (body: unknown, status = 200) => vi.fn(async () => new Response(JSON.stringify(body), { status }));

describe('fetchAssistantStatus', () => {
  it('reads the flag from the server', async () => {
    vi.stubGlobal('fetch', reply({ enabled: true }));
    expect(await fetchAssistantStatus({ baseUrl: 'https://api.test', mock: false })).toEqual({ enabled: true });
  });

  it('asks the status address', async () => {
    const fetchMock = reply({ enabled: false });
    vi.stubGlobal('fetch', fetchMock);
    await fetchAssistantStatus({ baseUrl: 'https://api.test', mock: false });
    expect((fetchMock.mock.calls[0] as unknown as [string])[0]).toBe('https://api.test/v1/assistant/status');
  });

  it('counts an error, a bad body and a failed request as "not available": the button stays hidden', async () => {
    vi.stubGlobal('fetch', reply({}, 503));
    expect(await fetchAssistantStatus({ baseUrl: 'https://api.test', mock: false })).toEqual({ enabled: false });
    vi.stubGlobal('fetch', reply({ nonsense: 1 }));
    expect(await fetchAssistantStatus({ baseUrl: 'https://api.test', mock: false })).toEqual({ enabled: false });
    vi.stubGlobal('fetch', vi.fn(async () => { throw new TypeError('offline'); }));
    expect(await fetchAssistantStatus({ baseUrl: 'https://api.test', mock: false })).toEqual({ enabled: false });
  });

  it('is not available without a server address', async () => {
    const fetchMock = reply({ enabled: true });
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchAssistantStatus({ baseUrl: null, mock: false })).toEqual({ enabled: false });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('is available in mock mode without asking a server', async () => {
    const fetchMock = reply({ enabled: false });
    vi.stubGlobal('fetch', fetchMock);
    expect(await fetchAssistantStatus({ baseUrl: null, mock: true })).toEqual({ enabled: true });
    expect(fetchMock).not.toHaveBeenCalled();
  });
});
