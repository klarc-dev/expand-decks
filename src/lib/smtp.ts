import type { NodemailerAdapterArgs } from '@payloadcms/email-nodemailer';

/** Server-only SMTP settings. Never import this module from client components. */
export function smtpConfig(
  env: NodeJS.ProcessEnv = process.env,
): NodemailerAdapterArgs | undefined {
  const keys = [
    'SMTP_HOST',
    'SMTP_PORT',
    'SMTP_USER',
    'SMTP_PASSWORD',
    'SMTP_FROM_ADDRESS',
    'SMTP_FROM_NAME',
  ] as const;
  if (env.NODE_ENV !== 'production' && keys.every((key) => !env[key])) return undefined;

  for (const key of keys) {
    if (!env[key]?.trim()) throw new Error(`Missing required SMTP configuration: ${key}`);
  }
  const port = Number(env.SMTP_PORT);
  if (!/^\d+$/.test(env.SMTP_PORT!) || port < 1 || port > 65535 || port === 465) {
    throw new Error('SMTP_PORT must be a STARTTLS port (1–65535, not implicit-TLS port 465)');
  }

  return {
    defaultFromAddress: env.SMTP_FROM_ADDRESS!,
    defaultFromName: env.SMTP_FROM_NAME!,
    // Config is also compiled during builds/migrations. Do not connect there;
    // Nodemailer still authenticates and requires verified TLS on every send.
    skipVerify: true,
    transportOptions: {
      host: env.SMTP_HOST!,
      port,
      secure: false,
      requireTLS: true,
      auth: { user: env.SMTP_USER!, pass: env.SMTP_PASSWORD! },
      tls: { rejectUnauthorized: true, minVersion: 'TLSv1.2' },
    },
  };
}
