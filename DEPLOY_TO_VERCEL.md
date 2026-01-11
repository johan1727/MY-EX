# Deploy to Vercel

This guide explains how to deploy the **REMI** application (web version) to Vercel.

## Prerequisites

- GitHub repository connected to Vercel.
- `mobile-app/vercel.json` configuration file (already present).

## Steps

1.  **Log in to Vercel** and click **"Add New..."** -> **"Project"**.
2.  **Import** the repository `my-ex-coach` (or your repo name).
3.  **Configure Project**:
    - **Framework Preset**: Select **Other / None** (or "Expo" if available, but "Other" works best with our custom `vercel.json`).
    - **Root Directory**: Click "Edit" and select `mobile-app`. This is CRITICAL because the Expo app lives there.
4.  **Build & Development Settings**:
    - **Build Command**: `npm run build` (Should be auto-filled from `vercel.json` or package.json).
    - **Output Directory**: `dist` (Should be auto-filled).
    - **Install Command**: `npm install` (Default).
5.  **Environment Variables**:
    - Add any necessary environment variables from `.env` or `.env.local` to the Vercel project settings (e.g., Supabase keys, Stripe keys).
    - **Important**: Prefix client-side variables with `EXPO_PUBLIC_` if using Expo Router's automatic injection, or ensure they are bundled correctly.
6.  **Deploy**: Click **"Deploy"**.

Alternatively, via CLI (executed successfully):
```bash
npx vercel deploy --prod --yes
```

## Serverless Functions
The `vercel.json` configures a serverless function at `api/stripe/create-checkout.js`. Vercel will automatically deploy this function.

## Troubleshooting
- If 404s occur on refresh: Ensure `vercel.json` has the rewrite rule for single-page apps (SPA):
  ```json
  "routes": [
      { "handle": "filesystem" },
      { "src": "/(.*)", "dest": "/index.html" }
  ]
  ```
