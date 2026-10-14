# A7 self-hosted VPS deployment

This is the deployment path for an owner-purchased server. Render is optional
and not required. The existing frontend remains on Sites; this stack hosts the
NestJS API, PostgreSQL 16 and HTTPS ingress. R2 and transactional SMTP remain
external services required by the existing production contract.

## Before purchasing

Use an Ubuntu 24.04 LTS VPS with a public IP and SSH access. An initial sizing
estimate is 4 vCPU, 8 GB RAM and 80 GB SSD, including local Docker builds and the
database. This is a planning estimate, not a load-test result or capacity guarantee.
Choose a region close to your users, and confirm provider snapshots, recovery
console, outbound SMTP access and storage pricing before buying. Reserve a domain
for `api.your-domain` and `images.your-domain`, and a verified email sender domain.

Prepared here: Docker images, private PostgreSQL network, verified database TLS,
Caddy ingress, deployment ordering, secret generation, backup/restore scripts and
an optional daily backup timer. Server access, DNS, real R2/SMTP, off-server backups
and public-browser staging can only be verified once those resources exist.

## Server baseline

Create a non-root SSH administrator using an SSH key. Confirm a second SSH session
works before disabling root/password SSH login. Enable automatic security updates,
provider monitoring and a firewall allowing only SSH from the operator's network
and public ports 80/443. PostgreSQL and API ports are never published by this stack.
Docker-published ports can bypass UFW; use the provider firewall as well.

Install Docker Engine and Compose from Docker's official Ubuntu repository, and
Node 22.18+ for the secret generator. Docker access grants root-equivalent power;
only trusted operators should receive it. Put the release source at `/opt/a7`.
Do not copy local `node_modules`, `.env` files or generated build output into Git.

## Secrets and DNS

Run from the repository root, supplying your actual domains/contact:

```sh
sudo node backend/deploy/vps/init-env.mjs /etc/a7 api.your-domain https://your-frontend-domain operator@your-domain
```

The directory must be empty. Three files are generated with mode 0600, separate
random JWT secrets and a matching random database password. Nothing secret is
printed. Fill R2 and SMTP settings in `/etc/a7/backend.env`; use a bucket-scoped
R2 key. Set `MAIL_FROM` to your verified sending domain. Blank Redis/admin settings
are supported. A single API replica needs no Redis. Keep `ENABLE_JOBS=true` on
exactly one replica.

The database administrator `a7_admin` has a separate generated password.
The API connects as `a7`, which cannot create databases, create roles or act as a
superuser. Initial role setup runs only on an empty database volume; it does not
silently alter existing accounts on later deployments.

Set matching immutable release identifiers in `stack.env` (`A7_RELEASE_TAG`) and
`backend.env` (`APP_VERSION`). A Git revision is preferred; this downloaded
workspace has no Git metadata, so supply a recorded release identifier until a
source repository is connected. Never re-use a release tag for different source.
For the local database, retain `sslmode=verify-full` and hostname `postgres`.

Point the API domain's A record at the VPS IP; add AAAA only when IPv6 actually
works. This configuration assumes direct Caddy ingress and one proxy hop. If you
add Cloudflare proxying or another load balancer, review trusted proxy hops and
origin restrictions before changing the topology. Keep the Caddy `/data` volume
persistent so certificates survive restarts. Do not enable a public R2 bucket
until you intend uploaded property images to be publicly viewable.

## First deploy and later releases

```sh
export A7_STACK_ENV_FILE=/etc/a7/stack.env
sudo --preserve-env=A7_STACK_ENV_FILE sh backend/deploy/vps/deploy.sh
```

The script builds images, initializes database TLS, validates production config,
starts the database, applies migrations and then starts API/Caddy. It stops on
failure. Existing database passwords are not changed just by editing the env file;
rotate them with a reviewed SQL/account procedure, then update the API secret.
Never run `docker compose down -v` on the production project.

To create the first administrator, temporarily add its bootstrap credentials to
`backend.env`, then run from the repository root:

