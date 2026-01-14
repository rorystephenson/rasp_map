#!/bin/bash

SERVER="root@168.119.191.119"

echo "=== Checking .env file on server ==="
echo ""
echo "Contents of /app/.env:"
ssh $SERVER "cat /app/.env"

echo ""
echo ""
echo "=== Extracting passwords to compare ==="
echo ""
echo "POSTGRES_PASSWORD from .env:"
ssh $SERVER "grep POSTGRES_PASSWORD /app/.env | head -1"

echo ""
echo "Password in DATABASE_URL:"
ssh $SERVER "grep DATABASE_URL /app/.env | sed 's/.*umami:\([^@]*\)@.*/Password: \1/'"

echo ""
echo "=== These two passwords MUST match exactly ==="
