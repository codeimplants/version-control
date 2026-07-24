# Deploy configuration for nexus-backend.
#
# SETUP: copy this file to scripts/deploy.config.sh and adjust for your server.
#   cp scripts/deploy.config.example.sh scripts/deploy.config.sh
#
# deploy.config.sh is gitignored. It holds server addresses only — never secrets.
# Application secrets live in .env inside each checkout ON THE SERVER and are
# never read, written or transported by the deploy script.

# --- SSH ---------------------------------------------------------------------
# Add this to ~/.ssh/config, then put the alias here.
# This is the SAME VPS that hosts sonebill-backend, so if you already have a
# working 'sonebill-vps' alias you can point DEPLOY_SSH_HOST at that instead.
#
#   Host nexus-vps
#     HostName 31.97.61.191
#     User root
#     IdentityFile ~/.ssh/id_nexus_vps
#
DEPLOY_SSH_HOST="nexus-vps"

# --- Server layout -----------------------------------------------------------
# Each environment has its OWN checkout, so building one cannot affect another.
# Checkouts are owned by APP_USER, not root, so git/npm/pm2 must run as them
# (running as root breaks git with "dubious ownership" and leaves root-owned
# files behind).
#
# These MUST match the cwd values in ecosystem.config.js.
APP_USER="sanskarpandit"
BRANCH="master"

DEV_APP_DIR="/home/sanskarpandit/nexus-backend-dev"
DEV_PM2_NAME="nexus-backend-dev"
DEV_PORT="6001"

PREPROD_APP_DIR="/home/sanskarpandit/nexus-backend-preprod"
PREPROD_PM2_NAME="nexus-backend-preprod"
PREPROD_PORT="6002"

PROD_APP_DIR="/home/sanskarpandit/nexus-backend-prod"
PROD_PM2_NAME="nexus-backend-prod"
PROD_PORT="6000"

# --- Health check ------------------------------------------------------------
# Path hit on 127.0.0.1:<port> after restart. Empty to skip.
HEALTH_PATH="/health"