```sh
sudo docker compose --env-file /etc/a7/stack.env -f backend/deploy/vps/compose.yml run --rm tools npm run db:bootstrap-admin
```

Remove those two variables afterwards. Do not run demo seeds. Check health through
`https://YOUR_API_DOMAIN/api/v1/health/ready`. Verify Swagger `/api/docs` is absent,
CORS allows only your frontend, refresh cookies are Secure/HttpOnly and image
uploads can be fetched from the intended public image domain.

Before launch, verify real service connectivity without sending email or uploading:

```sh
sudo docker compose --env-file /etc/a7/stack.env -f backend/deploy/vps/compose.yml run --rm tools ./node_modules/.bin/tsx prisma/production-preflight.ts
```

This checks database TLS, R2 bucket access and SMTP authentication. It does not
prove email delivery, public image access or browser behavior; still run the launch
journeys below. Failures do not print provider errors that could contain secrets.

## Backup, restore and monitoring

```sh
export A7_STACK_ENV_FILE=/etc/a7/stack.env
export A7_BACKUP_DIR=/var/backups/a7
sudo --preserve-env=A7_STACK_ENV_FILE,A7_BACKUP_DIR sh backend/deploy/vps/backup.sh
sudo --preserve-env=A7_STACK_ENV_FILE sh backend/deploy/vps/restore-test.sh /var/backups/a7/CHOSEN_BACKUP.dump
```

Restore testing creates a new temporary database, checks migration records and
drops only that temporary database. It never replaces the application database.
A local backup alone cannot protect against server loss. Configure encrypted,
versioned off-server backups and retention before launch; verify retrieval and
restore from the off-server destination. Keep encryption recovery keys off the
VPS. Snapshot backups and R2 objects require their own recovery policies.

Optional daily scheduling on the purchased server: copy `backup.env.example` to
`/etc/a7/backup.env`, copy the service/timer files to `/etc/systemd/system`, run
`systemctl daemon-reload`, then `systemctl enable --now a7-backup.timer`. The timer
runs around 02:00 UTC (10:00 Malaysia), and makes only local backups. Integrate
failure alerts and off-server transfer before relying on it. No timer is installed
or activated by this repository.

Alert on API readiness/5xx, disk usage, expired TLS, database connection exhaustion,
mail errors and backup failures. Check the private database certificate monthly:
`docker compose ... run --rm certificates` refuses a cert expiring within 30 days.
Its initial lifetime is one year. Rotate with a planned maintenance window:
stop API/Postgres, securely retain the old TLS/CA volumes for rollback, replace
only their certificate files using the certificates helper, then restart both
services. Clients trust the public certificate volume; API never mounts the
private database key. Back up the database before certificate work. Do not delete
the database data volume.

Keep the previous release images. Application rollback is valid only when the old
runtime is compatible with the migrated schema. Do not automatically undo database
migrations; review a forward fix or a tested restore with a recovery/data-loss plan.

## Launch gates after server purchase

Test register, delivered verification/reset email, login/refresh/logout-all,
R2 upload, listing create/publish/pause/archive, search, saves, inquiry, viewing,
messaging and moderation. Set frontend `NEXT_PUBLIC_API_URL` to your API's
`https://YOUR_API_DOMAIN/api/v1`, then rebuild/deploy the frontend via Sites.
Check English/Myanmar and seeker/lister journeys in real mobile and desktop
browsers. Public HTTPS and browser cookie behavior are not proven by local Docker
checks. Restore access to the existing Sites owner account before frontend deploy.

References: [Docker Ubuntu installation](https://docs.docker.com/engine/install/ubuntu/),
[Caddy HTTPS](https://caddyserver.com/docs/automatic-https),
[PostgreSQL 16 TLS](https://www.postgresql.org/docs/16/ssl-tcp.html).

The deployment script now verifies PostgreSQL TLS, R2 bucket access and SMTP authentication before migrations and API replacement. It sends no mail and uploads no images. Provider errors stop deployment; full delivered-email and upload journeys still belong to staging verification.
