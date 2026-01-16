# Infrastructure Monitoring Setup Guide

Your dashboard already has infrastructure monitoring built in! It can show you:
- 💰 **All your GCloud resources and costs**
- ▲ **Vercel deployments and usage**
- 📦 **GitHub repos and Actions usage**

## How to Access

Click the **☁ Infrastructure** button in the dashboard header.

---

## Setup GCloud Monitoring (5 minutes)

To see all your GCloud resources and costs:

### Step 1: Go to GCloud Console
Open: https://console.cloud.google.com/

### Step 2: Create a Service Account
1. Go to **IAM & Admin** > **Service Accounts**
2. Click **Create Service Account**
3. Name it: `dashboard-monitoring`
4. Click **Create and Continue**

### Step 3: Grant Permissions
Add these roles (click "Add Another Role" for each):
- **Viewer** (basic read access)
- **Cloud Asset Viewer** (see all resources)
- **Billing Account Viewer** (see costs)

Click **Continue**, then **Done**

### Step 4: Create JSON Key
1. Find your new service account in the list
2. Click the **︙** (three dots) menu
3. Click **Manage keys**
4. Click **Add Key** > **Create new key**
5. Choose **JSON** format
6. Click **Create**
7. The JSON file downloads to your computer

### Step 5: Add to Dashboard
1. Open the downloaded JSON file in a text editor
2. **Copy the entire contents** (it's one big JSON object)
3. Open: `/Users/alexander/claude-manager-worker/dashboard/.env.local`
4. Find the line: `# GCLOUD_CREDENTIALS=`
5. Uncomment it and paste the JSON **on one line**:
   ```
   GCLOUD_CREDENTIALS={"type":"service_account","project_id":"your-project",...}
   ```

### Step 6: Restart Dashboard
```bash
cd /Users/alexander/claude-manager-worker/dashboard
# Kill current process
pkill -f "next dev"
# Restart
npm run dev
```

### Step 7: View Your Infrastructure!
1. Go to http://localhost:3001
2. Click **☁ Infrastructure** button
3. See all your projects, instances, services, and costs!

---

## What You'll See

### Cost Summary
- **Total monthly cost** across all platforms
- Breakdown by service (Compute Engine, Cloud Run, etc.)
- Estimated costs updated in real-time

### Resources by Project
For each GCloud project:
- **Compute Engine instances** (name, zone, status, IP)
- **Cloud Run services** (URLs, regions, status)
- **Enabled APIs/Services** (count and list)
- **Cost breakdown** per service

### Quick Links
Direct links to:
- GCloud Console for each project
- Compute Engine dashboard
- Cloud Run dashboard
- Billing dashboard

---

## Optional: Add Vercel & GitHub

### Vercel Token
1. Go to: https://vercel.com/account/tokens
2. Create new token
3. Add to `.env.local`:
   ```
   VERCEL_TOKEN=your_token_here
   ```

### GitHub Token
1. Go to: https://github.com/settings/tokens
2. Generate new token (classic)
3. Select scopes: `repo`, `read:org`, `read:user`
4. Add to `.env.local`:
   ```
   GITHUB_TOKEN=your_token_here
   ```

---

## Features

✅ **Real-time monitoring** - Auto-refreshes every 60 seconds
✅ **Cost tracking** - See exactly what you're spending
✅ **Resource inventory** - All instances, services, deployments
✅ **Health checks** - Warnings for issues
✅ **Quick links** - Jump directly to each console
✅ **Caching** - Fast responses with smart caching

---

## Troubleshooting

### "Not Configured" message?
- Make sure you added `GCLOUD_CREDENTIALS` to `.env.local`
- Check that the JSON is on ONE LINE (no line breaks)
- Restart the dashboard after adding credentials

### "API Error" message?
- Verify the service account has the required roles
- Check that the APIs are enabled in your GCloud project:
  - Cloud Resource Manager API
  - Service Usage API
  - Compute Engine API
  - Cloud Billing API

### Enable APIs
```bash
gcloud services enable cloudresourcemanager.googleapis.com
gcloud services enable serviceusage.googleapis.com
gcloud services enable compute.googleapis.com
gcloud services enable cloudbilling.googleapis.com
```

---

## Security Notes

🔒 **Your credentials stay local**
- The JSON key is only stored in your `.env.local` file
- Never committed to git (`.env.local` is in `.gitignore`)
- Only used server-side (never sent to browser)

🔒 **Read-only access**
- The service account has only Viewer permissions
- Cannot modify or delete any resources
- Safe for monitoring purposes

---

## Cost Estimates

**Note:** The cost estimates are based on:
- Running instances: ~$25/month per instance (estimate)
- Other services: Placeholder costs
- For accurate billing, check your GCloud Billing dashboard

To get exact costs, you need to:
1. Enable Cloud Billing API
2. Link a billing account to your service account
3. The dashboard will then fetch real billing data

---

**Setup Time:** 5 minutes
**Difficulty:** Easy
**Result:** Full visibility into your GCloud infrastructure and costs! 🎉
