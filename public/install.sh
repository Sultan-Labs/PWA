#!/bin/bash
# Sultan Validator Node - One-Line Installer v0.6.0
# Usage: curl -L https://wallet.sltn.io/install.sh -o install.sh && bash install.sh
#
# STEP 1: Create wallet at https://wallet.sltn.io
# STEP 2: Get a VPS (2 vCPU, 4GB RAM, Ubuntu 22.04+)
# STEP 3: SSH in and run this script
# STEP 4: Register via wallet with the address this script outputs

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m'

VERSION="0.6.0"
BINARY_URL="https://github.com/Sultan-Labs/0xv7/releases/download/v0.2.4/sultan-node"
EXPECTED_SHA256="40a4330517a174c1e9fd927180c281977a83ee365cf0fa74ec71beaa409ba4a3"
BOOTSTRAP_IP="206.189.224.142"
BOOTSTRAP_PEER="/ip4/${BOOTSTRAP_IP}/tcp/26656"
GENESIS_WALLET="sultan15g5nwnlemn7zt6rtl7ch46ssvx2ym2v2umm07g"
# Genesis validators: addresses that are auto-registered at startup.
# All validators are equal peers — no special privileges.
GENESIS_VALIDATORS="sultan15g5nwnlemn7zt6rtl7ch46ssvx2ym2v2umm07g"
INSTALL_DIR="/opt/sultan"
DATA_DIR="/opt/sultan/data"
BINARY_PATH="${INSTALL_DIR}/sultan-node"
SERVICE_NAME="sultan-node"
RPC_PORT="8545"
P2P_PORT="26656"
SHARD_COUNT="20"

echo -e "${CYAN}"
echo "╔════════════════════════════════════════════════════════════╗"
echo "║          Sultan Network Validator Installer               ║"
echo "║                    Version ${VERSION}                          ║"
echo "╚════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# Pre-flight: must be root
if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}❌ Please run as root (use sudo)${NC}"
    exit 1
fi

if [ -f /etc/os-release ]; then
    . /etc/os-release
    echo -e "${BLUE}📋 Detected OS: ${ID} ${VERSION_ID}${NC}"
else
    echo -e "${RED}❌ Unable to detect OS. Ubuntu 22.04+ required.${NC}"
    exit 1
fi

for cmd in curl jq xxd; do
    if ! command -v "$cmd" &> /dev/null; then
        echo -e "${YELLOW}Installing $cmd...${NC}"
        apt-get update -qq && apt-get install -y -qq "$cmd" 2>/dev/null || {
            # xxd is in vim-common or xxd package depending on distro
            if [ "$cmd" = "xxd" ]; then
                apt-get install -y -qq xxd 2>/dev/null || apt-get install -y -qq vim-common 2>/dev/null || true
            fi
        }
    fi
done

# Step 1: Validator name
echo ""
HOSTNAME_VAL=$(hostname)
read -p "Enter validator name (e.g., tokyo, sydney, berlin) [${HOSTNAME_VAL}]: " VALIDATOR_NAME
VALIDATOR_NAME=${VALIDATOR_NAME:-$HOSTNAME_VAL}
VALIDATOR_NAME=$(echo "$VALIDATOR_NAME" | tr '[:upper:]' '[:lower:]' | sed 's/[^a-z0-9-]/-/g')
echo -e "${GREEN}✓ Validator name: ${VALIDATOR_NAME}${NC}"

# Step 2: Download binary
echo ""

# Detect existing installation — preserve keys
EXISTING_INSTALL=false
if [ -f "${INSTALL_DIR}/validator_key.json" ]; then
    EXISTING_INSTALL=true
    echo -e "${YELLOW}⚠  Existing installation detected at ${INSTALL_DIR}${NC}"
    echo -e "${GREEN}✓ Validator keypair will be preserved${NC}"
    EXISTING_ADDR=$(cat "${INSTALL_DIR}/validator.address" 2>/dev/null || true)
    EXISTING_NAME=$(cat "${INSTALL_DIR}/validator.name" 2>/dev/null || true)
    if [ -n "$EXISTING_ADDR" ]; then
        echo -e "${CYAN}   Existing address: ${EXISTING_ADDR}${NC}"
    fi
