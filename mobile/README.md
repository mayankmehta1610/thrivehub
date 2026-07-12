# ThriveHub Mobile (Flutter)

Skills, Sports & Adventure community app — a 6-tab MVP that talks to the ThriveHub FastAPI backend.

Repository: [https://github.com/mayankmehta1610/thrivehub](https://github.com/mayankmehta1610/thrivehub)

## Overview

The Flutter app mirrors the web community experience on iOS and Android. It uses **Provider** for state, **Material 3** for UI, and **JWT** authentication against the same REST API as the web app. Branding (app name, tagline, colors, skill categories) is loaded from `GET /api/v1/config` — nothing is hard-coded.

## Navigation Structure (6 Tabs)

After login, `HomeScreen` hosts a bottom `NavigationBar` with six destinations:

| Tab | Label | Screen | Icon |
|-----|-------|--------|------|
| 0 | **Feed** | `home_screen.dart` (feed composer + post list) | Home |
| 1 | **Groups** | `communities_screen.dart` | Groups |
| 2 | **Events** | `events_screen.dart` | Event |
| 3 | **Messages** | `messages_screen.dart` | Chat |
| 4 | **Alerts** | `notifications_screen.dart` | Notifications |
| 5 | **Search** | `search_screen.dart` | Search |

**Stack navigation (pushed routes):**

| Screen | Route | Trigger |
|--------|-------|---------|
| Login | `login_screen.dart` | Shown when unauthenticated |
| Edit Profile | `profile_edit_screen.dart` | Tap avatar in app bar |

## Screens — What Each Does

### Login (`login_screen.dart`)
- Email/password form pre-filled with demo credentials
- Calls `POST /auth/login`, stores JWT tokens in `SharedPreferences`
- Displays app name and tagline from `/config`
- Gradient background (indigo → pink → teal pastels)

### Feed — Home tab (`home_screen.dart`)
- Pull-to-refresh personalized feed from `GET /feed`
- Sponsored banner from `GET /sponsorships?placement=feed_banner`
- Post composer: text + optional image upload (gallery picker → `POST /media/upload` → `POST /posts`)
- Post cards: author avatar/name, body, image, like toggle, comment count
- App bar: branding, avatar (→ Edit Profile), logout

### Groups — Communities tab (`communities_screen.dart`)
- Horizontal skill-category carousel from `/config` skill_categories
- Search bar filters `GET /communities?search=`
- Community cards: cover image, name, description, member count
- **No** community detail or join/leave UI yet

### Events tab (`events_screen.dart`)
- Lists `GET /events` with cover image, title, date/time, venue, participant count
- **No** event detail or registration UI yet

### Messages tab (`messages_screen.dart`)
- Split-pane: conversation list (left) + chat pane (right)
- `GET /messages/conversations` and `GET /messages/conversations/{id}/messages`
- Send via `POST /messages/conversations/{id}/messages` (REST only, no WebSocket)
- Indigo bubbles for sent messages, grey for received

### Alerts — Notifications tab (`notifications_screen.dart`)
- Lists `GET /notifications` with unread highlight (indigo tint + bold title)
- **No** mark-as-read actions yet

### Search tab (`search_screen.dart`)
- Cross-entity search via `GET /search?q=`
- Results show entity type, title, subtitle (profiles, communities, events, posts)
- Result rows are display-only (no navigation to detail screens)

### Edit Profile (`profile_edit_screen.dart`)
- Form: display name, bio, location, website, avatar URL
- **Upload avatar photo** button: gallery picker → size validation → `POST /media/upload` → sets avatar URL
- Saves via `PATCH /profiles/me`

## API Endpoints Wired in Mobile

All calls go through `lib/services/api_service.dart` with base URL from `--dart-define=API_URL`.

| Method | Endpoint | Used by | Status |
|--------|----------|---------|--------|
| `GET` | `/config` | Auth init, communities carousel, login branding | ✅ Implemented |
| `POST` | `/auth/login` | Login screen | ✅ Implemented |
| `POST` | `/auth/register` | ApiService only (no UI) | ⚠️ API only |
| `POST` | `/auth/refresh` | Token refresh on 401 | ✅ Implemented |
| `GET` | `/auth/me` | Session restore, profile | ✅ Implemented |
| `GET` | `/feed` | Feed tab | ✅ Implemented |
| `POST` | `/posts` | Feed composer | ✅ Implemented |
| `POST` | `/posts/{id}/reactions` | Post like button | ✅ Implemented |
| `GET` | `/communities` | Groups tab | ✅ Implemented |
| `GET` | `/events` | Events tab | ✅ Implemented |
| `GET` | `/notifications` | Alerts tab | ✅ Implemented |
| `GET` | `/search` | Search tab | ✅ Implemented |
| `GET` | `/messages/conversations` | Messages tab | ✅ Implemented |
| `GET` | `/messages/conversations/{id}/messages` | Messages tab | ✅ Implemented |
| `POST` | `/messages/conversations/{id}/messages` | Messages send | ✅ Implemented |
| `PATCH` | `/profiles/me` | Edit profile | ✅ Implemented |
| `POST` | `/media/upload` | Feed image, avatar upload | ✅ Implemented |
| `GET` | `/sponsorships` | Feed banner | ✅ Implemented |
| `GET` | `/subscriptions/tiers` | ApiService only (no UI) | ⚠️ API only |

### Not wired in mobile (available on web)

| Endpoint group | Web feature |
|----------------|-------------|
| `/profiles/{username}` | Public profile pages |
| `/profiles/{username}/follow` | Follow / unfollow |
| `/communities/{slug}`, `/join` | Community detail & membership |
| `/events/{id}/register` | Event registration |
| `/posts/{id}/comments` | Comment threads |
| `/notifications/{id}/read` | Mark notifications read |
| `/trust/*` | Block, mute, appeals |
| `/reports` | Content reporting |
| `/admin/*` | Admin portal |
| `/ws/messages/{id}` | Real-time WebSocket chat |
| `/push/*` | FCM device registration |

## Feature Status vs Web

| Feature | Mobile | Web | Notes |
|---------|--------|-----|-------|
| Login / JWT | ✅ | ✅ | Mobile pre-fills demo creds |
| Register | ❌ | ✅ | API method exists, no screen |
| Feed browse | ✅ | ✅ | |
| Create text post | ✅ | ✅ | |
| Create image post | ✅ Partial | ✅ | Mobile: gallery upload; web: URL or file |
| Reactions (like) | ✅ | ✅ | |
| Comments | ❌ | ✅ | Count shown only |
| Sponsorship banners | ✅ | ✅ | |
| Communities browse | ✅ | ✅ | |
| Community detail / join | ❌ | ✅ | |
| Events browse | ✅ | ✅ | |
| Event register | ❌ | ✅ | |
| Messages (REST) | ✅ | ✅ | |
| WebSocket chat | ❌ | ✅ | |
| Notifications list | ✅ | ✅ | |
| Mark notifications read | ❌ | ✅ | |
| Search | ✅ | ✅ | Mobile: no result navigation |
| Public profiles | ❌ | ✅ | |
| Follow / unfollow | ❌ | ✅ | |
| Profile edit | ✅ Partial | ✅ | Mobile: no cover photo, skills |
| Block / mute / report | ❌ | ✅ | |
| Admin portal | ❌ | ✅ | |
| Subscriptions UI | ❌ | ✅ | |
| Push notifications | ❌ | ✅ | Backend hooks only |
| Upload size limits | ✅ | ✅ | From `/config` upload_limits |

## Theme & Design

| Token | Value | Source |
|-------|-------|--------|
| Primary (indigo) | `#6366F1` | `ThemeData` seed + `/config` primary_color |
| Secondary (pink) | `#EC4899` | `ThemeData` secondary + `/config` secondary_color |
| Accent (teal) | `#14B8A6` | `ThemeData` tertiary + `/config` accent_color |
| Font | Inter via `google_fonts` | `GoogleFonts.interTextTheme()` |
| Design system | Material 3 | `useMaterial3: true` |
| Cards | 16px border radius, white fill | Feed, communities, events |
| App bar | Indigo → pink gradient | Home, Edit Profile |
| Login background | Pastel gradient | `#EEF2FF` → `#FDF2F8` → `#F0FDFA` |

UI patterns match the web: gradient headers, rounded cards, sponsorship labels, unread notification tint.

## Upload Limits

Limits are read from `GET /config` → `upload_limits`:

```json
{
  "image_max_bytes": 512000,
  "video_max_bytes": 2097152
}
```

Client-side validation runs before `POST /media/upload`. Oversized files show a red snackbar:
- Images: **"Image must be under 500KB"**
- Videos: **"Video must be under 2MB"**

Defaults apply if config is unavailable. Server enforces the same limits (HTTP 413).

## How to Run

### Prerequisites

- [Flutter 3.x](https://docs.flutter.dev/get-started/install) (stable channel)
- Android Studio / Xcode (emulators or physical devices)
- ThriveHub backend locally **or** hosted Render API

### First-time setup

If `android/` or `ios/` folders are missing:

```bash
cd mobile
flutter create . --project-name thrivehub_mobile
flutter pub get
```

### Start backend (local dev)

```bash
cd backend
python -m venv .venv
# Windows: .\.venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### Run the app

```bash
cd mobile
flutter pub get
flutter run
```

### API URL configuration

Set at compile time via `--dart-define=API_URL=...` in `lib/services/api_service.dart`.

| Target | API URL | Command |
|--------|---------|---------|
| **Android emulator** (default) | `http://10.0.2.2:8000/api/v1` | `flutter run` |
| **iOS simulator** (local) | `http://localhost:8000/api/v1` | `flutter run --dart-define=API_URL=http://localhost:8000/api/v1` |
| **Physical device** (LAN) | `http://<YOUR_PC_IP>:8000/api/v1` | `flutter run --dart-define=API_URL=http://192.168.1.100:8000/api/v1` |
| **Production (Render)** | `https://thrivehub-api.onrender.com/api/v1` | See below |

### Production (Render API)

```bash
flutter run --dart-define=API_URL=https://thrivehub-api.onrender.com/api/v1
```

Release builds:

```bash
# Android APK
flutter build apk --dart-define=API_URL=https://thrivehub-api.onrender.com/api/v1

# iOS (macOS only)
flutter build ios --dart-define=API_URL=https://thrivehub-api.onrender.com/api/v1
```

> **iOS local HTTP:** Testing against `http://` on simulator may require an App Transport Security exception in `ios/Runner/Info.plist`. Production HTTPS works without changes.

## Demo Login Credentials

All demo accounts use password **`demo1234`**. Admin accounts use **`admin123`**.

| Email | Password | Persona |
|-------|----------|---------|
| `alex@thrivehub.com` | demo1234 | Marathon runner & community builder *(default on login screen)* |
| `sam@thrivehub.com` | demo1234 | Outdoor adventurer |
| `jordan@thrivehub.com` | demo1234 | Weekend football organiser |
| `dancer@thrivehub.com` | demo1234 | Salsa & dance instructor |
| `comedian@thrivehub.com` | demo1234 | Standup comedian |
| `mia@thrivehub.com` | demo1234 | Singer-songwriter |
| `chef@thrivehub.com` | demo1234 | Home chef & food blogger |
| `lens@thrivehub.com` | demo1234 | Street photographer |
| `riley@thrivehub.com` | demo1234 | CrossFit coach |
| `art@thrivehub.com` | demo1234 | Digital artist |
| `admin@thrivehub.com` | admin123 | Platform administrator *(no admin UI in app)* |
| `ops@thrivehub.com` | admin123 | Tenant admin / moderation *(no admin UI in app)* |

## Project Structure

```
mobile/
├── lib/
│   ├── main.dart                 # App entry, Material 3 theme, auth routing
│   ├── providers/
│   │   └── auth_provider.dart    # Session + config state
│   ├── services/
│   │   └── api_service.dart      # HTTP client, JWT refresh, all API calls
│   ├── utils/
│   │   └── upload_limits.dart    # Config-driven upload validation
│   └── screens/
│       ├── login_screen.dart
│       ├── home_screen.dart      # Feed tab + bottom nav host
│       ├── communities_screen.dart
│       ├── events_screen.dart
│       ├── messages_screen.dart
│       ├── notifications_screen.dart
│       ├── search_screen.dart
│       └── profile_edit_screen.dart
├── android/
├── ios/
└── pubspec.yaml
```

## Future Roadmap

| Priority | Feature | Notes |
|----------|---------|-------|
| P0 | Register screen | Wire existing `register()` API |
| P0 | Public profile view | Navigate from search results |
| P0 | Community & event detail | Join/register flows |
| P1 | Post comments | Thread UI + API |
| P1 | Mark notifications read | PATCH endpoints |
| P1 | Follow / unfollow | Profile actions |
| P1 | WebSocket messaging | Replace REST polling |
| P2 | `firebase_messaging` push | FCM on Android, APNs via FCM on iOS |
| P2 | Video post upload | Gallery/camera with 2 MB limit |
| P2 | Deep linking | Open posts, profiles, communities from URLs |
| P2 | Offline cache | Hive/SQLite for feed |
| P3 | Subscriptions UI | Tier comparison screen |
| P3 | Admin moderation (tablet) | Optional ops companion app |
| P3 | Biometric login | Local auth after first JWT login |

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Connection refused` on emulator | Backend on port 8000; use default `10.0.2.2` URL |
| `Connection refused` on physical device | Use PC LAN IP, not `localhost` |
| `Session expired` after idle | Log in again; refresh token may have expired |
| `Image must be under 500KB` | Compress or resize before upload |
| `flutter: command not found` | Add Flutter SDK `bin/` to PATH |
| Missing `android/` or `ios/` | Run `flutter create .` inside `mobile/` |
