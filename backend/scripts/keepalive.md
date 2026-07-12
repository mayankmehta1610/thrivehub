# ThriveHub API keep-alive

Render free-tier web services spin down after ~15 minutes of inactivity. Cold starts can take 30–60 seconds and cause login failures.

## Automated keep-alive (recommended)

`render.yaml` defines a cron job `thrivehub-keepalive` that pings `GET /health` every 10 minutes:

```yaml
- type: cron
  name: thrivehub-keepalive
  schedule: "*/10 * * * *"
  buildCommand: "true"
  startCommand: "curl -sf https://thrivehub-api.onrender.com/health"
```

After pushing to `main`, sync the Blueprint in the Render dashboard (or let auto-deploy pick up the cron service).

**Note:** Render cron jobs require a paid workspace plan in some accounts. If the cron service fails to create, use an external pinger below.

## External alternatives

- [UptimeRobot](https://uptimerobot.com) — free HTTP monitor every 5 min
- [cron-job.org](https://cron-job.org) — free cron hitting `https://thrivehub-api.onrender.com/health`
- GitHub Actions scheduled workflow (see `.github/workflows/keepalive.yml` if added)

## Manual test

```bash
curl -sf https://thrivehub-api.onrender.com/health
```

Expected: `{"status":"ok",...}` with HTTP 200.

## Client-side wake-up

Even with keep-alive, the web and mobile apps call `wakeApi()` before login/register — retrying `/health` for up to 60 seconds with exponential backoff before auth requests.
