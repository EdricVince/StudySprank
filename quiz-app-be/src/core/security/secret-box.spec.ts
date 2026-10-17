import { open, seal } from './secret-box';

describe('secret-box', () => {
  it('round-trips a value and never stores it in plain text', () => {
    const sealed = seal('sk-ant-example-key-123456', 'jwt-secret');
    expect(sealed).not.toContain('sk-ant');
    expect(open(sealed, 'jwt-secret')).toBe('sk-ant-example-key-123456');
  });

  it('uses a fresh IV each time', () => {
    expect(seal('same', 's')).not.toBe(seal('same', 's'));
  });

  it('returns null with a different secret or a tampered value', () => {
    const sealed = seal('value', 'secret-a');
    expect(open(sealed, 'secret-b')).toBeNull();
    expect(open(sealed.slice(0, -4) + 'AAAA', 'secret-a')).toBeNull();
    expect(open('garbage', 'secret-a')).toBeNull();
  });
});
