# Vercel Analytics & Dashboard Integration

## 🎯 Quick Setup (2 minutes)

### Step 1: Get Your Vercel Token
1. Go to: https://vercel.com/account/tokens
2. Click "Create Token"
3. Name it: `dashboard-monitoring`
4. Scope: Full Account
5. Click "Create"
6. **Copy the token** (you won't see it again!)

### Step 2: Add to Dashboard
1. Open: `/Users/alexander/claude-manager-worker/dashboard/.env.local`
2. Find the line: `# VERCEL_TOKEN=your_vercel_token_here`
3. Uncomment and paste your token:
   ```
   VERCEL_TOKEN=your_actual_token_here
   ```
4. Dashboard auto-reloads (or restart it)

### Step 3: View Your Stats!
1. Go to http://localhost:3000
2. Click **☁ Infrastructure**
3. See ALL your Vercel projects with:
   - Deployment status
   - Build times
   - Visitor analytics (if analytics installed)
   - Bandwidth usage
   - Costs

---

## 📊 Enable Analytics on All Vercel Projects

Vercel Analytics shows you:
- **Pageviews** 👁️
- **Unique visitors** 👤
- **Top pages** 📄
- **Referrers** 🔗
- **Countries** 🌍
- **Devices** 📱

### For Next.js Projects

#### 1. Install the package:
```bash
cd your-nextjs-project
npm install @vercel/analytics
```

#### 2. Add to your app:

**App Router (app directory):**
Add to `app/layout.tsx`:
```tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

**Pages Router (pages directory):**
Add to `pages/_app.tsx`:
```tsx
import { Analytics } from '@vercel/analytics/react';

export default function App({ Component, pageProps }) {
  return (
    <>
      <Component {...pageProps} />
      <Analytics />
    </>
  );
}
```

#### 3. Deploy:
```bash
git add .
git commit -m "Add Vercel Analytics"
git push
```

Done! Analytics will start tracking immediately.

---

### For Other Frameworks

**React (Vite, CRA):**
```tsx
// In your root component (App.tsx or index.tsx)
import { Analytics } from '@vercel/analytics/react';

function App() {
  return (
    <>
      {/* Your app */}
      <Analytics />
    </>
  );
}
```

**SvelteKit:**
```bash
npm install @vercel/analytics
```

```svelte
<!-- In src/routes/+layout.svelte -->
<script>
  import { inject } from '@vercel/analytics';
  inject();
</script>
```

**Vue:**
```bash
npm install @vercel/analytics
```

```ts
// In main.ts
import { inject } from '@vercel/analytics';
inject();
```

**Vanilla HTML:**
Add before `</body>`:
```html
<script>
  window.va = window.va || function () { (window.vaq = window.vaq || []).push(arguments); };
</script>
<script defer src="/_vercel/insights/script.js"></script>
```

---

## 🤖 Auto-Enable Analytics in Future Projects

I'll add this to your Claude skills so it's automatic:

**File:** `/Users/alexander/claude-manager-worker/skills/vercel-analytics.md`

```markdown
# Skill: Always Use Vercel Analytics

## When to Apply
When deploying any web application to Vercel.

## Guideline
Always install and configure @vercel/analytics to track visitor stats.

**Next.js:**
- Install: `npm install @vercel/analytics`
- Add to layout/app: `import { Analytics } from '@vercel/analytics/react'`
- Include: `<Analytics />` component

**Other frameworks:** Use appropriate @vercel/analytics integration.

## Why
Provides free visitor analytics: pageviews, visitors, top pages, referrers, devices, and geographic data.
```

---

## 📊 What You'll See in Dashboard

Once analytics are enabled, your dashboard will show:

### Per Project:
- **Total visitors** (last 30 days)
- **Pageviews** (last 30 days)
- **Top pages** (most visited URLs)
- **Traffic sources** (where visitors come from)
- **Countries** (geographic distribution)
- **Devices** (mobile vs desktop)

### Aggregated Stats:
- Total visitors across all projects
- Total pageviews
- Most popular project
- Traffic trends

---

## 💰 Cost

**Vercel Analytics is FREE** up to:
- 2,500 events/month (Hobby plan)
- 25,000 events/month (Pro plan)

After that:
- $10/month for additional 100k events

For most projects, the free tier is plenty!

---

## 🔧 Dashboard API Integration

The dashboard will fetch analytics via Vercel API:

**Endpoints it calls:**
- `/v3/projects` - List all projects
- `/v6/deployments` - Deployment status
- `/v1/analytics` - Visitor stats (if analytics enabled)
- `/v1/teams/.../usage` - Bandwidth & costs

**What it shows:**
```
┌─────────────────────────────────────────┐
│  Project: my-nextjs-app                 │
├─────────────────────────────────────────┤
│  Status: ✅ Production (deployed 2h ago) │
│  URL: https://my-app.vercel.app         │
│  Visitors: 1,234 (last 30 days)         │
│  Pageviews: 5,678                       │
│  Top Page: / (892 views)                │
│  Bandwidth: 2.3 GB                      │
└─────────────────────────────────────────┘
```

---

## 🚀 Quick Command to Add Analytics to ALL Projects

If you have multiple Next.js projects on Vercel:

```bash
# Create a script to add analytics to all
cat > /tmp/add-vercel-analytics.sh << 'EOF'
#!/bin/bash
for dir in ~/projects/*/; do
  if [ -f "$dir/package.json" ]; then
    echo "Adding analytics to $(basename $dir)"
    cd "$dir"
    npm install @vercel/analytics
    # Add to layout (you'll need to do this manually per project type)
    git add package.json package-lock.json
    git commit -m "Add Vercel Analytics" || true
    git push || true
  fi
done
EOF

chmod +x /tmp/add-vercel-analytics.sh
/tmp/add-vercel-analytics.sh
```

---

## ✅ Verification

After adding analytics:
1. Deploy your project
2. Wait 5 minutes
3. Visit your site
4. Go to Vercel Dashboard > Project > Analytics
5. You should see your visit!

In your local dashboard (http://localhost:3000):
1. Click Infrastructure
2. See Vercel tab
3. Your project will show visitor stats

---

## Summary

**To See Analytics in Dashboard:**
1. ✅ Add VERCEL_TOKEN to .env.local (2 min)
2. ✅ Install @vercel/analytics in each project (1 min per project)
3. ✅ Deploy projects (happens automatically)
4. ✅ View stats in dashboard! 🎉

**Total Time:** 10 minutes for all projects

**Result:** Complete visibility into all your Vercel deployments, builds, and visitor analytics!
