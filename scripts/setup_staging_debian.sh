#!/usr/bin/env bash
set -Eeuo pipefail

#
# One-shot setup for staging on Debian + Docker Compose.
# Idempotent: safe to re-run after initial provisioning.
#
# Example:
#   sudo bash scripts/setup_staging_debian.sh \
#     --repo-url git@github.com:your-org/office-management.git \
#     --domain staging.example.com
#

REPO_URL="git@github.com:radiantbald/office-management.git"
APP_DIR="/opt/office-management"
APP_USER="deploy"
BRANCH="staging"
DOMAIN="staging.office-management.local"
PUBLIC_SCHEME="http"
WEB_PORT="8080"
API_PORT="8081"
POSTGRES_DB="office_staging"
POSTGRES_USER="office_staging"
ENV_FILE_NAME=".env"
SKIP_UFW="false"
NGINX_SITE_NAME="office-management-staging"
DEFAULT_POSTGRES_PASSWORD="fGkCDCjMqDnK8e63rVVKPX72EhyYutfB1eqO/Tc7q40="
DEFAULT_OFFICE_JWT_SECRET="T5A+bqW/L8+kACn6g4IELQTBwWgU7k9EYhcRDwyHiuE="
DEFAULT_OFFICE_REFRESH_PEPPER="DN/k8FaJHHq4OSZSICiNYKbpAj6cOTzGbJLam9XFqYI="

usage() {
  cat <<'EOF'
Usage:
  sudo bash scripts/setup_staging_debian.sh [options]

Optional:
  --repo-url <git_url>           Git URL (default: git@github.com:radiantbald/office-management.git)
  --app-dir <path>               Project directory (default: /opt/office-management)
  --app-user <user>              Linux user for app ownership (default: deploy)
  --branch <branch>              Git branch to deploy (default: staging)
  --domain <domain>              Public staging domain (default: localhost)
  --web-port <port>              Frontend port (default: 8080)
  --api-port <port>              API port on host (default: 8081)
  --public-scheme <http|https>   App base URL scheme (default: http)
  --postgres-db <name>           Postgres DB name (default: office_staging)
  --postgres-user <user>         Postgres DB user (default: office_staging)
  --env-file-name <name>         Env file name in app dir (default: .env)
  --skip-ufw                     Do not change firewall rules
  --nginx-site-name <name>       Nginx site config name (default: office-management-staging)
  -h, --help                     Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --repo-url) REPO_URL="${2:-}"; shift 2 ;;
    --app-dir) APP_DIR="${2:-}"; shift 2 ;;
    --app-user) APP_USER="${2:-}"; shift 2 ;;
    --branch) BRANCH="${2:-}"; shift 2 ;;
    --domain) DOMAIN="${2:-}"; shift 2 ;;
    --web-port) WEB_PORT="${2:-}"; shift 2 ;;
    --api-port) API_PORT="${2:-}"; shift 2 ;;
    --public-scheme) PUBLIC_SCHEME="${2:-}"; shift 2 ;;
    --postgres-db) POSTGRES_DB="${2:-}"; shift 2 ;;
    --postgres-user) POSTGRES_USER="${2:-}"; shift 2 ;;
    --env-file-name) ENV_FILE_NAME="${2:-}"; shift 2 ;;
    --skip-ufw) SKIP_UFW="true"; shift 1 ;;
    --nginx-site-name) NGINX_SITE_NAME="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *)
      echo "Unknown argument: $1" >&2
      usage
      exit 1
      ;;
  esac
done

if [[ "$PUBLIC_SCHEME" != "http" && "$PUBLIC_SCHEME" != "https" ]]; then
  echo "Error: --public-scheme must be http or https" >&2
  exit 1
fi

if [[ "${EUID}" -ne 0 ]]; then
  echo "Run as root: sudo bash scripts/setup_staging_debian.sh ..." >&2
  exit 1
fi

