#!/bin/bash
# Sultan Validator One-Line Installer
# Usage: curl -L https://wallet.sltn.io/install.sh -o install.sh && bash install.sh

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}"
echo "╔═══════════════════════════════════════════════════════════╗"
echo "║           Sultan Network Validator Installer               ║"
echo "║                    Version 0.2.6                           ║"
echo "╚═══════════════════════════════════════════════════════════╝"
echo -e "${NC}"

INSTALL_DIR="/opt/sultan"
BINARY_URL="https://github.com/Sultan-Labs/DOCS/releases/download/v0.2.6/sultan-node"
NYC_NODE="206.189.224.142"
VALIDATOR_STAKE="10000000000000000000"

if [ "$EUID" -ne 0 ]; then
    echo -e "${RED}Please run as root (use sudo)${NC}"
    exit 1
fi

echo -e "${YELLOW}Enter your validator name (e.g., tokyo, sydney, berlin):${NC}"
read -r VALIDATOR_NAME

if [ -z "$VALIDATOR_NAME" ]; then
    echo -e "${RED}Validator name cannot be empty${NC}"
    exit 1
fi

echo -e "${GREEN}Setting up validator: $VALIDATOR_NAME${NC}"

mkdir -p "$INSTALL_DIR"
cd "$INSTALL_DIR"

echo -e "${BLUE}Downloading Sultan node binary...${NC}"
curl -L "$BINARY_URL" -o sultan-node
chmod +x sultan-node

# Generate REAL Ed25519 keypair
echo -e "${BLUE}Generating Ed25519 validator keypair...${NC}"
KEYGEN_OUTPUT=$(./sultan-node keygen --format json 2>/dev/null)
PUBLIC_KEY=$(echo "$KEYGEN_OUTPUT" | jq -r '.public_key')
SECRET_KEY=$(echo "$KEYGEN_OUTPUT" | jq -r '.secret_key')

if [ -z "$PUBLIC_KEY" ] || [ "$PUBLIC_KEY" = "null" ]; then
    echo -e "${RED}Failed to generate keypair${NC}"
    exit 1
fi

# Generate valid bech32 address from name hash (no b, i, o, 1 characters)
ADDR_HASH=$(echo -n "$VALIDATOR_NAME" | sha256sum | cut -c1-33 | tr 'bio1' 'aaa0')
VALIDATOR_ADDR="sultan1${ADDR_HASH}"

echo -e "${GREEN}Public Key: $PUBLIC_KEY${NC}"
echo -e "${GREEN}Validator Address: $VALIDATOR_ADDR${NC}"

# Save keys
echo "$PUBLIC_KEY" > "$INSTALL_DIR/validator.pubkey"
echo "$SECRET_KEY" > "$INSTALL_DIR/validator.secret"
chmod 600 "$INSTALL_DIR/validator.secret"

# Configure firewall
echo -e "${BLUE}Configuring firewall...${NC}"
if command -v ufw &> /dev/null; then
    ufw allow 8545/tcp >/dev/null 2>&1 || true
    ufw allow 26656/tcp >/dev/null 2>&1 || true
fi

# Create systemd service
cat > /etc/systemd/system/sultan-node.service << EOF
[Unit]
Description=Sultan Network Validator Node
After=network.target

[Service]
Type=simple
User=root
WorkingDirectory=$INSTALL_DIR
Environment="SULTAN_VALIDATOR_SECRET=$SECRET_KEY"
ExecStart=$INSTALL_DIR/sultan-node \\
    --data-dir $INSTALL_DIR/data \\
    --validator \\
    --validator-address $VALIDATOR_ADDR \\
    --validator-stake $VALIDATOR_STAKE \\
    --validator-pubkey $PUBLIC_KEY \\
    --bootstrap-peers /ip4/$NYC_NODE/tcp/26656 \\
    --genesis-validators sultan1nyc00000000000000000000000000000 \\
    --genesis sultan15g5nwnlemn7zt6rtl7ch46ssvx2ym2v2umm07g:500000000000000000 \\
    --enable-p2p \\
    --p2p-addr /ip4/0.0.0.0/tcp/26656 \\
    --rpc-addr 0.0.0.0:8545 \\
    --enable-sharding \\
    --shard-count 20
Restart=always
RestartSec=3
LimitNOFILE=65535

[Install]
WantedBy=multi-user.target
EOF

systemctl daemon-reload
systemctl enable sultan-node
systemctl start sultan-node

sleep 5

if systemctl is-active --quiet sultan-node; then
    echo -e "${GREEN}"
    echo "╔═══════════════════════════════════════════════════════════╗"
    echo "║              Validator Installation Complete!              ║"
    echo "╚═══════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
    echo -e "Validator Name:    ${YELLOW}$VALIDATOR_NAME${NC}"
    echo -e "Public Key:        ${YELLOW}$PUBLIC_KEY${NC}"
    echo -e "Validator Address: ${YELLOW}$VALIDATOR_ADDR${NC}"
    echo -e "Stake Required:    ${YELLOW}10,000 SLTN${NC}"
    echo ""
    echo -e "${BLUE}Next Steps:${NC}"
    echo "1. Open https://wallet.sltn.io"
    echo "2. Send 10,000 SLTN to: $VALIDATOR_ADDR"
    echo "3. Node will auto-register as validator"
else
    echo -e "${RED}Node failed to start. Check logs: journalctl -u sultan-node -f${NC}"
    exit 1
fi