import { randomBytes } from 'node:crypto';
import { mkdir, readFile, writeFile, readdir, chmod } from 'node:fs/promises';
import { isAbsolute } from 'node:path';
const [directory, apiDomain, frontendOrigin, contact] = process.argv.slice(2);
if (!directory || !isAbsolute(directory) || /[\r\n]/.test(directory) || !apiDomain || !frontendOrigin || !contact) throw new Error('Usage: node init-env.mjs /absolute/secret-directory api.domain https://frontend.domain contact-email');
const api = new URL(`https://${apiDomain}`);
const frontend = new URL(frontendOrigin);
if (api.host !== apiDomain || api.pathname !== '/' || api.search || api.hash || api.username || api.password || frontend.protocol !== 'https:' || frontend.pathname !== '/' || frontend.search || frontend.hash || frontend.username || frontend.password || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact)) throw new Error('Use a hostname, HTTPS frontend origin, and valid contact email');
await mkdir(directory, { recursive: true, mode: 0o700 });
if ((await readdir(directory)).length) throw new Error('Use an empty secret directory; existing files will not be overwritten');
await chmod(directory, 0o700);
const databasePassword = randomBytes(32).toString('hex');
const administratorPassword = randomBytes(32).toString('hex');
const values = {
 DATABASE_URL: `postgresql://a7:${databasePassword}@postgres:5432/a7_property?sslmode=verify-full`,
 JWT_ACCESS_SECRET: randomBytes(48).toString('hex'), JWT_REFRESH_SECRET: randomBytes(48).toString('hex'),
 FRONTEND_URL: frontend.origin, BACKEND_PUBLIC_URL: api.origin, APP_VERSION: 'initial-release', REDIS_URL: '',
};
let backend = await readFile(new URL('../../.env.production.example', import.meta.url), 'utf8');
backend = backend.split('\n').map(line => {const key=line.split('=')[0];return Object.hasOwn(values,key)?`${key}=${values[key]}`:line;}).join('\n');
await writeFile(`${directory}/backend.env`,backend,{flag:'wx',mode:0o600});
await writeFile(`${directory}/database.env`,`POSTGRES_DB=a7_property\nPOSTGRES_USER=a7_admin\nPOSTGRES_PASSWORD=${administratorPassword}\nPOSTGRES_APP_PASSWORD=${databasePassword}\nPOSTGRES_INITDB_ARGS=--auth-host=scram-sha-256\n`,{flag:'wx',mode:0o600});
await writeFile(`${directory}/stack.env`,`A7_RELEASE_TAG=initial-release\nA7_BACKEND_ENV_FILE=${directory}/backend.env\nA7_DATABASE_ENV_FILE=${directory}/database.env\nAPI_DOMAIN=${apiDomain}\nACME_EMAIL=${contact}\n`,{flag:'wx',mode:0o600});
console.log('Created restricted secret files. Fill R2/SMTP settings and set an immutable release tag before deployment. No secrets printed.');
