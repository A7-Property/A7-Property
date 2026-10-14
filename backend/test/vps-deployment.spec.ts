import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, statSync, writeFileSync, chmodSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { resolve, join } from 'node:path';
import { validateEnvironment } from '../src/common/config';

describe('VPS secret initialization', () => {
  let directory: string;
  const script = resolve('deploy/vps/init-env.mjs');
  const run = (frontend = 'https://app.example.org') => execFileSync(process.execPath, [script, directory, 'api.example.org', frontend, 'operator@example.org'], { stdio: 'pipe' });
  beforeEach(() => { directory = mkdtempSync(join(tmpdir(), 'a7-vps-env-')); });
  afterEach(() => { rmSync(directory, { recursive: true, force: true }); });

  it('generates matching database credentials and separate random JWT secrets without printing them', () => {
    const output = run().toString();
    const parse = (name: string) => Object.fromEntries(readFileSync(join(directory, name), 'utf8').split('\n').filter(line => /^[A-Z_]+=/.test(line)).map(line => { const i = line.indexOf('='); return [line.slice(0, i), line.slice(i + 1)]; }));
    const backend = parse('backend.env');
    const database = parse('database.env');
    expect(new URL(backend.DATABASE_URL).password).toBe(database.POSTGRES_APP_PASSWORD);
    expect(database.POSTGRES_PASSWORD).not.toBe(database.POSTGRES_APP_PASSWORD);
    expect(new URL(backend.DATABASE_URL).searchParams.get('sslmode')).toBe('verify-full');
    expect(backend.JWT_ACCESS_SECRET).toHaveLength(96);
    expect(backend.JWT_ACCESS_SECRET).not.toBe(backend.JWT_REFRESH_SECRET);
    expect(output).not.toContain(backend.JWT_ACCESS_SECRET);
    expect(output).not.toContain(database.POSTGRES_PASSWORD);
    expect(statSync(directory).mode & 0o777).toBe(0o700);
    for (const name of ['backend.env', 'database.env', 'stack.env']) expect(statSync(join(directory, name)).mode & 0o777).toBe(0o600);
    // Remote storage/mail remain explicit operator configuration, never fake-ready.
    expect(() => validateEnvironment(backend)).toThrow('placeholder');
  });

  it('refuses to overwrite existing credentials', () => {
    run();
    const original = readFileSync(join(directory, 'backend.env'), 'utf8');
    expect(() => run()).toThrow();
    expect(readFileSync(join(directory, 'backend.env'), 'utf8')).toBe(original);
  });

  it('rejects a frontend URL with an insecure scheme or a route path', () => {
    expect(() => run('http://app.example.org')).toThrow();
    expect(() => run('https://app.example.org/dashboard')).toThrow();
  });
});


describe('VPS release provider gate', () => {
  it('stops before migrations or API replacement when provider checks fail', () => {
    const directory = mkdtempSync(join(tmpdir(), 'a7-release-gate-'));
    try {
      const log = join(directory, 'commands');
      const docker = join(directory, 'docker');
      writeFileSync(docker, '#!/bin/sh\nprintf "%s\\n" "$*" >> "$A7_TEST_COMMAND_LOG"\ncase "$*" in *production-preflight.ts*) exit 1;; esac\n');
      chmodSync(docker, 0o700);
      expect(() => execFileSync('sh', [resolve('deploy/vps/deploy.sh')], {
        env: { ...process.env, PATH: `${directory}:${process.env.PATH}`, A7_STACK_ENV_FILE: join(directory, 'stack.env'), A7_TEST_COMMAND_LOG: log }, stdio: 'pipe',
      })).toThrow();
      const commands = readFileSync(log, 'utf8');
      expect(commands).toContain('production-preflight.ts');
      expect(commands).not.toContain('npm run db:deploy');
      expect(commands).not.toContain('up -d --wait api caddy');
    } finally { rmSync(directory, { recursive: true, force: true }); }
  });
});
