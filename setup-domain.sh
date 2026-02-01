#!/bin/bash

# ============================================
# Quick Domain Configuration Script
# Domain: vlabel.cloud
# VPS IP: 103.249.201.27
# ============================================

set -e

DOMAIN="vlabel.cloud"
VPS_IP="103.249.201.27"

echo "🌐 Configuring V-Label for domain: $DOMAIN"
echo ""

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Error: Not in project root directory"
    echo "Please run this script from V-label_app directory"
    exit 1
fi

echo "📝 Step 1: Updating nginx configuration..."
cp nginx/nginx.conf.example nginx/nginx.conf

# Replace domain in nginx config
if [[ "$OSTYPE" == "darwin"* ]]; then
    # macOS
    sed -i '' "s/yourdomain\.com/$DOMAIN/g" nginx/nginx.conf
else
    # Linux
    sed -i "s/yourdomain\.com/$DOMAIN/g" nginx/nginx.conf
fi

echo "✅ Nginx config updated with $DOMAIN"
echo ""

echo "📝 Step 2: Creating .env.production template..."
if [ ! -f ".env.production" ]; then
    cp .env.production.example .env.production
    
    # Update API URL
    if [[ "$OSTYPE" == "darwin"* ]]; then
        sed -i '' "s|https://your-domain\.com/api/v1|https://$DOMAIN/api/v1|g" .env.production
    else
        sed -i "s|https://your-domain\.com/api/v1|https://$DOMAIN/api/v1|g" .env.production
    fi
    
    echo "✅ .env.production created"
    echo ""
    echo "⚠️  IMPORTANT: Edit .env.production and fill in:"
    echo "   - Database credentials"
    echo "   - JWT secret (run: openssl rand -base64 32)"
    echo "   - Firebase credentials"
else
    echo "⚠️  .env.production already exists, skipping..."
fi

echo ""
echo "================================================"
echo "✅ Configuration Complete!"
echo "================================================"
echo ""
echo "📋 Next Steps:"
echo ""
echo "1. Setup DNS A Record:"
echo "   Type: A"
echo "   Host: @"
echo "   Value: $VPS_IP"
echo ""
echo "2. Wait for DNS propagation (5-30 minutes)"
echo "   Test with: nslookup $DOMAIN"
echo ""
echo "3. Edit .env.production:"
echo "   nano .env.production"
echo ""
echo "4. Deploy (HTTP first, no SSL):"
echo "   ./deploy.sh"
echo ""
echo "5. Test: http://$DOMAIN"
echo ""
echo "6. Install SSL:"
echo "   sudo certbot certonly --webroot -w ./certbot/www -d $DOMAIN -d www.$DOMAIN"
echo ""
echo "7. Enable HTTPS in nginx.conf and restart"
echo ""
echo "8. Test: https://$DOMAIN"
echo ""
echo "================================================"
