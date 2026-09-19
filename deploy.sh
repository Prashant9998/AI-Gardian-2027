#!/usr/bin/env bash
# ==============================================================================
# AI Cyber Guardian (2026–2027) — Automated Cloud Deployment & Provisioning Script
# Target OS: Ubuntu 22.04 LTS (DigitalOcean Droplet / AWS EC2 / Bare-Metal Linux)
# ==============================================================================

set -euo pipefail

# ANSI Color formatting
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}==============================================================================${NC}"
echo -e "${GREEN}      🛡️  AI CYBER GUARDIAN — PRODUCTION CLOUD DEPLOYMENT HARNESS${NC}"
echo -e "${GREEN}          Autonomous Zero-Trust Web Defense Platform (2026–2027)${NC}"
echo -e "${BLUE}==============================================================================${NC}"

# 1. Root / Sudo Check
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}[!] Please run as root or with sudo: sudo ./deploy.sh [domain]${NC}"
    exit 1
fi

DOMAIN="${1:-localhost}"
echo -e "${BLUE}[*] Target Deployment Domain:${NC} ${YELLOW}${DOMAIN}${NC}"

# 2. System Package Updates & Prerequisites
echo -e "${BLUE}[1/5] Updating system packages and installing prerequisites...${NC}"
apt-get update -qq
apt-get install -y -qq \
    curl \
    git \
    ufw \
    ca-certificates \
    gnupg \
    lsb-release \
    openssl

# 3. Docker & Docker Compose Installation (if not installed)
if ! command -v docker &> /dev/null; then
    echo -e "${BLUE}[2/5] Installing Docker CE and Docker Compose plugin...${NC}"
    install -m 0755 -d /etc/apt/keyrings
    curl -fsSL https://download.docker.com/linux/ubuntu/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg
    chmod a+r /etc/apt/keyrings/docker.gpg

    echo \
      "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/ubuntu \
      $(lsb_release -cs) stable" | tee /etc/apt/sources.list.d/docker.list > /dev/null

    apt-get update -qq
    apt-get install -y -qq docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
    systemctl enable docker
    systemctl start docker
    echo -e "${GREEN}[+] Docker installed successfully.${NC}"
else
    echo -e "${GREEN}[+] Docker is already installed: $(docker --version)${NC}"
fi

# 4. Host Firewall Configuration (UFW)
echo -e "${BLUE}[3/5] Configuring firewall rules...${NC}"
ufw allow 22/tcp comment 'SSH' > /dev/null 2>&1 || true
ufw allow 80/tcp comment 'HTTP / Let-s-Encrypt' > /dev/null 2>&1 || true
ufw allow 443/tcp comment 'HTTPS / Secure-WebSockets' > /dev/null 2>&1 || true
ufw --force enable > /dev/null 2>&1 || true
echo -e "${GREEN}[+] Ports 22, 80, and 443 opened.${NC}"

# 5. Environment Secrets Generation
echo -e "${BLUE}[4/5] Preparing environment configuration...${NC}"
if [ ! -f .env ]; then
    POSTGRES_PWD=$(openssl rand -hex 16)
    cat <<EOF > .env
GUARDIAN_DOMAIN=${DOMAIN}
ACME_EMAIL=admin@${DOMAIN}
POSTGRES_USER=guardian
POSTGRES_PASSWORD=${POSTGRES_PWD}
POSTGRES_DB=guardian_db
DATABASE_URL=postgresql://guardian:${POSTGRES_PWD}@postgres:5432/guardian_db
REDIS_URL=redis://redis:6379/0
GUARDIAN_API_KEY=guardian-prod-demo-key-2026
ENVIRONMENT=production
EOF
    echo -e "${GREEN}[+] Generated secure .env configuration.${NC}"
else
    echo -e "${YELLOW}[!] Existing .env detected; preserving current secrets.${NC}"
fi

# 6. Build and Launch Containers
echo -e "${BLUE}[5/5] Building images and launching container ecosystem...${NC}"
docker compose down --remove-orphans > /dev/null 2>&1 || true
docker compose up -d --build

echo -e "${BLUE}[*] Waiting for services to pass healthchecks...${NC}"
sleep 5

MAX_RETRIES=20
COUNT=0
HEALTHY=false

while [ $COUNT -lt $MAX_RETRIES ]; do
    if curl -sf http://localhost:8000/health > /dev/null 2>&1; then
        HEALTHY=true
        break
    fi
    COUNT=$((COUNT + 1))
    echo -ne "    Checking backend health... ($COUNT/$MAX_RETRIES)\r"
    sleep 2
done

echo ""
if [ "$HEALTHY" = true ]; then
    echo -e "${GREEN}==============================================================================${NC}"
    echo -e "${GREEN}      ✅ DEPLOYMENT SUCCESSFUL — AI CYBER GUARDIAN IS ACTIVE!${NC}"
    echo -e "${GREEN}==============================================================================${NC}"
    echo -e "  🌐 Edge Reverse Proxy   : https://${DOMAIN} (HTTP/HTTPS)"
    echo -e "  📊 SOC Dashboard UI     : https://${DOMAIN} or http://${DOMAIN}:3000"
    echo -e "  🛡️ Control Plane API    : https://${DOMAIN}/api/v1 (or http://${DOMAIN}:8000)"
    echo -e "  ⚡ Real-Time WebSockets  : wss://${DOMAIN}/api/v1/ws/threats"
    echo -e "  🎯 Protected Target App : https://${DOMAIN}/target/ (or http://${DOMAIN}:3001)"
    echo -e "  📄 OpenAPI Docs         : https://${DOMAIN}/docs"
    echo -e "  📄 Executive PDF Report : https://${DOMAIN}/api/v1/reporting/export-pdf"
    echo -e "${BLUE}==============================================================================${NC}"
    echo -e "To view live logs: ${YELLOW}docker compose logs -f${NC}"
    echo -e "To stop platform : ${YELLOW}docker compose down${NC}"
else
    echo -e "${RED}[!] Health check timed out. Showing recent container logs:${NC}"
    docker compose logs --tail=40 backend
    exit 1
fi
