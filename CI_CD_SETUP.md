# 🚀 CI/CD Setup Guide for V-Label

## 📋 Overview

This guide will help you setup **GitHub Actions CI/CD pipeline** for automatic deployment.

### What happens when you push code:

```
Push to main → GitHub Actions triggers
    ↓
1. Build & Test Backend ✅
2. Build & Test Frontend ✅
    ↓
3. If all builds pass → Auto Deploy to VPS 🚀
```

---

## 🔧 Setup Instructions

### Step 1: Generate SSH Key for GitHub Actions

On your **VPS**, run:

```bash
# Generate dedicated SSH key for CI/CD
ssh-keygen -t ed25519 -C "github-actions" -f ~/.ssh/github_actions_key -N ""

# Copy PRIVATE key (for GitHub Secrets)
cat ~/.ssh/github_actions_key

# Copy PUBLIC key (for VPS authorized_keys)
cat ~/.ssh/github_actions_key.pub
```

### Step 2: Add Public Key to VPS

```bash
# Add public key to authorized_keys
cat ~/.ssh/github_actions_key.pub >> ~/.ssh/authorized_keys

# Set correct permissions
chmod 600 ~/.ssh/authorized_keys
```

### Step 3: Setup GitHub Secrets

Go to your GitHub repository:
1. **Settings** → **Secrets and variables** → **Actions**
2. Click **"New repository secret"**
3. Add the following secrets:

#### Required Secrets:

| Secret Name | Value | Example |
|-------------|-------|---------|
| `VPS_HOST` | VPS IP address | `103.249.201.27` |
| `VPS_USER` | SSH username | `root` |
| `VPS_SSH_PRIVATE_KEY` | Private key content | `-----BEGIN OPENSSH PRIVATE KEY-----...` |
| `DEPLOY_PATH` | Project path on VPS | `/root/V-label_app` |

#### Frontend Build Secrets:

| Secret Name | Value |
|-------------|-------|
| `VITE_API_URL` | `https://yourdomain.com/api` |
| `VITE_FIREBASE_API_KEY` | Your Firebase API key |
| `VITE_FIREBASE_AUTH_DOMAIN` | `your-project.firebaseapp.com` |
| `VITE_FIREBASE_PROJECT_ID` | Your Firebase project ID |
| `VITE_FIREBASE_STORAGE_BUCKET` | `your-project.appspot.com` |
| `VITE_FIREBASE_MESSAGING_SENDER_ID` | Your sender ID |
| `VITE_FIREBASE_APP_ID` | Your app ID |
| `VITE_FIREBASE_MEASUREMENT_ID` | Your measurement ID |

### Step 4: Test the Pipeline

```bash
# Make a small change
echo "# CI/CD Test" >> README.md

# Commit and push
git add .
git commit -m "test: CI/CD pipeline"
git push origin main

# Go to GitHub → Actions tab
# Watch the pipeline run! 🎬
```

---

## 📊 Pipeline Flow

### On Pull Request:
```
1. ✅ Build Backend
2. ✅ Build Frontend
3. ⏸️  NO deployment (just testing)
```

### On Push to Main:
```
1. ✅ Build Backend
2. ✅ Build Frontend
3. 🚀 Deploy to VPS (if builds pass)
```

---

## 🔍 Monitoring Deployments

### View logs:
1. Go to **GitHub** → **Your Repo** → **Actions**
2. Click on the latest workflow run
3. View each job's logs

### On VPS:
```bash
# View container logs
docker compose -f docker-compose.prod.yml logs -f

# Check deployment status
docker compose -f docker-compose.prod.yml ps
```

---

## 🛠️ Troubleshooting

### Deployment fails with "Permission denied"
```bash
# On VPS, check SSH key permissions
chmod 600 ~/.ssh/authorized_keys
chmod 700 ~/.ssh
```

### Build fails
- Check if all dependencies are in `package.json`
- Ensure TypeScript compiles without errors locally first

### Deployment succeeds but app doesn't work
```bash
# On VPS, check logs
docker compose -f docker-compose.prod.yml logs server
docker compose -f docker-compose.prod.yml logs client
```

---

## ⚡ Quick Commands

```bash
# Manual deployment trigger (on VPS)
cd ~/V-label_app
git pull origin main
./deploy.sh

# Rollback to previous version
git reset --hard HEAD~1
./deploy.sh

# View deployment history
git log --oneline -10
```

---

## 🎯 Best Practices

1. **Always test locally before pushing**
   ```bash
   npm run build  # in both client/ and server/
   ```

2. **Use feature branches**
   ```bash
   git checkout -b feature/new-feature
   # Make changes
   git push origin feature/new-feature
   # Create PR → Test → Merge to main → Auto deploy
   ```

3. **Monitor deployments**
   - Check GitHub Actions after each push
   - Verify app is working after deployment

4. **Database migrations**
   - Test migrations locally first
   - CI/CD will auto-run migrations on deploy

---

## 📝 Notes

- Deployment takes ~5-10 minutes
- Old containers are stopped before new ones start
- Zero-downtime deployment not yet implemented (future enhancement)
- Automatic rollback not configured (manual rollback required)

---

Need help? Check the GitHub Actions logs or VPS container logs! 🚀