fi

echo -e "${YELLOW}📁 Creating directories...${NC}"
mkdir -p "$INSTALL_DIR" "$DATA_DIR"

echo -e "${YELLOW}📥 Downloading Sultan Node binary...${NC}"
if [ -f "$BINARY_PATH" ]; then
    mv "$BINARY_PATH" "${BINARY_PATH}.bak" 2>/dev/null || true
fi

curl -L --fail --progress-bar "$BINARY_URL" -o "$BINARY_PATH"
if [ ! -s "$BINARY_PATH" ]; then
    echo -e "${RED}❌ Download failed or file is empty${NC}"
    mv "${BINARY_PATH}.bak" "$BINARY_PATH" 2>/dev/null || true
    exit 1
fi
chmod +x "$BINARY_PATH"
rm -f "${BINARY_PATH}.bak"

# SHA256 verification (hardcoded — prevents tampered binaries)
echo -e "${YELLOW}🔒 Verifying binary integrity (SHA256)...${NC}"
ACTUAL_SHA256=$(sha256sum "$BINARY_PATH" | awk '{print $1}')
if [ "$EXPECTED_SHA256" = "$ACTUAL_SHA256" ]; then
    echo -e "${GREEN}✓ SHA256 verified: ${ACTUAL_SHA256:0:16}...${NC}"
else
    echo -e "${RED}❌ SHA256 mismatch!${NC}"
    echo -e "${RED}   Expected: ${EXPECTED_SHA256}${NC}"
    echo -e "${RED}   Got:      ${ACTUAL_SHA256}${NC}"
    echo -e "${RED}   Binary may be corrupted or tampered with. Aborting.${NC}"
    rm -f "$BINARY_PATH"
    exit 1
fi
echo -e "${GREEN}✓ Binary downloaded and verified${NC}"

# Step 3: Generate Ed25519 validator keypair
echo ""

VALIDATOR_PUBKEY=""
VALIDATOR_SECRET=""
VALIDATOR_ADDR=""

# Reuse existing keypair if this is an upgrade
if [ "$EXISTING_INSTALL" = true ] && [ -f "${INSTALL_DIR}/validator_key.json" ]; then
    echo -e "${GREEN}🔑 Reusing existing Ed25519 validator keypair...${NC}"
    VALIDATOR_PUBKEY=$(jq -r '.public_key // empty' "${INSTALL_DIR}/validator_key.json" 2>/dev/null || true)
    VALIDATOR_SECRET=$(jq -r '.secret_key // empty' "${INSTALL_DIR}/validator_key.json" 2>/dev/null || true)
    VALIDATOR_ADDR=$(jq -r '.address // empty' "${INSTALL_DIR}/validator_key.json" 2>/dev/null || true)
    if [ -n "$VALIDATOR_PUBKEY" ] && [ -n "$VALIDATOR_ADDR" ]; then
        echo -e "${GREEN}✓ Keypair loaded from ${INSTALL_DIR}/validator_key.json${NC}"
    else
        echo -e "${YELLOW}⚠  Existing keypair is incomplete, generating new one...${NC}"
        EXISTING_INSTALL=false
    fi
fi

