# Your Actual GCloud Resources - January 16, 2026

## 📊 What I Actually Found

You're right - here's what's REALLY running:

### Project: cracked-445422 ✅ ACTIVE

#### Cloud Run Services (2):
1. **legal-doc-api** ✅ RUNNING
   - URL: https://legal-doc-api-1005678374631.us-central1.run.app
   - Region: us-central1
   - Status: Healthy
   - Last deployed: Jan 14, 2026
   - **This is your lawyer document revision project!**

2. **predictive-history-transcribe** ❌ FAILED
   - URL: https://predictive-history-transcribe-1005678374631.us-central1.run.app
   - Region: us-central1
   - Status: Container failed to start (port misconfiguration)
   - Last deployed: Jan 13, 2026
   - **This is your predictive history transcription project!**
   - **Error:** Container not listening on PORT=8080
   - **Needs fix:** Port configuration issue

#### Cloud Storage Buckets (4):
1. `gs://cracked-445422_cloudbuild/` - Cloud Build artifacts
2. `gs://legal-doc-revision-files/` - Legal document storage
3. `gs://run-sources-cracked-445422-us-central1/` - Cloud Run source
4. `gs://run-sources-cracked-445422-us-east1/` - Cloud Run source

#### APIs Enabled (30+):
- Cloud Run API ✅
- Cloud Build API ✅
- Artifact Registry API ✅
- Analytics Hub API ✅
- Cloud Storage API ✅
- ... and 25 more

---

### Other Projects (5):

**ALL have Cloud Run API DISABLED**
- clip-transformer (Clip Transformer)
- image-downloader-386119 (Image Downloader)
- japanesebangers (japanesebangers)
- photo-wall-429022 (photo-wall)
- viralidy (Viralidy)

---

## ❌ Anomaly Detector - NOT FOUND

I searched all 6 projects and didn't find an "anomaly detector" service. It may have been:
- Deleted
- In a different GCloud account
- Named something else
- On a different platform (Heroku, AWS, etc.)

---

## 💰 Current Costs

**Total: ~$0/month**

Why so low?
- ✅ No Compute Engine instances running
- ✅ Cloud Run is pay-per-request
  - legal-doc-api: Only charged when someone hits the API
  - predictive-history-transcribe: Not running (failed), so $0
- ✅ Cloud Storage: Minimal costs for storage

**Cost Breakdown:**
- Cloud Run: $0 (no traffic = no cost)
- Cloud Storage: ~$0.02/month (4 small buckets)
- Cloud Build: $0 (free tier)

---

## 🔧 Issues Found

### 1. predictive-history-transcribe is BROKEN ❌
**Problem:** Container won't start
**Error:** "The user-provided container failed to start and listen on the port defined provided by the PORT=8080"

**How to Fix:**
1. Check your Dockerfile - ensure it exposes port 8080
2. Make sure your app listens on `process.env.PORT || 8080`
3. Redeploy with correct port configuration

**Logs:** https://console.cloud.google.com/logs/viewer?project=cracked-445422&resource=cloud_run_revision/service_name/predictive-history-transcribe

---

## 📝 Next Steps

### 1. Fix Predictive History Service
The service exists but won't start. Fix the port issue and redeploy.

### 2. Enable GCloud Monitoring for ALL Projects
Currently the dashboard only sees cracked-445422. To see other projects:

**Option A:** Grant service account access to each project
```bash
# For each project
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:dashboard-monitoring@cracked-445422.iam.gserviceaccount.com" \
  --role="roles/viewer"
```

**Option B:** Create organization-level service account (if you have org)

### 3. Add Vercel Integration
To see your Vercel deployments and analytics:
1. Go to https://vercel.com/account/tokens
2. Create a token
3. Add to `.env.local`: `VERCEL_TOKEN=your_token`
4. Dashboard will show:
   - All deployments
   - Build status
   - Analytics & visitor stats
   - Bandwidth usage
   - Costs

---

## 🎯 What the Dashboard Will Show (After Full Setup)

### GCloud Tab:
- ✅ All 6 projects
- ✅ 2 Cloud Run services (legal-doc-api + predictive-history)
- ✅ 4 Cloud Storage buckets
- ✅ 30+ enabled APIs
- ✅ Cost breakdown
- ✅ Health status (will show predictive-history as broken)

### Vercel Tab (After token):
- All your Vercel projects
- Deployment status
- **Visitor analytics** 📊
- **Pageviews** 👁️
- **Bandwidth** 📡
- Build times
- Costs

### GitHub Tab (After token):
- All repos
- Open PRs
- Actions minutes used
- Recent commits

---

## Summary

**What's Actually Running:**
- 1 healthy Cloud Run service (legal-doc-api)
- 1 broken Cloud Run service (predictive-history-transcribe)
- 4 Cloud Storage buckets
- **Cost: Basically $0** ✅

**Anomaly Detector:** Not found anywhere 🤷

**Recommendations:**
1. Fix predictive-history-transcribe port issue
2. Add Vercel token to see all deployments + analytics
3. Grant dashboard access to other GCloud projects (if needed)
