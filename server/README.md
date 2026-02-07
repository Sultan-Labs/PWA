# Sultan WalletLink Relay Server

A lightweight WebSocket relay server that connects the Sultan mobile wallet (PWA) to desktop dApps via QR code scanning.

## Overview

The relay server doesn't decrypt any data - it simply routes encrypted messages between:
- **dApp** (desktop browser) - creates a session and displays QR code
- **Wallet** (mobile PWA) - scans QR and joins the session

All message payloads are end-to-end encrypted with AES-256-GCM.

## Quick Start

```bash
# Install dependencies
npm install

# Build
npm run build

# Run
npm start
```

Server runs on port `8765` by default. Set `PORT` environment variable to change.

## Health Check

```bash
curl http://localhost:8765/health
# {"status":"ok","sessions":0,"uptime":123.456}
```

## Docker

```bash
# Build image
docker build -t sultan-walletlink-relay .

# Run container
docker run -d -p 8765:8765 --name sultan-relay sultan-walletlink-relay

# View logs
docker logs -f sultan-relay
```

---

# Deployment Guides

## Option 1: Fly.io (Recommended)

Fly.io offers free tier, global edge deployment, and WebSocket support.

### 1. Install Fly CLI

```bash
# macOS
brew install flyctl

# Linux
curl -L https://fly.io/install.sh | sh

# Windows
powershell -Command "iwr https://fly.io/install.ps1 -useb | iex"
```

### 2. Login and Deploy

```bash
cd wallet-extension/server

# Login (creates account if needed)
fly auth login

# Create app (first time only)
fly launch --name sultan-walletlink-relay

# Deploy
fly deploy
```

### 3. Create fly.toml

```toml
app = "sultan-walletlink-relay"
primary_region = "iad"

[build]
  dockerfile = "Dockerfile"

[http_service]
  internal_port = 8765
  force_https = true
  auto_stop_machines = false
  auto_start_machines = true
  min_machines_running = 1

[[services]]
  protocol = "tcp"
  internal_port = 8765

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [[services.ports]]
    port = 80
    handlers = ["http"]
```

### 4. Set Custom Domain

```bash
# Add certificate for relay.sltn.io
fly certs add relay.sltn.io

# Get the IP for DNS
fly ips list
```

Add DNS A record: `relay.sltn.io → <fly-ip>`

---

## Option 2: Railway

Railway offers one-click deploys and free tier.

### 1. Deploy from GitHub

1. Go to https://railway.app
2. Click "New Project" → "Deploy from GitHub repo"
3. Select `Wollnbergen/0xv7` and set root directory to `wallet-extension/server`
4. Railway auto-detects Dockerfile

### 2. Configure

```bash
# Set port
railway variables set PORT=8765
```

### 3. Custom Domain

1. Go to Settings → Domains
2. Add `relay.sltn.io`
3. Copy CNAME value
4. Add DNS CNAME record: `relay.sltn.io → <railway-domain>`

---

## Option 3: Render

### 1. Create render.yaml

```yaml
services:
  - type: web
    name: sultan-walletlink-relay
    runtime: docker
    dockerfilePath: ./wallet-extension/server/Dockerfile
    dockerContext: ./wallet-extension/server
    envVars:
      - key: PORT
        value: 8765
    healthCheckPath: /health
```

### 2. Deploy

1. Go to https://render.com
2. New → Blueprint
3. Connect GitHub repo
4. Render deploys automatically

---

## Option 4: DigitalOcean App Platform

### 1. Create App Spec

```yaml
name: sultan-relay
services:
  - name: relay
    dockerfile_path: wallet-extension/server/Dockerfile
    source_dir: wallet-extension/server
    http_port: 8765
    routes:
      - path: /
    health_check:
      http_path: /health
```

### 2. Deploy

1. Go to DigitalOcean → Apps → Create App
2. Select GitHub repo
3. Configure using App Spec

---

## Option 5: Self-Hosted (VPS)

For AWS, GCP, Azure, or any VPS with Docker:

### 1. Install Docker

```bash
curl -fsSL https://get.docker.com | sh
```

### 2. Deploy with Docker Compose

Create `docker-compose.yml`:

```yaml
version: '3.8'
services:
  relay:
    build: .
    ports:
      - "8765:8765"
    restart: unless-stopped
    healthcheck:
      test: ["CMD", "wget", "-q", "--spider", "http://localhost:8765/health"]
      interval: 30s
      timeout: 10s
      retries: 3
```

```bash
docker-compose up -d
```

### 3. Set Up Nginx + SSL

```nginx
server {
    listen 443 ssl http2;
    server_name relay.sltn.io;

    ssl_certificate /etc/letsencrypt/live/relay.sltn.io/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/relay.sltn.io/privkey.pem;

    location / {
        proxy_pass http://127.0.0.1:8765;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_read_timeout 3600s;
        proxy_send_timeout 3600s;
    }
}

server {
    listen 80;
    server_name relay.sltn.io;
    return 301 https://$server_name$request_uri;
}
```

```bash
# Get SSL certificate
sudo certbot --nginx -d relay.sltn.io
```

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8765` | Server port |

---

## Monitoring

### Health Endpoint

```bash
curl https://relay.sltn.io/health
```

Response:
```json
{
  "status": "ok",
  "sessions": 5,
  "uptime": 86400.123
}
```

### Metrics to Monitor

- **Active sessions**: Number of connected session pairs
- **WebSocket connections**: Total open connections
- **Memory usage**: Should stay low (~50MB)
- **Response time**: Health check latency

---

## Security Considerations

1. **Rate Limiting**: Add rate limiting in production (nginx or cloud provider)
2. **CORS**: Server doesn't set CORS headers (WebSocket doesn't need them)
3. **TLS**: Always deploy behind HTTPS/WSS terminator
4. **Session Cleanup**: Stale sessions auto-expire after 10 minutes

---

## Updating the Wallet Extension

After deploying, update the relay URL in the wallet extension:

```typescript
// src/core/wallet-link.ts
const RELAY_URL = 'wss://relay.sltn.io';  // Your deployed URL
```

Then rebuild and republish the extension.

---

## Troubleshooting

### Connection Refused
- Check the server is running: `curl http://localhost:8765/health`
- Check firewall allows port 8765
- Verify SSL certificate is valid

### Session Not Connecting
- Ensure both dApp and wallet are connecting to same relay URL
- Check browser console for WebSocket errors
- Verify QR code contains correct relay URL

### High Memory Usage
- Sessions should auto-clean after 10 minutes idle
- If memory grows, check for connection leaks
- Restart container: `docker restart sultan-relay`
