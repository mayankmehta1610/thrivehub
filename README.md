# ThriveHub

**Skills, Sports & Adventure Community Platform** — a full-stack Facebook-style community platform for showcasing skills, sports, adventures, and social content.

Repository: [https://github.com/mayankmehta1610/thrivehub](https://github.com/mayankmehta1610/thrivehub)

## Architecture

```
ThriveHub/
├── backend/     # Python FastAPI + SQLAlchemy + SQLite (dev) / PostgreSQL (prod)
├── web/         # React + Vite + Tailwind CSS (responsive community UI)
├── mobile/      # Flutter (Android/iOS)
└── spec.xlsx    # Product requirements workbook (reference)
```

| Layer | Technology |
|-------|-----------|
| Backend API | FastAPI, SQLAlchemy, JWT auth, WebSockets |
| Database | SQLite (dev), PostgreSQL-ready schema |
| Cache | Redis (optional) with in-memory fallback |
| Storage | S3-compatible (optional) with local `uploads/` fallback |
| Web | React 19, Vite, Tailwind CSS 4 |
| Mobile | Flutter, Provider, Material 3 |
| Push | FCM (Android), APNs via FCM (iOS — documented) |

## Features Implemented

### Core (R1 - Community Core)
- **Auth**: Register, login, JWT refresh tokens
- **Profiles**: Public profiles, avatars, bios, follow/unfollow, verification badges, profile editing
- **Posts & Feed**: Create posts, image posts, personalized feed, reactions (like/celebrate), comments
- **Communities**: Create, join, browse, community detail pages
- **Events**: Create, register, browse with capacity tracking
- **Messaging**: Direct conversations, send/receive messages, **WebSocket real-time**
- **Notifications**: In-app notification center, mark read, push notification hooks
- **Search**: Cross-entity search (profiles, communities, events, posts)
- **Admin Portal**: Master data, users, moderation queue, appeals, AI flags, audit log

### Trust & Messaging (R3)
- **Moderation queues**: Report workflow with admin review (open → reviewing → resolved/dismissed)
- **Appeals**: Users can appeal moderation actions; admin approve/reject
- **Block/Mute users**: REST API + UI on profile pages
- **WebSocket messaging**: Live chat at `/api/v1/ws/messages/{conversation_id}`
- **Push notifications**: FCM device registration, setup docs at `/api/v1/push/setup`
- **AI moderation hook**: Flag content API + admin review queue (stub classifier)

### Commercial & AI (R4)
- **Subscription tiers**: DB-driven plans (Free, Pro, Elite) — no hard-coded pricing
- **Sponsorships**: DB-driven ad placeholders shown in feed
- **AI moderation**: `POST /api/v1/ai/flag` endpoint + admin review queue

### Infrastructure
- **Redis caching**: Optional; auto-falls back to in-memory cache in dev
- **S3 media upload**: `POST /api/v1/media/upload` with local `uploads/` fallback
- **Audit logging**: All admin moderation actions logged with actor, IP, timestamp

### Mobile (Flutter)
- Feed, communities, events, notifications, search
- **Messages screen** with conversation list and chat
- **Profile editing** screen
- Sponsorship banners, Material 3 polish matching web theme

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- Flutter 3.x (for mobile)
- Redis (optional, for caching)
- MinIO/S3 (optional, for media storage)

### 1. Backend API

```bash
cd backend
python -m venv .venv

# Windows
.\.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

API docs: [http://localhost:8000/docs](http://localhost:8000/docs)

**Note:** After upgrading schema, delete `backend/thrivehub.db` for a fresh seed, or restart — SQLite migrations run automatically for new columns.

### 2. Web Frontend

```bash
cd web
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173)

### 3. Flutter Mobile

```bash
cd mobile
flutter pub get
flutter run
```

For Android emulator, API defaults to `http://10.0.2.2:8000/api/v1`.
For physical device: `flutter run --dart-define=API_URL=http://YOUR_IP:8000/api/v1`

