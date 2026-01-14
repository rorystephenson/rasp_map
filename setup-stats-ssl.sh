#!/bin/bash

SERVER="root@168.119.191.119"

echo "=== Setting up SSL certificate for stats.rasp.balanci.ng ==="
echo ""
echo "This script will obtain a Let's Encrypt SSL certificate for stats.rasp.balanci.ng"
echo ""
read -p "Have you created the DNS A record for stats.rasp.balanci.ng? (yes/no): " confirm

if [ "$confirm" != "yes" ]; then
    echo ""
    echo "Please create the DNS A record first:"
    echo "  Type: A"
    echo "  Name: stats"
    echo "  Value: 168.119.191.119"
    echo "  TTL: Auto (or 300)"
    echo ""
    echo "Run this script again after the DNS record has propagated (usually 5-10 minutes)"
    exit 1
fi

echo ""
echo "Step 1: Checking DNS propagation..."
if dig +short stats.rasp.balanci.ng @8.8.8.8 | grep -q "168.119.191.119"; then
    echo "✓ DNS record found!"
else
    echo "⚠ DNS record not found yet. It may take a few minutes to propagate."
    echo "You can check manually with: dig stats.rasp.balanci.ng"
    read -p "Continue anyway? (yes/no): " continue_confirm
    if [ "$continue_confirm" != "yes" ]; then
        exit 1
    fi
fi

echo ""
echo "Step 2: Obtaining SSL certificate..."
ssh $SERVER "certbot certonly --nginx -d stats.rasp.balanci.ng --non-interactive --agree-tos --email admin@rasp.balanci.ng"

echo ""
echo "Step 3: Verifying certificate..."
if ssh $SERVER "test -f /etc/letsencrypt/live/stats.rasp.balanci.ng/fullchain.pem"; then
    echo "✓ Certificate obtained successfully!"
else
    echo "✗ Certificate not found. Please check the certbot output above for errors."
    exit 1
fi

echo ""
echo "=== SSL Certificate Setup Complete ==="
echo "You can now deploy the infrastructure with: ./deploy.sh infra"