if [[ ! -f /etc/debian_version ]]; then
  echo "This script supports Debian only." >&2
  exit 1
fi

log() { echo "[setup] $*"; }

install_base_packages() {
  log "Installing base packages..."
  apt-get update -y
  DEBIAN_FRONTEND=noninteractive apt-get install -y \
    ca-certificates curl gnupg lsb-release git ufw fail2ban openssl nginx
}

install_docker() {
  if command -v docker >/dev/null 2>&1 && docker compose version >/dev/null 2>&1; then
    log "Docker + Compose already installed."
    return
  fi

  log "Installing Docker + Compose plugin..."
  install -m 0755 -d /etc/apt/keyrings
  if [[ ! -f /etc/apt/keyrings/docker.gpg ]]; then
    curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg
  fi

  local codename
  codename="$(. /etc/os-release && echo "${VERSION_CODENAME}")"
  cat >/etc/apt/sources.list.d/docker.list <<EOF
deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian ${codename} stable
EOF

  apt-get update -y
  DEBIAN_FRONTEND=noninteractive apt-get install -y \
    docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
}

ensure_app_user() {
  if id -u "$APP_USER" >/dev/null 2>&1; then
    log "User $APP_USER already exists."
  else
    log "Creating user $APP_USER..."
    adduser --disabled-password --gecos "" "$APP_USER"
  fi

  getent group docker >/dev/null 2>&1 || groupadd docker
  usermod -aG docker "$APP_USER"
}

configure_firewall() {
  if [[ "$SKIP_UFW" == "true" ]]; then
    log "Skipping UFW configuration."
    return
  fi

  log "Configuring UFW (OpenSSH, 80, 443)..."
  ufw allow OpenSSH >/dev/null 2>&1 || true
  ufw allow 80/tcp >/dev/null 2>&1 || true
  ufw allow 443/tcp >/dev/null 2>&1 || true
  ufw --force enable >/dev/null 2>&1 || true
}

ensure_repo_checkout() {
  log "Preparing repository in $APP_DIR..."
  mkdir -p "$APP_DIR"
  chown -R "$APP_USER:$APP_USER" "$APP_DIR"

  if [[ ! -d "$APP_DIR/.git" ]]; then
    sudo -u "$APP_USER" git clone "$REPO_URL" "$APP_DIR"
  fi

  pushd "$APP_DIR" >/dev/null
  sudo -u "$APP_USER" git fetch --all --prune
  sudo -u "$APP_USER" git checkout "$BRANCH"
  sudo -u "$APP_USER" git pull origin "$BRANCH"
  popd >/dev/null
}

ensure_env_file() {
  local env_file="$APP_DIR/$ENV_FILE_NAME"
  local pg_password jwt_secret refresh_pepper
  local auth_cookie_domain

  if [[ -f "$env_file" ]]; then
    log "Reusing existing env file: $env_file"
    set -a
    # shellcheck disable=SC1090
    source "$env_file"
    set +a
  fi

  pg_password="${POSTGRES_PASSWORD:-$DEFAULT_POSTGRES_PASSWORD}"
  jwt_secret="${OFFICE_JWT_SECRET:-$DEFAULT_OFFICE_JWT_SECRET}"
  refresh_pepper="${OFFICE_REFRESH_PEPPER:-$DEFAULT_OFFICE_REFRESH_PEPPER}"
  auth_cookie_domain="$DOMAIN"
  if [[ "$DOMAIN" == "localhost" || "$DOMAIN" == "127.0.0.1" ]]; then
    auth_cookie_domain=""
  fi

  cat >"$env_file" <<EOF
# Auto-generated by setup_staging_debian.sh
POSTGRES_DB=${POSTGRES_DB}
POSTGRES_USER=${POSTGRES_USER}
POSTGRES_PASSWORD=${pg_password}
DATABASE_URL=postgres://${POSTGRES_USER}:${pg_password}@db:5432/${POSTGRES_DB}?sslmode=disable

PORT=8080
WEB_PORT=${WEB_PORT}
API_PORT=${API_PORT}
APP_ENV=staging
APP_BASE_URL=${PUBLIC_SCHEME}://${DOMAIN}

OFFICE_JWT_SECRET=${jwt_secret}
OFFICE_REFRESH_PEPPER=${refresh_pepper}
OFFICE_ACCESS_TTL_MINUTES=10
OFFICE_REFRESH_TTL_DAYS=30
AUTH_COOKIE_SAMESITE=lax
AUTH_COOKIE_DOMAIN=${auth_cookie_domain}
EOF

  chown "$APP_USER:$APP_USER" "$env_file"
  chmod 600 "$env_file"
}

