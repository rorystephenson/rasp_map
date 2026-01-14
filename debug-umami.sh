#!/bin/bash

SERVER="root@168.119.191.119"

echo "=== Checking Docker Container Status ==="
ssh $SERVER "cd /app && docker compose ps"

echo ""
echo "=== Checking Umami Logs (last 50 lines) ==="
ssh $SERVER "cd /app && docker compose logs --tail=50 umami"

echo ""
echo "=== Checking Database Logs (last 50 lines) ==="
ssh $SERVER "cd /app && docker compose logs --tail=50 umami-db"

echo ""
echo "=== Checking Nginx Logs (last 20 lines) ==="
ssh $SERVER "cd /app && docker compose logs --tail=20 nginx"