## Demo Accounts

All demo accounts use password **`demo1234`** unless noted. Admin accounts use **`admin123`**.

| Email | Password | Role | Persona |
|-------|----------|------|---------|
| admin@thrivehub.com | admin123 | Admin | Platform administrator |
| ops@thrivehub.com | admin123 | Tenant Admin | Operations & moderation |
| alex@thrivehub.com | demo1234 | Member (Pro) | Marathon runner & community builder |
| sam@thrivehub.com | demo1234 | Member | Outdoor adventurer |
| jordan@thrivehub.com | demo1234 | Member | Weekend football organiser |
| dancer@thrivehub.com | demo1234 | Member | Salsa & dance instructor |
| comedian@thrivehub.com | demo1234 | Member | Standup comedian |
| mia@thrivehub.com | demo1234 | Member | Singer-songwriter |
| chef@thrivehub.com | demo1234 | Member | Home chef & food blogger |
| lens@thrivehub.com | demo1234 | Member | Street photographer |
| riley@thrivehub.com | demo1234 | Member | CrossFit coach |
| art@thrivehub.com | demo1234 | Member | Digital artist |

**Admin portal:** Sign in as `admin@thrivehub.com` or `ops@thrivehub.com`, then open **Settings** (gear icon) → `/admin`.

**Seed script:** Runs automatically on API startup (idempotent). Manual run: `cd backend && python -m app.seed` or `python scripts/seed.py`.

**Landing page data** (skill categories, hero image, featured communities/events) is stored in `master_values` and served via `GET /api/v1/config` — image URLs are Unsplash (free license), not hard-coded in the web app.

## API Endpoints

| Group | Path | Description |
|-------|------|-------------|
| Auth | `/api/v1/auth/*` | Register, login, refresh, me |
| Profiles | `/api/v1/profiles/*` | Profiles, follow, followers |
| Posts | `/api/v1/posts/*` | CRUD, comments, reactions |
| Feed | `/api/v1/feed` | Personalized feed |
| Communities | `/api/v1/communities/*` | CRUD, join/leave |
| Events | `/api/v1/events/*` | CRUD, register |
| Messages | `/api/v1/messages/*` | Conversations, messages |
| WebSocket | `/api/v1/ws/messages/{id}` | Real-time messaging |
| Notifications | `/api/v1/notifications/*` | List, mark read |
| Search | `/api/v1/search` | Cross-entity search |
| Trust | `/api/v1/trust/*` | Block, mute, appeals |
| Reports | `/api/v1/reports` | Submit content reports |
| Moderation | `/api/v1/admin/moderation/*` | Queue, appeals, AI flags, audit |
| Subscriptions | `/api/v1/subscriptions/*` | DB-driven tiers |
| Sponsorships | `/api/v1/sponsorships` | DB-driven ad placements |
| AI | `/api/v1/ai/*` | Content flagging hook |
| Media | `/api/v1/media/upload` | S3/local file upload |
| Push | `/api/v1/push/*` | Device registration, setup docs |
| Config | `/api/v1/config` | Platform branding (from DB) |
| Admin | `/api/v1/admin/*` | Masters, users |

All list endpoints support: `?page=1&page_size=20&sort_by=field&sort_order=asc|desc&search=term`

## Environment Variables

```env
# backend/.env
DATABASE_URL=postgresql://user:pass@localhost/thrivehub
DATABASE_SCHEMA=thrivehub
SECRET_KEY=your-production-secret
CORS_ORIGINS=https://yourdomain.com

# Optional — Redis caching
REDIS_URL=redis://localhost:6379/0

# Optional — S3-compatible media storage
S3_ENDPOINT=http://localhost:9000
S3_BUCKET=thrivehub-media
S3_ACCESS_KEY=minioadmin
S3_SECRET_KEY=minioadmin

# Optional — FCM push notifications
FCM_SERVER_KEY=your-fcm-server-key
FCM_PROJECT_ID=your-firebase-project-id

# web/.env — only needed for direct API / WebSocket access (see Render section)
VITE_API_URL=http://localhost:8000/api/v1
```

