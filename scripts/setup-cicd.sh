#!/bin/bash

# ============================================
# GitHub Actions CI/CD Setup Helper
# ============================================

set -e

echo "🚀 Setting up CI/CD for V-Label..."

# Check if we're in the right directory
if [ ! -f "docker-compose.prod.yml" ]; then
    echo "❌ Error: Not in project root directory"
    echo "Please run this script from V-label_app directory"
    exit 1
fi

# Generate SSH key for GitHub Actions
echo "🔑 Generating SSH key for GitHub Actions..."
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_key -N ""

echo ""
echo "================================================"
echo "✅ SSH Key Generated Successfully!"
echo "================================================"
echo ""

# Show private key for GitHub Secrets
echo "📋 PRIVATE KEY (Add to GitHub Secrets as VPS_SSH_PRIVATE_KEY):"
echo "================================================"
cat ~/.ssh/github_actions_key
echo "================================================"
echo ""

# Add public key to authorized_keys
echo "🔧 Adding public key to authorized_keys..."
cat ~/.ssh/github_actions_key.pub >> ~/.ssh/authorized_keys
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh

echo "✅ Public key added to authorized_keys"
echo ""

# Show deployment path
CURRENT_PATH=$(pwd)
echo "================================================"
echo "📍 DEPLOYMENT PATH (Add to GitHub Secrets as DEPLOY_PATH):"
echo "$CURRENT_PATH"
echo "================================================"
echo ""

# Get VPS IP
VPS_IP=$(hostname -I | awk '{print $1}')
echo "================================================"
echo "🌐 VPS IP (Add to GitHub Secrets as VPS_HOST):"
echo "$VPS_IP"
echo "================================================"
echo ""

# Summary
echo "================================================"
echo "📝 GITHUB SECRETS TO ADD:"
echo "================================================"
echo "VPS_HOST: $VPS_IP"
echo "VPS_USER: $(whoami)"
echo "VPS_SSH_PRIVATE_KEY: <see above>"
echo "DEPLOY_PATH: $CURRENT_PATH"
echo ""
echo "Plus all VITE_* environment variables from your .env.production"
echo "================================================"
echo ""

echo "✅ Setup complete!"
echo ""
echo "Next steps:"
echo "1. Copy the private key above"
echo "2. Go to GitHub → Settings → Secrets → New secret"
echo "3. Add all secrets listed above"
echo "4. Push code to main branch to trigger deployment"