if [ "$EXISTING_INSTALL" = false ]; then
    echo -e "${YELLOW}🔑 Generating Ed25519 validator keypair...${NC}"

    KEYGEN_OUTPUT=$("${BINARY_PATH}" keygen --format json 2>&1 || true)
    VALIDATOR_PUBKEY=$(echo "$KEYGEN_OUTPUT" | jq -r '.public_key // empty' 2>/dev/null || true)
    VALIDATOR_SECRET=$(echo "$KEYGEN_OUTPUT" | jq -r '.secret_key // empty' 2>/dev/null || true)

    if [ -n "$VALIDATOR_PUBKEY" ] && [ -n "$VALIDATOR_SECRET" ]; then
        # Try to get address from keygen output
        VALIDATOR_ADDR=$(echo "$KEYGEN_OUTPUT" | jq -r '.address // empty' 2>/dev/null || true)
        if [ -z "$VALIDATOR_ADDR" ]; then
            # Derive address: SHA-256 of raw pubkey bytes, take first 40 hex chars
            if command -v xxd &> /dev/null; then
                PUBKEY_HASH=$(echo -n "$VALIDATOR_PUBKEY" | xxd -r -p | sha256sum | cut -c1-40)
            else
                PUBKEY_HASH=$(echo -n "$VALIDATOR_PUBKEY" | fold -w2 | while read byte; do printf "\\x$byte"; done | sha256sum | cut -c1-40)
            fi
            VALIDATOR_ADDR="sultan1${PUBKEY_HASH}"
        fi

        # Save keypair securely (NOT passed as CLI flags — secrets on cmdline visible in ps aux)
        KEYFILE="${INSTALL_DIR}/validator_key.json"
        (
            umask 077
            cat > "$KEYFILE" << KEYEOF
{
    "public_key": "${VALIDATOR_PUBKEY}",
    "secret_key": "${VALIDATOR_SECRET}",
    "address": "${VALIDATOR_ADDR}",
    "algorithm": "Ed25519",
    "created": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
    "warning": "KEEP THIS FILE SECURE - DO NOT SHARE"
}
KEYEOF
        )
        chmod 600 "$KEYFILE"
        echo -e "${GREEN}✓ Keypair saved to ${KEYFILE}${NC}"
        echo -e "${RED}⚠  BACK UP ${KEYFILE} — loss = loss of validator identity${NC}"
    else
        echo -e "${RED}⚠  Automatic keygen failed.${NC}"
        echo -e "${YELLOW}Please enter your Sultan wallet address from https://wallet.sltn.io${NC}"
        while true; do
            read -p "Sultan wallet address (sultan1...): " VALIDATOR_ADDR
            if [[ "$VALIDATOR_ADDR" =~ ^sultan1[a-z0-9]{32,52}$ ]]; then
                break
            fi
            echo -e "${RED}Invalid format. Must start with sultan1 followed by 32-52 lowercase alphanumeric chars.${NC}"
        done
    fi
fi  # end EXISTING_INSTALL check

echo -e "${CYAN}   Validator Address: ${VALIDATOR_ADDR}${NC}"
echo "$VALIDATOR_ADDR" > "${INSTALL_DIR}/validator.address"
echo "$VALIDATOR_NAME" > "${INSTALL_DIR}/validator.name"

# Step 4: Firewall
echo ""
echo -e "${YELLOW}🔥 Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 22/tcp comment "SSH" 2>/dev/null || true
    ufw allow "${P2P_PORT}/tcp" comment "Sultan P2P" 2>/dev/null || true
    ufw allow "${RPC_PORT}/tcp" comment "Sultan RPC" 2>/dev/null || true
    ufw --force enable 2>/dev/null || true
    echo -e "${GREEN}✓ UFW configured${NC}"
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=22/tcp 2>/dev/null || true
    firewall-cmd --permanent --add-port="${P2P_PORT}/tcp" 2>/dev/null || true
    firewall-cmd --permanent --add-port="${RPC_PORT}/tcp" 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
    echo -e "${GREEN}✓ firewalld configured${NC}"
else
    echo -e "${YELLOW}⚠ No firewall manager. Ensure ports ${P2P_PORT} and ${RPC_PORT} are open.${NC}"
fi

