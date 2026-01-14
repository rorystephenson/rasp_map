#!/bin/bash

SERVER="root@168.119.191.119"

echo "=== Resetting Umami Database ==="
echo "This will delete the existing database and recreate it with your current .env passwords"
echo ""
read -p "Are you sure? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo "Aborted."
    exit 1
fi

echo ""
echo "Step 1: Stopping containers..."
ssh $SERVER "cd /app && docker compose down"

echo ""
echo "Step 2: Removing database volume..."
ssh $SERVER "docker volume rm app_umami-db-data"

echo ""
echo "Step 3: Starting containers with fresh database..."
ssh $SERVER "cd /app && docker compose up -d"

echo ""
echo "Step 4: Waiting 30 seconds for database initialization..."
sleep 30

echo ""
echo "Step 5: Checking status..."
ssh $SERVER "cd /app && docker compose ps"

echo ""
echo "=== Reset Complete ==="
echo "Wait another 30 seconds, then try accessing: https://rasp.balanci.ng/stats/"
echo ""
echo "If still not working, run: ./debug-umami.sh"
