#!/bin/sh
set -eu
: "${A7_STACK_ENV_FILE:?Set absolute stack environment file}"
script_dir=$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)
compose() { docker compose --env-file "$A7_STACK_ENV_FILE" -f "$script_dir/compose.yml" "$@"; }
compose config --quiet
compose --profile release build api tools
compose run --rm certificates
compose run --rm tools ./node_modules/.bin/tsx -e 'const {validateEnvironment}=require("./src/common/config"); if(process.env.NODE_ENV!=="production")throw Error("Production mode required"); validateEnvironment(process.env); console.log("Production configuration passed");'
compose up -d --wait postgres
# Check real provider connectivity before migrations or replacing the API.
compose run --rm tools ./node_modules/.bin/tsx prisma/production-preflight.ts
# Migration failures stop the rollout and leave an existing API untouched.
compose run --rm tools npm run db:deploy
compose up -d --wait api caddy
compose exec -T api node -e 'fetch("http://127.0.0.1:4000/api/v1/health/ready").then(r=>{if(!r.ok)process.exit(1);console.log("API database readiness passed");}).catch(()=>process.exit(1));'
echo 'Containers ready. Verify public HTTPS and real email/image journeys before announcing launch.'
