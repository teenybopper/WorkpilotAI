#!/bin/bash
# start_infra.sh - Starts WorkPilot AI native infrastructure

echo "🚀 Starting WorkPilot AI Local Infrastructure..."

# 1. Start Redis (if not using global apt service)
# Since we installed via apt, redis-server should automatically run as a systemd service.
# Let's verify and start it if it's not active.
sudo systemctl start redis-server 2>/dev/null || redis-server --daemonize yes 

# 2. Start MinIO
# Configure credentials
export MINIO_ROOT_USER="workpilot"
export MINIO_ROOT_PASSWORD="workpilot_dev"
export MINIO_BROWSER_REDIRECT_URL="http://127.0.0.1:9001"

echo "📦 Starting MinIO..."
./.local_infrastructure/bin/minio server ./.local_infrastructure/data/minio \
  --address ":9000" --console-address ":9001" \
  > ./.local_infrastructure/logs/minio.log 2>&1 &
echo $! > ./.local_infrastructure/minio.pid

# 3. Start Qdrant
# Ensure qdrant data path is properly configured
echo "🧠 Starting Qdrant..."
# Qdrant defaults setup
export QDRANT__STORAGE__STORAGE_PATH="$(pwd)/.local_infrastructure/data/qdrant_storage"
# Run Qdrant passing config path if it needs it, or just use defaults.
./.local_infrastructure/bin/qdrant \
  > ./.local_infrastructure/logs/qdrant.log 2>&1 &
echo $! > ./.local_infrastructure/qdrant.pid


echo "✅ Local Infrastructure started!"
echo "MinIO:    http://localhost:9001 (workpilot / workpilot_dev)"
echo "Qdrant:   http://localhost:6333/dashboard"
echo "Postgres: Your local native Postgres (port 5432)"
echo "Redis:    Local port 6379"

echo "Logs available in .local_infrastructure/logs/"
