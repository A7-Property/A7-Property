import 'dotenv/config';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { Client } from 'pg';
import nodemailer from 'nodemailer';
import { validateEnvironment } from '../src/common/config';

async function main() {
  if (process.env.NODE_ENV !== 'production') throw new Error('Production mode is required');
  const config = validateEnvironment(process.env);
  const database = new Client({ connectionString: config.DATABASE_URL, connectionTimeoutMillis: 10_000, query_timeout: 10_000 });
  const storage = new S3Client({ region: 'auto', endpoint: `https://${config.R2_ACCOUNT_ID}.r2.cloudflarestorage.com`, credentials: { accessKeyId: config.R2_ACCESS_KEY_ID!, secretAccessKey: config.R2_SECRET_ACCESS_KEY! }, maxAttempts: 1 });
  const mail = nodemailer.createTransport({ host: config.SMTP_HOST, port: Number(config.SMTP_PORT), secure: config.SMTP_SECURE === 'true', requireTLS: true, connectionTimeout: 10_000, greetingTimeout: 10_000, socketTimeout: 20_000, tls: { minVersion: 'TLSv1.2' }, auth: { user: config.SMTP_USER!, pass: config.SMTP_PASSWORD! } });
  try {
    await database.connect();
    const result = await database.query<{ ssl: boolean }>('SELECT ssl FROM pg_stat_ssl WHERE pid=pg_backend_pid()');
    if (!result.rows[0]?.ssl) throw new Error('Database connection is not encrypted');
    console.log('Database connectivity and TLS passed');
    await storage.send(new HeadBucketCommand({ Bucket: config.R2_BUCKET_NAME }), { abortSignal: AbortSignal.timeout(10_000) });
    await storage.send(new HeadBucketCommand({ Bucket: config.R2_PRIVATE_BUCKET_NAME }), { abortSignal: AbortSignal.timeout(10_000) });
    console.log('Public and private R2 bucket access passed; public exposure must be checked separately');
    await mail.verify();
    console.log('SMTP TLS/authentication passed; no email sent');
  } finally {
    await database.end().catch(() => undefined);
    storage.destroy();
    mail.close();
  }
}

void main().catch(() => {
  // Driver errors can contain connection details. Keep CLI output credential-free.
  console.error('Production preflight failed. Check configuration, network access and provider credentials. No email or image was sent.');
  process.exitCode = 1;
});
