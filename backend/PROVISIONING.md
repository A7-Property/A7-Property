# Account and infrastructure handoff

**Current deployment choice:** the owner will purchase a server. Use the
[VPS deployment kit](./deploy/vps/README.md). Render installation and its Blueprint
are optional alternatives, not requirements for the selected deployment path.

No live resource has been created. The candidate provider configuration is
[render.production.example.yaml](./render.production.example.yaml). It defines
one API and PostgreSQL 16 in Singapore. These are paid resources: confirm the
current provider quote and budget before applying. Automatic redeploy is disabled
so a source push cannot start a runtime before migrations are applied.

The file uses the runtime Docker image, which deliberately lacks Prisma CLI.
Run release migrations from the separately built `tools` image inside an approved
private network or temporarily allowlist the release runner's exact egress IP.
The database denies external connections by default. Do not add a public-all IP
rule. Follow [DEPLOYMENT.md](./DEPLOYMENT.md) for the migration and admin commands.
Supply a TLS database URL through Render secrets; the Blueprint does not compose
or expose database credentials. Check resource names do not collide with existing
services before applying.

## Needed from the owner

- Install/connect Render and Resend so the deployment can use the owner's accounts.
- Provide an accessible source repository containing this validated backend.
  The current downloaded directory has no Git metadata or configured remote.
- Confirm the monthly budget before resource creation or domain purchases.
- Provide the domain and DNS access for API, image storage and verified email sender.
- Provide Cloudflare account access to create R2 and its public image domain.
  Store bucket-scoped S3 credentials in the deployment secret manager.
- Restore access to the existing Sites project in `.openai/hosting.json` using
  its owner account. The current Sites connector returned `project_not_found`
  for that exact project ID on 2026-10-04; no replacement project was created.

Passwords and API secrets should never be pasted into chat. Enter them through
the provider's secret manager or authenticated account connection.

## Provider details

Resend SMTP uses `smtp.resend.com`, user `resend`, port 587 with STARTTLS and the
Resend API key as password. A verified sending domain is required. Registration
and password-reset emails must be tested with that verified domain before launch.

The proposed API uses one replica, so Redis is optional. Before scaling out,
provision shared Redis and set `REDIS_URL`; retain scheduled jobs on exactly one
replica. Confirm the actual trusted proxy count before setting `TRUST_PROXY_HOPS`.

Sources: [Render Blueprint specification](https://render.com/docs/blueprint-spec),
[Render Docker deployment](https://render.com/docs/docker),
[Resend SMTP](https://resend.com/docs/send-with-smtp),
[Cloudflare R2 setup](https://developers.cloudflare.com/r2/get-started/).
