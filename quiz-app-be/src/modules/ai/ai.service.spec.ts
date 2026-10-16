import {
  BadRequestException,
  ServiceUnavailableException,
} from '@nestjs/common';
import { AiService } from './ai.service';
import * as ssrf from '../../core/security/ssrf';

/**
 * Unit tests for the input-validation and SSRF-guard branches of scanContent —
 * these all throw before any Anthropic call, so no network/API key is needed.
 */
describe('AiService.scanContent — validation & SSRF guard', () => {
  let svc: AiService;
  const originalKey = process.env.ANTHROPIC_API_KEY;

  beforeEach(() => {
    svc = new AiService();
  });
  afterAll(() => {
    process.env.ANTHROPIC_API_KEY = originalKey;
  });

  it('rejects an invalid URL', async () => {
    await expect(svc.scanContent({ url: 'not a url' })).rejects.toThrow(
      'Invalid URL format',
    );
  });

  it('rejects a non-HTTP(S) protocol', async () => {
    await expect(
      svc.scanContent({ url: 'ftp://example.com/x' }),
    ).rejects.toThrow('Only HTTP and HTTPS');
  });

  it('blocks localhost / private-network addresses (SSRF)', async () => {
    const blocked = [
      'http://localhost/x',
      'http://127.0.0.1/x',
      'http://10.0.0.5/x',
      'http://192.168.1.1/x',
      'http://169.254.1.1/x',
      'http://172.16.0.1/x',
    ];
    for (const url of blocked) {
      await expect(svc.scanContent({ url })).rejects.toThrow(
        'private or local network',
      );
    }
  });

  it('blocks IPv6 loopback, IPv4-mapped and 0.0.0.0 targets (SSRF)', async () => {
    for (const url of [
      'http://[::1]/x',
      'http://[::ffff:127.0.0.1]/x',
      'http://0.0.0.0/x',
      'http://[fe80::1]/x',
    ]) {
      await expect(svc.scanContent({ url })).rejects.toThrow(
        'private or local network',
      );
    }
  });

  it('does not follow redirects (a public URL cannot bounce to an internal one)', async () => {
    const guard = jest
      .spyOn(ssrf, 'assertPublicUrl')
      .mockResolvedValue(undefined);
    const fetchSpy = jest
      .spyOn(global, 'fetch')
      .mockResolvedValue({ status: 302, text: async () => '' } as any);
    try {
      await expect(
        svc.scanContent({ url: 'https://public.example.com/r' }),
      ).rejects.toThrow('redirects are not followed');
      expect(fetchSpy.mock.calls[0][1]).toMatchObject({ redirect: 'manual' });
    } finally {
      guard.mockRestore();
      fetchSpy.mockRestore();
    }
  });

  it('maps bad input to 400 and a missing AI key to 503 (was: everything became 500)', async () => {
    await expect(svc.scanContent({ url: 'not a url' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    await expect(
      svc.scanContent({ url: 'http://127.0.0.1/' }),
    ).rejects.toBeInstanceOf(BadRequestException);
    await expect(svc.scanContent({ text: 'short' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    process.env.ANTHROPIC_API_KEY = '';
    await expect(
      svc.scanContent({ text: 'x'.repeat(120) }),
    ).rejects.toBeInstanceOf(ServiceUnavailableException);
  });

  it('rejects too-little text content', async () => {
    await expect(svc.scanContent({ text: 'short' })).rejects.toThrow(
      'Not enough content',
    );
  });

  it('reports when AI is not configured for otherwise-valid input', async () => {
    process.env.ANTHROPIC_API_KEY = ''; // no client
    await expect(svc.scanContent({ text: 'x'.repeat(120) })).rejects.toThrow(
      'AI service not configured',
    );
  });
});
