#!/usr/bin/env bash
set -euo pipefail

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "$SCRIPT_DIR/.." && pwd)"
STACK_DIR="$SCRIPT_DIR/supabase"

die() {
  echo "Error: $*" >&2
  exit 1
}

if ! command -v docker >/dev/null 2>&1 || ! docker compose version >/dev/null 2>&1; then
  if [[ ! -t 0 ]]; then
    die "Docker with Compose is required. Install Docker, then run this script again."
  fi
  read -r -p "Docker is missing. Install Docker Engine and Compose now? [Y/n] " answer
  if [[ "$answer" =~ ^[Nn] ]]; then
    die "Install Docker and Compose, then run this script again."
  fi
  if [[ "$EUID" -eq 0 ]]; then
    "$SCRIPT_DIR/install-docker.sh"
  elif command -v sudo >/dev/null 2>&1; then
    sudo "$SCRIPT_DIR/install-docker.sh"
  else
    die "Install Docker Engine and Compose for your system, then run this script again."
  fi
fi

docker info >/dev/null 2>&1 || die "Docker is installed but not accessible. Check that the Docker service is running and your user has permission to use it."

if [[ ! -f "$STACK_DIR/.env" ]] || grep -q '^POSTGRES_PASSWORD=your-super-secret-and-long-postgres-password$' "$STACK_DIR/.env"; then
  echo "Preparing local Supabase settings and generating development secrets..."
  if [[ ! -f "$STACK_DIR/.env" ]]; then
    cp "$STACK_DIR/.env.example" "$STACK_DIR/.env"
  fi
  (
    cd "$STACK_DIR"
    sh utils/generate-keys.sh --update-env
    sh utils/add-new-auth-keys.sh --update-env
  )
  chmod 600 "$STACK_DIR/.env"
fi

set_env_value() {
  local key="$1" value="$2" escaped
  escaped="$(printf '%s' "$value" | sed 's/[&|]/\\&/g')"
  if grep -q "^${key}=" "$STACK_DIR/.env"; then
    sed -i "s|^${key}=.*|${key}=${escaped}|" "$STACK_DIR/.env"
  else
    printf '%s=%s\n' "$key" "$value" >>"$STACK_DIR/.env"
  fi
}

set_env_value COMPOSE_FILE 'docker-compose.yml:../compose.app.yaml'
DEFAULT_HOST="$(sed -n 's|^SUPABASE_PUBLIC_URL=http://||p' "$STACK_DIR/.env" | sed 's/:8000$//' | head -n 1)"
DEFAULT_HOST="${DEFAULT_HOST:-localhost}"
if [[ ! -t 0 ]]; then
  LAN_HOST="$DEFAULT_HOST"
else
  read -r -p "Host name/IP for other devices [${DEFAULT_HOST}]: " LAN_HOST
  LAN_HOST="${LAN_HOST:-$DEFAULT_HOST}"
fi
if [[ "$LAN_HOST" == *:* && "$LAN_HOST" != \[*\] ]]; then
  LAN_HOST="[$LAN_HOST]"
fi

set_env_value SUPABASE_PUBLIC_URL "http://${LAN_HOST}:8000"
set_env_value API_EXTERNAL_URL "http://${LAN_HOST}:8000/auth/v1"
set_env_value SITE_URL "http://${LAN_HOST}:3000"
set_env_value ADDITIONAL_REDIRECT_URLS "http://localhost:3000/**,http://${LAN_HOST}:3000/**"
set_env_value APP_PUBLIC_URL "http://${LAN_HOST}:3000"
set_env_value ENABLE_EMAIL_AUTOCONFIRM true

echo "Starting Supabase services so the database extensions and Storage schema are initialized..."
(
  cd "$STACK_DIR"
  mapfile -t SUPABASE_SERVICES < <(docker compose config --services | grep -vx app)
  docker compose up -d --wait "${SUPABASE_SERVICES[@]}"
)

MIGRATION_MARKER="$(cd "$STACK_DIR" && docker compose exec -T db psql -U postgres -d postgres -Atc "SELECT to_regclass('public.nds_dev_migrations_complete') IS NOT NULL")"
if [[ "$MIGRATION_MARKER" != "t" ]]; then
  EXISTING_APP_SCHEMA="$(cd "$STACK_DIR" && docker compose exec -T db psql -U postgres -d postgres -Atc "SELECT to_regclass('public.profiles') IS NOT NULL")"
  if [[ "$EXISTING_APP_SCHEMA" == "t" ]]; then
    die "This database contains a partial or previous NDS migration but has no completion marker. To avoid damaging data, the installer stopped. For a new local development database, back up anything you need, then run '(cd docker/supabase && sh reset.sh)' and rerun this installer."
  fi
  echo "Applying NDS Maintenance database migrations..."
  if ! (
    cd "$STACK_DIR"
    docker compose exec -T db sh -ec '
      for migration in /project-migrations/*.sql; do
        echo "Applying $(basename "$migration")"
        psql -v ON_ERROR_STOP=1 -U postgres -d postgres -f "$migration"
      done
      psql -v ON_ERROR_STOP=1 -U postgres -d postgres -c \
        "CREATE TABLE public.nds_dev_migrations_complete (completed_at timestamptz NOT NULL DEFAULT now())"
    '
  ); then
    die "A project migration failed. The local database may now be partially migrated. Review the error, then reset the local development database with '(cd docker/supabase && sh reset.sh)' before retrying."
  fi
fi

echo "Starting the app and remaining Supabase services..."
(
  cd "$STACK_DIR"
  sh run.sh start
)

cat <<EOF

Development environment is running.
  App:          http://${LAN_HOST}:3000
  Supabase API: http://${LAN_HOST}:8000
  Studio:       http://${LAN_HOST}:8000 (login: values in docker/supabase/.env)

To stop:   (cd docker/supabase && sh run.sh stop)
To logs:   (cd docker/supabase && sh run.sh logs)
EOF
