#!/bin/bash

# Deploy script for rasp-plus

SERVER="root@168.119.191.119"
APP_DIR="/app"

# Function to show usage
usage() {
    echo "Usage: $0 {app|infra}"
    echo "  app   - Deploy only the React application files"
    echo "  infra - Deploy nginx/compose configuration and restart containers"
    exit 1
}

# Check for required argument
if [ $# -eq 0 ]; then
    usage
fi

case "$1" in
    app)
        echo "=== Deploying Application ==="
        echo "Building React app..."
        npm run build
        
        echo "Syncing build files (only changed files)..."
        rsync -avz --delete build/ $SERVER:$APP_DIR/frontend/
        
        echo "Application deployment complete!"
        echo "Site: https://rasp.balanci.ng"
        ;;
        
    infra)
        echo "=== Deploying Infrastructure ==="
        echo "Uploading Docker configuration (only if changed)..."
        rsync -avz infra/compose.yaml $SERVER:$APP_DIR/compose.yaml
        rsync -avz infra/nginx.conf $SERVER:$APP_DIR/nginx.conf
        
        echo "Restarting Docker containers..."
        ssh $SERVER "cd $APP_DIR && docker compose down && docker compose up -d"
        
        echo "Infrastructure deployment complete!"
        echo "Site: https://rasp.balanci.ng"
        ;;
        
    *)
        usage
        ;;
esac