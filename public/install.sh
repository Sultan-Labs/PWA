#!/bin/bash
# Sultan Validator Node - One-Line Installer
# Usage: curl -L https://wallet.sltn.io/install.sh | bash
# Or: bash install-validator.sh
#
# This script:
#   1. Downloads the Sultan Node binary
#   2. Opens firewall ports (26656, 26657)
#   3. Creates a systemd service
#   4. Starts the validator
#   5. Shows the validator address for funding

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Configuration
BINARY_URL="https://github.com/Wollnbergen/DOCS/releases/latest/download/sultan-node"
BOOTSTRAP_PEER="/ip4/206.189.224.142/tcp/26656"
INSTALL_DIR="/opt/sultan"
DATA_DIR="/opt/sultan/data"
BINARY_PATH="${INSTALL_DIR}/sultan-node"
SERVICE_NAME="sultan-node"
RPC_PORT="8545"
P2P_PORT="26656"
VALIDATOR_STAKE="10000000000000"
SHARD_COUNT="20"
GENESIS_WALLET="sultan15g5nwnlemn7zt6rtl7ch46ssvx2ym2v2umm07g:500000000000000000"
GENESIS_VALIDATORS="sultan1nyc00000000000000000000000000000,sultan1sfo00000000000000000000000000002,sultan1fra00000000000000000000000000003,sultan1ams00000000000000000000000000004,sultan1sgp00000000000000000000000000005,sultan1lon00000000000000000000000000006"

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║            SULTAN VALIDATOR NODE INSTALLER                     ║${NC}"
echo -e "${CYAN}║                     v0.2.5                                     ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Check if running as root
if [ "$EUID" -ne 0 ]; then 
    echo -e "${RED}❌ Please run as root (use sudo)${NC}"
    exit 1
fi

# Detect OS
if [ -f /etc/os-release ]; then
    . /etc/os-release
    OS=$ID
else
    echo -e "${RED}❌ Unable to detect OS${NC}"
    exit 1
fi

echo -e "${BLUE}📋 Detected OS: ${OS}${NC}"

# Get validator name (from hostname or prompt)
HOSTNAME=$(hostname)
echo ""
read -p "Enter validator name [$HOSTNAME]: " VALIDATOR_NAME
VALIDATOR_NAME=${VALIDATOR_NAME:-$HOSTNAME}
echo -e "${GREEN}✓ Validator name: ${VALIDATOR_NAME}${NC}"

# Step 1: Create directories
echo ""
echo -e "${YELLOW}📁 Step 1: Creating directories...${NC}"
mkdir -p "$INSTALL_DIR"
mkdir -p "$DATA_DIR"
echo -e "${GREEN}✓ Created ${INSTALL_DIR}${NC}"

# Step 2: Download binary
echo ""
echo -e "${YELLOW}📥 Step 2: Downloading Sultan Node binary...${NC}"
if command -v curl &> /dev/null; then
    curl -L --progress-bar "$BINARY_URL" -o "$BINARY_PATH"
elif command -v wget &> /dev/null; then
    wget -q --show-progress "$BINARY_URL" -O "$BINARY_PATH"
else
    echo -e "${RED}❌ Neither curl nor wget found. Installing curl...${NC}"
    apt-get update && apt-get install -y curl
    curl -L --progress-bar "$BINARY_URL" -o "$BINARY_PATH"
fi
chmod +x "$BINARY_PATH"
echo -e "${GREEN}✓ Downloaded and made executable${NC}"

# Step 3: Open firewall ports
echo ""
echo -e "${YELLOW}🔥 Step 3: Opening firewall ports...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow ${P2P_PORT}/tcp comment "Sultan P2P" 2>/dev/null || true
    ufw allow ${RPC_PORT}/tcp comment "Sultan RPC" 2>/dev/null || true
    ufw --force enable 2>/dev/null || true
    echo -e "${GREEN}✓ UFW: Ports ${P2P_PORT} and ${RPC_PORT} opened${NC}"
elif command -v firewall-cmd &> /dev/null; then
    firewall-cmd --permanent --add-port=${P2P_PORT}/tcp 2>/dev/null || true
    firewall-cmd --permanent --add-port=${RPC_PORT}/tcp 2>/dev/null || true
    firewall-cmd --reload 2>/dev/null || true
    echo -e "${GREEN}✓ firewalld: Ports ${P2P_PORT} and ${RPC_PORT} opened${NC}"
else
    echo -e "${YELLOW}⚠ No firewall found - make sure ports ${P2P_PORT} and ${RPC_PORT} are open${NC}"
fi

# Step 4: Create systemd service
echo ""
echo -e "${YELLOW}⚙️  Step 4: Creating systemd service...${NC}"

# Stop existing service if running
systemctl stop "$SERVICE_NAME" 2>/dev/null || true

# Generate a validator address based on the name
VALIDATOR_ADDR="sultan1${VALIDATOR_NAME}$(printf '%0.s0' {1..20})" 
VALIDATOR_ADDR=$(echo "$VALIDATOR_ADDR" | cut -c1-42)  # Truncate to proper length

cat > /etc/systemd/system/${SERVICE_NAME}.service << EOF
[Unit]
Description=Sultan Validator Node
After=network.target
Documentation=https://sltn.io/docs

