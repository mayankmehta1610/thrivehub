# ThriveHub Mobile (Flutter)

Skills, Sports & Adventure community app — a 6-tab MVP that talks to the ThriveHub FastAPI backend.

Repository: [https://github.com/mayankmehta1610/thrivehub](https://github.com/mayankmehta1610/thrivehub)

## Feature Status

| Feature | Status | Notes |
|---------|--------|-------|
| Login (JWT) | Implemented | Pre-filled demo credentials on login screen |
| Token refresh | Implemented | Automatic via `ApiService` |
| Feed (browse posts) | Implemented | Pull-to-refresh, author avatars, reaction counts |
| Create post | Implemented | Text posts only |
| Like/react to post | Implemented | Heart icon toggles like |
| Sponsorship banners | Implemented | Shown at top of feed |
| Communities browse | Implemented | Cover images, member counts |
| Community search | Implemented | Search bar filters list |
| Skill category carousel | Implemented | Horizontal scroll from `/config` |
| Events browse | Implemented | Date, venue, participant count |
| Messages (DMs) | Implemented | Split-pane: conversation list + chat |
| Send message | Implemented | REST API (not WebSocket) |
| Notifications list | Implemented | Unread highlight |
| Cross-entity search | Implemented | Profiles, communities, events, posts |
| Profile edit | Implemented | Display name, bio, location, website, avatar URL |
| Logout | Implemented | App bar action |
| Register | Missing | API method exists; no UI screen |
| Public profile view | Missing | Cannot view other users' profiles |
| Follow / unfollow | Missing | — |
| Community detail / join | Missing | Browse-only list |
| Event detail / register | Missing | Browse-only list |
| Post comments | Missing | Count shown; no comment UI |
| Image posts / camera upload | Missing | Text posts only |
| Real-time WebSocket chat | Missing | Polling via REST on send |
| Push notifications (FCM) | Missing | Backend hooks exist |
| Mark notifications read | Missing | List is read-only |
| Admin portal | Missing | Web only |
| Subscriptions / tiers UI | Missing | API method exists; no screen |

## Prerequisites

- [Flutter 3.x](https://docs.flutter.dev/get-started/install) (stable channel)
- Android Studio / Xcode (for emulators or device builds)
- ThriveHub backend running locally **or** use the hosted Render API (see below)

## First-Time Setup

If `android/` or `ios/` folders are missing (e.g. fresh clone with only `lib/`), generate platform scaffolding **without overwriting your Dart code**:

```bash
cd mobile
flutter create . --project-name thrivehub_mobile
flutter pub get
```

> `flutter create .` detects the existing `pubspec.yaml` and `lib/` tree. It only adds missing platform folders and project files.

## How to Run

### 1. Start the backend (local dev)

```bash
cd backend
python -m venv .venv
# Windows: .\.venv\Scripts\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
uvicorn app.main:app --reload --port 8000
```

### 2. Run the app

```bash
cd mobile
flutter pub get
flutter run
```

Pick a connected device or emulator when prompted (`flutter devices`).

## API URL Configuration

The base URL is set at compile time via `--dart-define=API_URL=...` in `lib/services/api_service.dart`.

| Target | API URL | Command |
|--------|---------|---------|
| **Android emulator** (default) | `http://10.0.2.2:8000/api/v1` | `flutter run` |
| **iOS simulator** (local) | `http://localhost:8000/api/v1` | `flutter run --dart-define=API_URL=http://localhost:8000/api/v1` |
| **Physical device** (local LAN) | `http://<YOUR_PC_IP>:8000/api/v1` | `flutter run --dart-define=API_URL=http://192.168.1.100:8000/api/v1` |
| **Production (Render)** | `https://thrivehub-api.onrender.com/api/v1` | See below |

### Production (Render API)

Point the app at the hosted API — no local backend required:

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

> **iOS local HTTP:** If testing against `http://` on a simulator, you may need an App Transport Security exception in `ios/Runner/Info.plist`. Production HTTPS works without changes.

## Demo Login Credentials

All seeded demo accounts use password **`demo1234`**.

| Email | Persona |
|-------|---------|
| `alex@thrivehub.com` | Marathon runner & community builder (default on login screen) |
| `sam@thrivehub.com` | Outdoor adventurer |
| `jordan@thrivehub.com` | Weekend football organiser |
| `dancer@thrivehub.com` | Salsa & dance instructor |
| `comedian@thrivehub.com` | Standup comedian |
| `chef@thrivehub.com` | Home chef |
| `lens@thrivehub.com` | Street photographer |

Admin accounts (`admin@thrivehub.com` / `admin123`) work for API login but the mobile app has no admin UI.

## Screen Guide (Screenshot Descriptions)

### Login
Gradient background (indigo → pink → teal). Centered ThriveHub logo tile with gradient “T”, app name and tagline from `/config`. White rounded email/password fields pre-filled with `alex@thrivehub.com` / `demo1234`. Full-width indigo **Sign In** button.

### Feed (Home tab)
Gradient app bar with app name, profile avatar (tap → edit profile), and logout. Optional sponsored banner card at top. “Share your adventure…” composer with **Post** button. Scrollable post cards: author avatar, name, @username, body text, optional image, heart + comment counts.

### Groups (Communities tab)
Horizontal skill-category image chips (from config). Search bar. Vertical list of community cards with cover photo, name, description snippet, and member count in indigo.

### Events tab
Cards with event cover image, title, calendar date/time, map-pin venue, and teal participant count.

### Messages tab
Split layout: narrow left column of conversation titles with last-message preview; right pane shows chat bubbles (indigo for sent, grey for received) and a rounded message input with send icon.

### Alerts (Notifications tab)
Notification cards — unread items have indigo background tint and bold title; read items are plain white cards with bell icon.

### Search tab
Search field with **Go** button. Results list shows entity-type avatar initial, title, and subtitle (`profile · @username`, etc.). Empty state: “Search profiles, communities, events & posts”.

### Edit Profile (pushed from avatar)
Gradient app bar “Edit Profile”. Form fields: Display Name, Bio, Location, Website, Avatar URL. Indigo **Save Changes** button; success snackbar and pop back to feed.

## Project Structure

```
mobile/
├── lib/
│   ├── main.dart              # App entry, theme, auth routing
│   ├── providers/
│   │   └── auth_provider.dart # Session state
│   ├── services/
│   │   └── api_service.dart   # HTTP client + API_URL dart-define
│   └── screens/               # 6 tabs + login + profile edit
├── android/                   # Generated by flutter create
├── ios/                       # Generated by flutter create
└── pubspec.yaml
```

## Troubleshooting

| Issue | Fix |
|-------|-----|
| `Connection refused` on emulator | Ensure backend is on port 8000; use default `10.0.2.2` URL |
| `Connection refused` on physical device | Use your PC's LAN IP, not `localhost` |
| `Session expired` after idle | Log in again; refresh token may have expired |
| `flutter: command not found` | Add Flutter SDK `bin/` to your PATH |
| Missing `android/` or `ios/` | Run `flutter create .` inside `mobile/` |
