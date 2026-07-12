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
| Backend API | FastAPI, SQLAlchemy, JWT auth |
| Database | SQLite (dev), PostgreSQL-ready schema |
| Web | React 19, Vite, Tailwind CSS 4 |
| Mobile | Flutter, Provider, Material 3 |
| Images | Unsplash URLs (seeded in DB) |

## Features Implemented

### Core (R1 - Community Core)
- **Auth**: Register, login, JWT refresh tokens
- **Profiles**: Public profiles, avatars, bios, follow/unfollow, verification badges
- **Posts & Feed**: Create posts, image posts, personalized feed, reactions (like/celebrate), comments
- **Communities**: Create, join, browse, community detail pages
- **Events**: Create, register, browse with capacity tracking
- **Messaging**: Direct conversations, send/receive messages
- **Notifications**: In-app notification center, mark read
- **Search**: Cross-entity search (profiles, communities, events, posts)
- **Admin Portal**: Master data management, user listing (admin role)

### Data & API
- All content from database — no hard-coded lists
- Server-side pagination, sorting, searching on all list endpoints
- Client-side pagination, sorting, searching via reusable `DataTable` component (web)
- Configurable platform branding from `master_values` table
- Seed data: demo users, posts, communities, events, messages, notifications

## Quick Start

### Prerequisites
- Python 3.12+
- Node.js 18+
- Flutter 3.x (for mobile)

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
For physical device, use: `flutter run --dart-define=API_URL=http://YOUR_IP:8000/api/v1`

## Demo Accounts

| Email | Password | Role |
|-------|----------|------|
| admin@thrivehub.com | admin123 | Admin |
| alex@thrivehub.com | demo1234 | Member |
| sam@thrivehub.com | demo1234 | Member |
| jordan@thrivehub.com | demo1234 | Member |

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
| Notifications | `/api/v1/notifications/*` | List, mark read |
| Search | `/api/v1/search` | Cross-entity search |
| Config | `/api/v1/config` | Platform branding (from DB) |
| Admin | `/api/v1/admin/*` | Masters, users |

All list endpoints support: `?page=1&page_size=20&sort_by=field&sort_order=asc|desc&search=term`

## Database Schema

Key entities (per spreadsheet `07_Data_Model`):
- `tenants`, `users`, `profiles`, `user_skills`
- `posts`, `comments`, `reactions`, `post_media`
- `communities`, `community_members`
- `follows`, `events`, `event_participants`
- `conversations`, `messages`
- `notifications`, `reports`
- `master_values` (admin-controlled taxonomy)

## Production Deployment

Set environment variables in `backend/.env`:

```env
DATABASE_URL=postgresql://user:pass@localhost/thrivehub
SECRET_KEY=your-production-secret
CORS_ORIGINS=https://yourdomain.com
```

## Spreadsheet Spec Coverage

Based on `Community_Platform_Complete_Requirements_1000Plus.xlsx`:

| Release | Status |
|---------|--------|
| R0 - Foundation | Done (architecture, auth skeleton, admin) |
| R1 - Community Core | Done (profiles, posts, feed, follows, communities) |
| R2 - Events & Discovery | Done (events, search, notifications, mobile) |
| R3 - Trust & Messaging | Partial (messaging, reports; moderation queues pending) |
| R4 - Commercial & AI | Not started (subscriptions, AI moderation) |

### Remaining (future phases)
- Advanced moderation workflows & appeals
- WebSocket real-time messaging
- Push notifications (FCM/APNs)
- OpenSearch integration
- Redis caching, S3 media uploads
- Multi-tenant admin portal
- AI moderation & recommendations (R4)
- 1000+ feature backlog items (enterprise features)

## License

Private — prepared for mayankmehta1610/thrivehub