[Service]
Type=simple
User=root
WorkingDirectory=${INSTALL_DIR}
ExecStart=${BINARY_PATH} \\
  --name "${VALIDATOR_NAME}" \\
  --data-dir ${DATA_DIR} \\
  --validator \\
  --validator-address "${VALIDATOR_ADDR}" \\
  --validator-stake ${VALIDATOR_STAKE} \\
  --enable-p2p \\
  --rpc-addr 0.0.0.0:${RPC_PORT} \\
  --p2p-addr /ip4/0.0.0.0/tcp/${P2P_PORT} \\
  --bootstrap-peers "${BOOTSTRAP_PEER}" \\
  --genesis "${GENESIS_WALLET}" \\
  --genesis-validators "${GENESIS_VALIDATORS}" \\
  --allowed-origins "*" \\
  --enable-sharding \\
  --shard-count ${SHARD_COUNT}
Restart=always
RestartSec=5
LimitNOFILE=65535
StandardOutput=journal
StandardError=journal

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"
echo -e "${GREEN}✓ Systemd service created and enabled${NC}"

# Step 5: Start the service
echo ""
echo -e "${YELLOW}🚀 Step 5: Starting validator...${NC}"
systemctl start "$SERVICE_NAME"
sleep 3

# Check if running
if systemctl is-active --quiet "$SERVICE_NAME"; then
    echo -e "${GREEN}✓ Validator is running!${NC}"
else
    echo -e "${RED}❌ Failed to start. Check logs with: journalctl -u ${SERVICE_NAME} -f${NC}"
    exit 1
fi

# Step 6: Get validator info
echo ""
echo -e "${YELLOW}📊 Step 6: Getting validator info...${NC}"
sleep 2

# Try to get status from local RPC
STATUS=""
for i in {1..5}; do
    STATUS=$(curl -s http://localhost:${RPC_PORT}/status 2>/dev/null || true)
    if [ -n "$STATUS" ]; then
        break
    fi
    sleep 2
done

# Get public IP
PUBLIC_IP=$(curl -s ifconfig.me 2>/dev/null || curl -s icanhazip.com 2>/dev/null || echo "unknown")

echo ""
echo -e "${CYAN}╔════════════════════════════════════════════════════════════════╗${NC}"
echo -e "${CYAN}║              ✅ INSTALLATION COMPLETE!                         ║${NC}"
echo -e "${CYAN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║                                                                ║${NC}"
echo -e "${CYAN}║  Validator Name:    ${GREEN}${VALIDATOR_NAME}${CYAN}${NC}"
echo -e "${CYAN}║  Validator Address: ${GREEN}${VALIDATOR_ADDR}${CYAN}${NC}"
echo -e "${CYAN}║  Public IP:         ${GREEN}${PUBLIC_IP}${CYAN}${NC}"
echo -e "${CYAN}║  P2P Port:          ${GREEN}${P2P_PORT}${CYAN}${NC}"
echo -e "${CYAN}║  RPC Port:          ${GREEN}${RPC_PORT}${CYAN}${NC}"
echo -e "${CYAN}║  Data Directory:    ${GREEN}${DATA_DIR}${CYAN}${NC}"
echo -e "${CYAN}║                                                                ║${NC}"
echo -e "${CYAN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  ${YELLOW}NEXT STEPS:${CYAN}                                                  ║${NC}"
echo -e "${CYAN}║                                                                ║${NC}"
echo -e "${CYAN}║  1. Open Sultan Wallet:  ${GREEN}https://wallet.sltn.io${CYAN}              ║${NC}"
echo -e "${CYAN}║  2. Go to Validators → Become a Validator                      ║${NC}"
echo -e "${CYAN}║  3. Stake at least 10,000 SLTN                                 ║${NC}"
echo -e "${CYAN}║                                                                ║${NC}"
echo -e "${CYAN}╠════════════════════════════════════════════════════════════════╣${NC}"
echo -e "${CYAN}║  ${YELLOW}USEFUL COMMANDS:${CYAN}                                              ║${NC}"
echo -e "${CYAN}║                                                                ║${NC}"
echo -e "${CYAN}║  View logs:     journalctl -u ${SERVICE_NAME} -f               ║${NC}"
echo -e "${CYAN}║  Check status:  systemctl status ${SERVICE_NAME}               ║${NC}"
echo -e "${CYAN}║  Restart:       systemctl restart ${SERVICE_NAME}              ║${NC}"
echo -e "${CYAN}║  Stop:          systemctl stop ${SERVICE_NAME}                 ║${NC}"
echo -e "${CYAN}║  Check RPC:     curl http://localhost:${RPC_PORT}/status       ║${NC}"
echo -e "${CYAN}║                                                                ║${NC}"
echo -e "${CYAN}╚════════════════════════════════════════════════════════════════╝${NC}"
echo ""

# Show initial logs
echo -e "${YELLOW}📜 Recent logs:${NC}"
journalctl -u "$SERVICE_NAME" -n 10 --no-pager 2>/dev/null || true
echo ""

echo -e "${GREEN}🎉 Your validator is now syncing with the Sultan Network!${NC}"
echo -e "${YELLOW}   Once synced and staked, you'll start earning ~13.33% APY${NC}"
echo ""
