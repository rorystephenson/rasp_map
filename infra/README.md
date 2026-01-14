# Infrastructure Setup

This directory contains Docker Compose and nginx configuration for deploying RASP Map with Umami analytics.

## Services

- **nginx** - Web server serving the React app and proxying to Umami
- **umami** - Privacy-focused analytics platform
- **umami-db** - PostgreSQL database for Umami

## Architecture

- **rasp.balanci.ng** - Main React application
- **stats.rasp.balanci.ng** - Umami analytics dashboard (subdomain)

## Initial Setup

### 1. Create Environment File

```bash
cd infra
cp .env.example .env
```

### 2. Generate Secrets

```bash
# Generate a random password for PostgreSQL
openssl rand -base64 32

# Generate a random secret for Umami
openssl rand -base64 32
```

### 3. Edit .env File

Update `infra/.env` with the generated secrets:

```bash
POSTGRES_PASSWORD=<paste-first-generated-secret>
DATABASE_URL=postgresql://umami:<same-password>@umami-db:5432/umami
APP_SECRET=<paste-second-generated-secret>
```

### 4. Set Up DNS

Add an A record for the stats subdomain:

```
Type:  A
Name:  stats
Value: 168.119.191.119
TTL:   Auto
```

### 5. Obtain SSL Certificate

Run the setup script to obtain SSL certificate for the subdomain:

```bash
# From project root
./setup-stats-ssl.sh
```

This will obtain a Let's Encrypt SSL certificate for stats.rasp.balanci.ng.

### 6. Deploy Infrastructure

```bash
# From project root
./deploy.sh infra
```

This will:
- Upload Docker Compose configuration
- Upload nginx configuration
- Upload .env file
- Restart all containers

### 7. Access Umami Dashboard

Visit: `https://stats.rasp.balanci.ng`

**Default credentials:**
- Username: `admin`
- Password: `umami`

**⚠️ IMPORTANT: Change the password immediately after first login!**

### 8. Create Website in Umami

1. Login to Umami dashboard
2. Click "Add website"
3. Name: "RASP Map"
4. Domain: "rasp.balanci.ng"
5. Click on the website and go to "Settings" → "Tracking code"
6. Copy the **Website ID** from the tracking script

### 9. Add Tracking Script to React App

The tracking script will be automatically added to your app. Check `public/index.html` and update the `data-website-id` with your Website ID from step 8.

### 10. Deploy Application

```bash
./deploy.sh app
```

### 11. Verify Analytics

1. Visit `https://rasp.balanci.ng`
2. Check the Umami dashboard at `https://stats.rasp.balanci.ng`
3. You should see visitor activity

## Privacy & Compliance

✅ **No cookies** - Umami uses localStorage
✅ **No cookie banner required**
✅ **GDPR compliant**
✅ **Self-hosted** - Your data stays on your server

## Maintenance

### View Logs

```bash
ssh root@168.119.191.119
cd /app
docker compose logs -f umami
docker compose logs -f umami-db
```

### Database Backup

```bash
ssh root@168.119.191.119
cd /app
docker compose exec umami-db pg_dump -U umami umami > umami_backup_$(date +%Y%m%d).sql
```

### Update Umami

```bash
ssh root@168.119.191.119
cd /app
docker compose pull umami
docker compose up -d umami
```

## Troubleshooting

Use the provided troubleshooting scripts:

- `./debug-umami.sh` - Check container status and logs
- `./check-env.sh` - Verify .env file configuration
- `./reset-umami.sh` - Reset database (destructive!)

### Umami won't start

Check logs:
```bash
./debug-umami.sh
```

Common issues:
- Database not ready - wait 30 seconds and check again
- Wrong DATABASE_URL - run `./check-env.sh` to verify

### Stats not appearing

1. Check tracking script is loaded in browser DevTools
2. Verify website ID is correct in tracking script
3. Check Umami container is running: `ssh root@168.119.191.119 'cd /app && docker compose ps'`
4. View Umami logs: `./debug-umami.sh`

### Can't access stats subdomain

1. Verify DNS record is propagated: `dig stats.rasp.balanci.ng`
2. Check nginx is running: `ssh root@168.119.191.119 'cd /app && docker compose ps'`
3. Verify SSL certificate exists: `ssh root@168.119.191.119 'ls -la /etc/letsencrypt/live/stats.rasp.balanci.ng/'`
