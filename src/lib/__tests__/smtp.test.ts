import { describe, expect, it } from 'vitest';
import { smtpConfig } from '../smtp';

const configured = {
  NODE_ENV: 'production' as const,
  SMTP_HOST: 'smtp-relay.brevo.com',
  SMTP_PORT: '587',
  SMTP_USER: 'test-login',
  SMTP_PASSWORD: 'test-password',
  SMTP_FROM_ADDRESS: 'notifications@klarc.com',
  SMTP_FROM_NAME: 'Klarc',
};

describe('smtpConfig', () => {
  it('requires authenticated, certificate-validated STARTTLS without build-time network access', () => {
    expect(smtpConfig(configured)).toEqual({
      defaultFromAddress: 'notifications@klarc.com',
      defaultFromName: 'Klarc',
      skipVerify: true,
      transportOptions: {
        host: 'smtp-relay.brevo.com',
        port: 587,
        secure: false,
        requireTLS: true,
        auth: { user: 'test-login', pass: 'test-password' },
        tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
      },
    });
  });

  it.each(Object.keys(configured).filter((key) => key !== 'NODE_ENV'))(
    'rejects missing %s rather than silently logging production email',
    (key) => {
      expect(() => smtpConfig({ ...configured, [key]: '' })).toThrow(key);
    },
  );

  it.each(['465', '0', '65536', '587junk', '1.5'])(
    'rejects invalid or implicit-TLS port %s',
    (port) => {
      expect(() => smtpConfig({ ...configured, SMTP_PORT: port })).toThrow('SMTP_PORT');
    },
  );

  it('allows console email only for an entirely unconfigured development environment', () => {
    expect(smtpConfig({ NODE_ENV: 'development' })).toBeUndefined();
    expect(() => smtpConfig({ NODE_ENV: 'development', SMTP_HOST: 'localhost' })).toThrow(
      'SMTP_PORT',
    );
    expect(() => smtpConfig({ NODE_ENV: 'production' })).toThrow('SMTP_HOST');
  });
});
