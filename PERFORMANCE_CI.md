# Performance CI/CD Pipeline

Automated performance gating using **Lighthouse CI** and **GitHub Actions**, with deployment to **Cloudflare Pages** only when performance thresholds pass.

---

## How It Works

```
Push to main
    │
    ▼
┌─────────────────────┐
│   lighthouse job    │
│  Build → Audit      │
│  Performance ≥ 90?  │
└────────┬────────────┘
         │
    ✅ Pass          ❌ Fail
         │                │
         ▼                ▼
┌──────────────┐   Deploy skipped
│  deploy job  │   Pipeline fails
│  Cloudflare  │
│  Pages       │
└──────────────┘
```

---

## File Structure

```
├── .github/
│   └── workflows/
│       └── performance.yml     # GitHub Actions workflow
├── lighthouserc.cjs            # Lighthouse CI configuration
└── src/
    └── App.tsx                 # Application source
```

---

## Workflow File — `.github/workflows/performance.yml`

```yaml
name: Performance Check

on:
  push:
    branches: [ main ]

jobs:
  lighthouse:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v4

    - name: Setup Node.js
      uses: actions/setup-node@v4
      with:
        node-version: '20'
        cache: 'npm'

    - name: Install dependencies
      run: npm ci

    - name: Build application
      run: npm run build

    - name: Install Lighthouse CI
      run: npm install -g @lhci/cli@0.13.x

    - name: Run Lighthouse CI
      run: lhci autorun --upload.target=temporary-public-storage
      env:
        LHCI_GITHUB_APP_TOKEN: ${{ secrets.GITHUB_TOKEN }}

    - name: Upload build artifact
      uses: actions/upload-artifact@v4
      with:
        name: dist
        path: ./dist

  deploy:
    runs-on: ubuntu-latest
    needs: lighthouse           # Only runs if lighthouse job passes

    steps:
    - name: Download build artifact
      uses: actions/download-artifact@v4
      with:
        name: dist
        path: ./dist

    - name: Deploy to Cloudflare Pages
      uses: cloudflare/wrangler-action@v3
      with:
        apiToken: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        accountId: ${{ secrets.CLOUDFLARE_ACCOUNT_ID }}
        command: pages deploy dist --project-name=github-actions
```

### Key Points
- `needs: lighthouse` — the deploy job only starts if the lighthouse job succeeds
- The `dist` folder is passed between jobs via GitHub artifact upload/download
- `GITHUB_TOKEN` is auto-provided by GitHub — no manual setup needed

---

## Lighthouse Config — `lighthouserc.cjs`

```js
module.exports = {
  ci: {
    collect: {
      staticDistDir: './dist',  // Audit the built output, no server needed
      numberOfRuns: 3,          // Run 3 times and use the median
    },
    assert: {
      assertions: {
        'categories:performance':    ['error', { minScore: 0.9 }],  // Blocks deploy
        'categories:accessibility':  ['warn',  { minScore: 0.9 }],  // Warning only
        'categories:best-practices': ['warn',  { minScore: 0.9 }],  // Warning only
        'categories:seo':            ['warn',  { minScore: 0.9 }],  // Warning only
      },
    },
    upload: {
      target: 'temporary-public-storage',  // Free public report URL
    },
  },
};
```

### Assertion Levels

| Level   | Behavior                                          |
|---------|---------------------------------------------------|
| `error` | Fails the CI job — **blocks deploy**              |
| `warn`  | Prints a warning — deploy continues               |

### Score Thresholds

| Category      | Threshold | On Fail      |
|---------------|-----------|--------------|
| Performance   | ≥ 90      | ❌ Blocks deploy |
| Accessibility | ≥ 90      | ⚠️ Warn only |
| Best Practices| ≥ 90      | ⚠️ Warn only |
| SEO           | ≥ 90      | ⚠️ Warn only |

> **Why `error` only on Performance?**  
> Performance regressions are the most critical — a slow app directly harms users. Accessibility and SEO are warnings to encourage improvement without blocking releases.

---

## Required Secrets

Add these in: **GitHub repo → Settings → Secrets and variables → Actions → Repository secrets**

| Secret Name              | How to Get It |
|--------------------------|---------------|
| `CLOUDFLARE_API_TOKEN`   | Cloudflare Dashboard → My Profile → API Tokens → Create Custom Token → `Cloudflare Pages: Edit` |
| `CLOUDFLARE_ACCOUNT_ID`  | Cloudflare Dashboard → Workers & Pages → copy Account ID from the URL or sidebar |

> ⚠️ Secrets must be added under **Repository secrets**, not Environment secrets, unless the workflow explicitly references an environment.

---

## Cloudflare Pages Setup

### Disable Automatic Deployments

Since GitHub Actions handles deployment, disable Cloudflare's built-in auto-deploy to avoid duplicate deployments:

1. Cloudflare Dashboard → **Workers & Pages** → your project
2. **Settings** → **Build** → **Branch control** → click ✏️ edit
3. Set **Automatic deployments** → **Disabled**
4. Save

---

## HTML Requirements

For good Lighthouse scores, ensure `index.html` includes:

```html
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="description" content="Your app description here" />
  <meta name="theme-color" content="#646cff" />
  <title>Your App Title</title>
</head>
```

| Tag                | Affects         |
|--------------------|-----------------|
| `description`      | SEO score       |
| `theme-color`      | Best Practices  |
| `viewport`         | Accessibility   |

---

## Accessibility Tips

- Wrap page content in `<main>` instead of `<div>` (landmark requirement)
- Text color must meet contrast ratio — avoid colors like `#888` on dark/light backgrounds; use `#aaaaaa` or stronger

---

## Testing the Performance Gate

### Simulate a Failure

Add this to your app to intentionally block the main thread and tank performance:

```ts
// Blocks main thread for 3s → TBT spikes → performance < 90 → deploy blocked
function simulateHeavyTask() {
  const start = Date.now()
  while (Date.now() - start < 3000) {
    Math.sqrt(Math.random() * 999999)
  }
}
simulateHeavyTask()
```

**Expected result:**
- Lighthouse job → ❌ fails (performance < 0.9)
- Deploy job → ⏭️ skipped

### Restore to Pass

Remove the `simulateHeavyTask` block and push again:
- Lighthouse job → ✅ passes
- Deploy job → ✅ deploys to Cloudflare Pages

---

## Viewing Lighthouse Reports

Each run uploads a public report URL visible in the GitHub Actions logs:

```
Open the report at https://storage.googleapis.com/lighthouse-infrastructure.appspot.com/reports/...
```

Click the link to see the full breakdown of Performance, Accessibility, Best Practices, and SEO scores.

---

## Troubleshooting

| Problem | Cause | Fix |
|---------|-------|-----|
| Deploy skipped — secrets not found | Secrets added to Environment, not Repository | Move secrets to Repository secrets |
| `color-contrast` failure | Text color has low contrast | Use higher contrast colors (`#aaaaaa` or above) |
| `landmark-one-main` failure | Page wrapped in `<div>` | Use `<main>` as the root element |
| `meta-description` failure | Missing description meta tag | Add `<meta name="description">` to `index.html` |
| Performance failing unexpectedly | Heavy JS blocking main thread | Profile with DevTools → remove blocking code |
| `lighthouse:recommended` preset failures | Preset enforces 50+ strict per-audit rules | Remove `preset` and use only category assertions |