## Render Deployment

Blueprint: [`render.yaml`](render.yaml) provisions PostgreSQL 16, the FastAPI API, and the Vite static site.

### First-time setup

1. [Render Dashboard](https://dashboard.render.com) → **New** → **Blueprint**
2. Connect repo `mayankmehta1610/thrivehub`, branch `main`
3. Review services: `thrivehub-db`, `thrivehub-api`, `thrivehub-web`
4. After deploy, set optional secrets on **thrivehub-api** (Environment tab):

| Variable | Purpose |
|----------|---------|
| `REDIS_URL` | External Redis URL (Render has no managed Redis on free tier; e.g. [Upstash](https://upstash.com)) |
| `S3_ENDPOINT` | S3-compatible endpoint (e.g. Cloudflare R2, AWS S3) |
| `S3_ACCESS_KEY` | S3 access key |
| `S3_SECRET_KEY` | S3 secret key |
| `S3_BUCKET` | Bucket name (default `thrivehub-media` in blueprint) |
| `FCM_SERVER_KEY` | Firebase Cloud Messaging server key |
| `FCM_PROJECT_ID` | Firebase project ID |

5. On **thrivehub-web**, set for real-time messaging (WebSockets):

| Variable | Value |
|----------|-------|
| `VITE_API_URL` | `https://thrivehub-api.onrender.com/api/v1` |

REST calls work via the static-site `/api/*` proxy without `VITE_API_URL`, but **WebSocket chat requires `VITE_API_URL`** because Render's static proxy does not upgrade HTTP to WebSocket. Rebuild the web service after setting it.

### Expected URLs (after blueprint deploy)

| Service | URL |
|---------|-----|
| Web | https://thrivehub-web.onrender.com |
| API | https://thrivehub-api.onrender.com |
| API docs | https://thrivehub-api.onrender.com/docs |
| Health | https://thrivehub-api.onrender.com/health |

### PostgreSQL schema

Production uses schema `thrivehub` (`DATABASE_SCHEMA` in blueprint). All R3/R4 tables (moderation, appeals, subscriptions, sponsorships, device tokens, AI flags, etc.) are created automatically on API startup via `init_database()`.

## Push Notification Setup

See `GET /api/v1/push/setup` for full Android (FCM) and iOS (APNs via FCM) setup instructions.

**Android:** Add `google-services.json`, register device token via API.
**iOS:** Add `GoogleService-Info.plist`, enable Push Notifications in Xcode, register token via API.

## Database Schema

Key entities:
- `tenants`, `users`, `profiles`, `user_skills`
- `posts`, `comments`, `reactions`
- `communities`, `community_members`, `events`, `event_participants`
- `conversations`, `messages`
- `notifications`, `reports`, `appeals`, `moderation_actions`
- `user_blocks`, `user_mutes`, `audit_logs`
- `subscription_tiers`, `user_subscriptions`, `sponsorships`
- `ai_moderation_flags`, `device_tokens`
- `master_values` (admin-controlled taxonomy)

## Spreadsheet Spec Coverage

| Release | Status |
|---------|--------|
| R0 - Foundation | Done |
| R1 - Community Core | Done |
| R2 - Events & Discovery | Done |
| R3 - Trust & Messaging | Done (moderation, appeals, WS, push, block/mute) |
| R4 - Commercial & AI | Done (subscriptions, sponsorships, AI moderation stub) |

### Remaining (future phases)
- OpenSearch integration for advanced search
- Multi-tenant admin portal (full isolation)
- Production FCM/APNs with firebase_messaging in Flutter
- Payment gateway integration for subscriptions
- Full AI moderation with external ML service
- 1000+ feature backlog items (enterprise features)

## License

Private — prepared for mayankmehta1610/thrivehub