# Step 5: Systemd service
# SECURITY: Secret key stored in isolated env file (mode 600), loaded via EnvironmentFile.
# Secret NEVER appears in unit file, CLI args, or `ps aux` output.
# Only the public key is passed on the command line (safe — it's public).
echo ""
echo -e "${YELLOW}⚙️  Creating systemd service...${NC}"
systemctl stop "$SERVICE_NAME" 2>/dev/null || true

# Create isolated environment file for secret key (root-only, mode 600)
ENVFILE="${INSTALL_DIR}/validator.env"
if [ -n "$VALIDATOR_SECRET" ]; then
    (
        umask 077
        cat > "$ENVFILE" << ENVEOF
SULTAN_VALIDATOR_SECRET=${VALIDATOR_SECRET}
ENVEOF
    )
    chmod 600 "$ENVFILE"
    chown root:root "$ENVFILE"
    echo -e "${GREEN}✓ Validator secret stored in ${ENVFILE} (mode 600)${NC}"
fi

# Build validator flags — pubkey on CLI is safe (it's public)
VALIDATOR_FLAGS="--validator --validator-address ${VALIDATOR_ADDR} --validator-stake 10000000000000"
if [ -n "$VALIDATOR_PUBKEY" ]; then
    VALIDATOR_FLAGS="${VALIDATOR_FLAGS} --validator-pubkey ${VALIDATOR_PUBKEY}"
fi

cat > "/etc/systemd/system/${SERVICE_NAME}.service" << SVCEOF
[Unit]
Description=Sultan Validator Node (${VALIDATOR_NAME})
After=network-online.target
Wants=network-online.target
Documentation=https://sltn.io/docs

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
EnvironmentFile=${ENVFILE}
ExecStart=${BINARY_PATH} \\
  --name "${VALIDATOR_NAME}" \\
  --data-dir ${DATA_DIR} \\
  ${VALIDATOR_FLAGS} \\
  --enable-p2p \\
  --p2p-addr /ip4/0.0.0.0/tcp/${P2P_PORT} \\
  --rpc-addr 0.0.0.0:${RPC_PORT} \\
  --bootstrap-peers "${BOOTSTRAP_PEER}" \\
  --genesis "${GENESIS_WALLET}:500000000000000000" \\
  --genesis-validators "${GENESIS_VALIDATORS}" \\
  --enable-sharding \\
  --shard-count ${SHARD_COUNT} \\
  --allowed-origins "*"
Restart=always
RestartSec=5
LimitNOFILE=65535
StandardOutput=journal
StandardError=journal
NoNewPrivileges=true
ProtectSystem=strict
ReadWritePaths=${DATA_DIR} ${INSTALL_DIR}
PrivateTmp=true

[Install]
WantedBy=multi-user.target
SVCEOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
echo -e "${GREEN}✓ Service created${NC}"

# Step 6: Start and verify
echo ""
echo -e "${YELLOW}🚀 Starting validator...${NC}"
systemctl start "$SERVICE_NAME"

echo -n "Waiting for node"
NODE_STARTED=false
for _ in $(seq 1 30); do
    # Node serves /stats endpoint
    if curl -s "http://localhost:${RPC_PORT}/stats" >/dev/null 2>&1; then
        NODE_STARTED=true
        echo ""
        break
    fi
    echo -n "."
    sleep 2
done

if [ "$NODE_STARTED" = false ]; then
    echo ""
    echo -e "${YELLOW}⚠ Node not responding on /stats after 60s — checking service...${NC}"
    if systemctl is-active --quiet "$SERVICE_NAME"; then
        echo -e "${YELLOW}  Service is running. It may still be initializing.${NC}"
        echo -e "${YELLOW}  Check: journalctl -u ${SERVICE_NAME} -f${NC}"
    else
        echo -e "${RED}❌ Service failed. Check: journalctl -u ${SERVICE_NAME} -n 50${NC}"
        exit 1
    fi
