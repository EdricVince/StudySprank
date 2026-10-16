import { assertPublicUrl, isPrivateAddress } from './ssrf';

const lookupTo = (...addresses: string[]) =>
  jest.fn(async () => addresses.map((address) => ({ address })));

describe('SSRF guard — isPrivateAddress', () => {
  it.each([
    '127.0.0.1',
    '10.1.2.3',
    '172.16.0.1',
    '172.31.255.255',
    '192.168.1.1',
    '169.254.169.254',
    '0.0.0.0',
    '100.64.0.1',
    '224.0.0.1',
    '::1',
    '::',
    'fe80::1',
    'fc00::1',
    'fd12:3456::1',
    '::ffff:127.0.0.1',
    '::ffff:10.0.0.1',
    '::ffff:7f00:1',
  ])('blocks %s', (ip) => {
    expect(isPrivateAddress(ip)).toBe(true);
  });

  it.each([
    '8.8.8.8',
    '93.184.216.34',
    '172.32.0.1',
    '2606:4700:4700::1111',
    '::ffff:8.8.8.8',
  ])('allows public %s', (ip) => {
    expect(isPrivateAddress(ip)).toBe(false);
  });
});

describe('SSRF guard — assertPublicUrl (DNS resolved)', () => {
  it('blocks a public-looking hostname that resolves to a private address', async () => {
    await expect(
      assertPublicUrl(
        new URL('http://internal.example.com/'),
        lookupTo('10.0.0.7'),
      ),
    ).rejects.toThrow('private or local network');
  });

  it('blocks when ANY resolved address is private (mixed A/AAAA records)', async () => {
    await expect(
      assertPublicUrl(
        new URL('http://mixed.example.com/'),
        lookupTo('93.184.216.34', '::1'),
      ),
    ).rejects.toThrow('private or local network');
  });

  it('blocks literal IPv6 loopback / IPv4-mapped hosts without DNS', async () => {
    const lookup = lookupTo('8.8.8.8');
    await expect(
      assertPublicUrl(new URL('http://[::1]/'), lookup),
    ).rejects.toThrow('private');
    await expect(
      assertPublicUrl(new URL('http://[::ffff:127.0.0.1]/'), lookup),
    ).rejects.toThrow('private');
    await expect(
      assertPublicUrl(new URL('http://0.0.0.0/'), lookup),
    ).rejects.toThrow('private');
    expect(lookup).not.toHaveBeenCalled();
  });

  it('allows a host that resolves only to public addresses', async () => {
    await expect(
      assertPublicUrl(
        new URL('https://example.com/a'),
        lookupTo('93.184.216.34'),
      ),
    ).resolves.toBeUndefined();
  });
});