deploy_compose_stack() {
  log "Building and starting Docker Compose stack..."
  pushd "$APP_DIR" >/dev/null
  sudo -u "$APP_USER" docker compose --env-file "$APP_DIR/$ENV_FILE_NAME" up -d --build --remove-orphans
  popd >/dev/null
}

configure_nginx() {
  local site_file="/etc/nginx/sites-available/${NGINX_SITE_NAME}.conf"
  local domain_server_name="$DOMAIN"
  if [[ "$DOMAIN" == "localhost" || "$DOMAIN" == "127.0.0.1" ]]; then
    domain_server_name="_"
  fi

  log "Configuring nginx reverse proxy..."
  cat >"$site_file" <<EOF
server {
    listen 80;
    server_name ${domain_server_name};

    # Conservative defaults for reverse proxy with websocket support.
    location / {
        proxy_pass http://127.0.0.1:${WEB_PORT};
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host \$host;
        proxy_set_header X-Real-IP \$remote_addr;
        proxy_set_header X-Forwarded-For \$proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto \$scheme;
    }
}
EOF

  ln -sfn "$site_file" "/etc/nginx/sites-enabled/${NGINX_SITE_NAME}.conf"
  if [[ -f /etc/nginx/sites-enabled/default ]]; then
    rm -f /etc/nginx/sites-enabled/default
  fi

  nginx -t
  systemctl enable nginx
  systemctl restart nginx
}

post_checks() {
  log "Running quick health checks..."
  pushd "$APP_DIR" >/dev/null
  sudo -u "$APP_USER" docker compose --env-file "$APP_DIR/$ENV_FILE_NAME" ps || true
  popd >/dev/null

  curl -fsS "http://127.0.0.1/" >/dev/null || {
    log "Warning: nginx endpoint did not answer on http://127.0.0.1/"
  }

  if [[ "$PUBLIC_SCHEME" == "https" ]]; then
    log "Note: HTTPS selected, but TLS certificate automation is not included in this script."
    log "Set up certbot/caddy or put staging behind a TLS-terminating load balancer."
  fi
}

show_post_setup() {
  cat <<EOF

Setup completed.

Project:      $APP_DIR
Branch:       $BRANCH
Env file:     $APP_DIR/$ENV_FILE_NAME
Staging URL:  https://${DOMAIN}
Public URL:   ${PUBLIC_SCHEME}://${DOMAIN}

Useful commands:
  cd $APP_DIR
  sudo -u $APP_USER docker compose --env-file $APP_DIR/$ENV_FILE_NAME ps
  sudo -u $APP_USER docker compose --env-file $APP_DIR/$ENV_FILE_NAME logs -f --tail=200
  sudo -u $APP_USER docker compose --env-file $APP_DIR/$ENV_FILE_NAME pull
  sudo -u $APP_USER docker compose --env-file $APP_DIR/$ENV_FILE_NAME up -d --build --remove-orphans
  sudo nginx -t && sudo systemctl reload nginx

EOF
}

install_base_packages
install_docker
ensure_app_user
configure_firewall
ensure_repo_checkout
ensure_env_file
deploy_compose_stack
configure_nginx
post_checks
show_post_setup
