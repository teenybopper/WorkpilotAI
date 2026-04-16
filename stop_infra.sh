#!/bin/bash
# stop_infra.sh - Stops WorkPilot AI native infrastructure

echo "🛑 Stopping WorkPilot AI Local Infrastructure..."

# Stop MinIO
if [ -f ./.local_infrastructure/minio.pid ]; then
  kill $(cat ./.local_infrastructure/minio.pid) 2>/dev/null
  rm ./.local_infrastructure/minio.pid
  echo "MinIO stopped."
else
  pkill -f "minio server" 2>/dev/null
  echo "MinIO stopped."
fi

# Stop Qdrant
if [ -f ./.local_infrastructure/qdrant.pid ]; then
  kill $(cat ./.local_infrastructure/qdrant.pid) 2>/dev/null
  rm ./.local_infrastructure/qdrant.pid
  echo "Qdrant stopped."
else
  pkill -f "qdrant" 2>/dev/null
  echo "Qdrant stopped."
fi

echo "✅ Local Infrastructure stopped."