fi

HEIGHT=$(curl -s "http://localhost:${RPC_PORT}/stats" 2>/dev/null | jq -r '.height // 0' 2>/dev/null || echo "syncing")
PEER_COUNT=$(curl -s "http://localhost:${RPC_PORT}/stats" 2>/dev/null | jq -r '.peer_count // 0' 2>/dev/null || echo "0")
PUBLIC_IP=$(curl -s --max-time 5 ifconfig.me 2>/dev/null || curl -s --max-time 5 icanhazip.com 2>/dev/null || echo "unknown")

# Build one-click registration deep link (all params are public — no secrets)
REG_URL="https://wallet.sltn.io/become-validator?addr=${VALIDATOR_ADDR}&name=${VALIDATOR_NAME}"
if [ -n "$VALIDATOR_PUBKEY" ]; then
    REG_URL="${REG_URL}&pubkey=${VALIDATOR_PUBKEY}"
fi

echo ""
echo -e "${CYAN}╔═══════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║               ✅ VALIDATOR INSTALLATION COMPLETE                  ║${NC}"
echo -e "${CYAN}╠═══════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  Validator Name:    ${GREEN}${VALIDATOR_NAME}${NC}"
echo -e "${CYAN}║  Validator Address: ${GREEN}${VALIDATOR_ADDR}${NC}"
if [ -n "$VALIDATOR_PUBKEY" ]; then
echo -e "${CYAN}║  Public Key:        ${GREEN}${VALIDATOR_PUBKEY}${NC}"
fi
echo -e "${CYAN}║  Public IP:         ${GREEN}${PUBLIC_IP}${NC}"
echo -e "${CYAN}║  RPC:               ${GREEN}http://localhost:${RPC_PORT}${NC}"
echo -e "${CYAN}║  Height:            ${GREEN}${HEIGHT}${NC}"
echo -e "${CYAN}║  Peers:             ${GREEN}${PEER_COUNT}${NC}"
echo -e "${CYAN}╠═══════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  ${YELLOW}NEXT: Open this link in your browser to register:${NC}"
echo -e "${CYAN}║${NC}"
echo -e "${CYAN}║  ${GREEN}${REG_URL}${NC}"
echo -e "${CYAN}║${NC}"
echo -e "${CYAN}║  ${YELLOW}(Fields will be pre-filled — just confirm & stake 10,000 SLTN)${NC}"
echo -e "${CYAN}╠═══════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  ${RED}⚠  BACK UP: ${INSTALL_DIR}/validator_key.json${NC}"
echo -e "${CYAN}╠═══════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  Logs:    ${GREEN}journalctl -u ${SERVICE_NAME} -f${NC}"
echo -e "${CYAN}║  Status:  ${GREEN}curl http://localhost:${RPC_PORT}/stats${NC}"
echo -e "${CYAN}║  Restart: ${GREEN}systemctl restart ${SERVICE_NAME}${NC}"
echo -e "${CYAN}╚═══════════════════════════════════════════════════════════════════╝${NC}"
echo ""
# Optional: show QR code for the registration link (mobile-friendly)
if command -v qrencode &> /dev/null; then
    echo -e "${YELLOW}📱 Scan to register:${NC}"
    qrencode -t ANSIUTF8 -m 1 "${REG_URL}" 2>/dev/null || true
    echo ""
elif apt-cache show qrencode &>/dev/null 2>&1; then
    echo -e "${YELLOW}💡 Tip: install qrencode for a scannable QR code:${NC}"
    echo -e "${CYAN}   apt install -y qrencode && qrencode -t ANSIUTF8 '${REG_URL}'${NC}"
    echo ""
fi

journalctl -u "$SERVICE_NAME" -n 5 --no-pager 2>/dev/null || true
echo ""
echo -e "${GREEN}🎉 Validator syncing! Open the link above to register & earn ~13.33% APY${NC}"
