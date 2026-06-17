# GradCompass Vercel Deployment

This project deploys to Vercel with short student read-only share links backed by Upstash Redis.

## How Sharing Works

1. Click `学生只读`.
2. The browser sends the current dashboard snapshot to `POST /api/share`.
3. A Vercel Function stores the snapshot in Upstash Redis.
4. The app copies a short URL such as:

```text
https://your-domain.vercel.app/s/AbC123xy
```

Students opening `/s/...` see the saved snapshot in read-only mode.

## Vercel Setup

Import this folder/repository into Vercel with these settings:

```text
Framework Preset: Other
Build Command: leave empty
Output Directory: .
Install Command: leave empty
```

## Upstash Redis

Create or connect an Upstash Redis database from the Vercel Marketplace, then make sure these environment variables exist in the Vercel project:

```text
UPSTASH_REDIS_REST_URL
UPSTASH_REDIS_REST_TOKEN
```

After adding the variables, redeploy the Vercel project.

## CLI Deploy

```bash
npm i -g vercel
vercel --prod
```

## Local Preview

Static page only:

```bash
python -m http.server 8000
```

Full share-link testing requires running through Vercel with the Upstash environment variables configured.

## Legacy Files

- `server.py` and `shares.json` are the old local-file sharing implementation.
- `_worker.js` is the old Cloudflare Pages implementation.
- Vercel uses `api/share.js`, `api/s.js`, and `vercel.json`.
