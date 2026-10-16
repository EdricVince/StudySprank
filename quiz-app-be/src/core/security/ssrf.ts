import { promises as dns } from 'dns';
import { isIP } from 'net';

/** Thrown when a URL points at a private, loopback, link-local or otherwise non-public address. */
export class BlockedAddressError extends Error {
  constructor() {
    super('Access to private or local network addresses is not allowed.');
  }
}

const v4ToInt = (ip: string) =>
  ip.split('.').reduce((n, o) => (n << 8) + Number(o), 0) >>> 0;
const inV4 = (ip: string, base: string, bits: number) => {
  const mask = bits === 0 ? 0 : (~0 << (32 - bits)) >>> 0;
  return (v4ToInt(ip) & mask) === (v4ToInt(base) & mask);
};

// Non-public IPv4 ranges (RFC 1918, 6598, 3927, 5737, 2544, multicast, reserved…).
const V4_BLOCKED: Array<[string, number]> = [
  ['0.0.0.0', 8],
  ['10.0.0.0', 8],
  ['100.64.0.0', 10],
  ['127.0.0.0', 8],
  ['169.254.0.0', 16],
  ['172.16.0.0', 12],
  ['192.0.0.0', 24],
  ['192.0.2.0', 24],
  ['192.168.0.0', 16],
  ['198.18.0.0', 15],
  ['198.51.100.0', 24],
  ['203.0.113.0', 24],
  ['224.0.0.0', 4],
  ['240.0.0.0', 4],
];

/** Expand an IPv6 address to 8 hextets (handles `::` and an embedded dotted IPv4 tail). */
function expandV6(ip: string): number[] | null {
  let addr = ip.toLowerCase().split('%')[0];
  const v4Tail = /(\d+\.\d+\.\d+\.\d+)$/.exec(addr);
  if (v4Tail) {
    const n = v4ToInt(v4Tail[1]);
    addr =
      addr.slice(0, -v4Tail[1].length) +
      `${(n >>> 16).toString(16)}:${(n & 0xffff).toString(16)}`;
  }
  const [head, tail] = addr.split('::');
  const h = head ? head.split(':') : [];
  const t = tail !== undefined && tail !== '' ? tail.split(':') : [];
  const fill = addr.includes('::') ? 8 - h.length - t.length : 0;
  const parts = [...h, ...Array<string>(fill).fill('0'), ...t].map((x) =>
    parseInt(x, 16),
  );
  return parts.length === 8 &&
    parts.every((x) => Number.isInteger(x) && x >= 0 && x <= 0xffff)
    ? parts
    : null;
}

export function isPrivateAddress(ip: string): boolean {
  const kind = isIP(ip);
  if (kind === 4)
    return V4_BLOCKED.some(([base, bits]) => inV4(ip, base, bits));
  if (kind !== 6) return true; // not an IP at all → refuse

  const p = expandV6(ip);
  if (!p) return true;
  if (p.every((x) => x === 0)) return true; // ::
  if (p.slice(0, 7).every((x) => x === 0) && p[7] === 1) return true; // ::1
  // IPv4-mapped (::ffff:a.b.c.d) / IPv4-compatible (::a.b.c.d) / NAT64 (64:ff9b::/96)
  const embedsV4 =
    (p.slice(0, 5).every((x) => x === 0) && (p[5] === 0xffff || p[5] === 0)) ||
    (p[0] === 0x64 && p[1] === 0xff9b && p.slice(2, 6).every((x) => x === 0));
  if (embedsV4) {
    const v4 = `${p[6] >> 8}.${p[6] & 0xff}.${p[7] >> 8}.${p[7] & 0xff}`;
    return isPrivateAddress(v4);
  }
  if ((p[0] & 0xfe00) === 0xfc00) return true; // fc00::/7 unique-local
  if ((p[0] & 0xffc0) === 0xfe80) return true; // fe80::/10 link-local
  if ((p[0] & 0xff00) === 0xff00) return true; // ff00::/8 multicast
  if (p[0] === 0x2001 && p[1] === 0x0db8) return true; // documentation
  return false;
}

type Lookup = (host: string) => Promise<Array<{ address: string }>>;
const defaultLookup: Lookup = (host) =>
  dns.lookup(host, { all: true, verbatim: true });

/**
 * Resolve the URL's host and refuse if ANY resolved address is non-public.
 * (Literal IPs are checked directly; `localhost` names never reach DNS.)
 */
export async function assertPublicUrl(
  url: URL,
  lookup: Lookup = defaultLookup,
): Promise<void> {
  const host = url.hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (!host || host === 'localhost' || host.endsWith('.localhost'))
    throw new BlockedAddressError();

  const addresses = isIP(host)
    ? [host]
    : (await lookup(host).catch((): Array<{ address: string }> => [])).map(
        (a) => a.address,
      );
  if (addresses.length === 0) throw new Error('Cannot resolve host.');
  if (addresses.some(isPrivateAddress)) throw new BlockedAddressError();
}
