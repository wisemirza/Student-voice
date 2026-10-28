# Student Voice - UWE Bristol (Data Science & AI)

A minimal, clutter-free, mobile-first anonymous student feedback and voting web app for the **UWE Bristol Data Science and Artificial Intelligence** programme, connected to **Firebase Cloud Firestore**.

---

## 1. Key Design & Architecture Highlights

- **Ultra-Clean, Frictionless Student Interface (`public/index.html`, `public/app.js`, `public/styles.css`)**:
  - Always-ready composer right at the top: students simply type their issue plainly and tap **Submit** (adding a title is completely optional, and there are no category dropdowns or account prompts).
  - Subtle, muted anonymity reminder; full privacy details live on a separate `/privacy` page so the main screen stays completely uncluttered.
- **Automatic Screen-Wide English & Chinese (`EN` | `中文`)**:
  - Selecting `中文` or `EN` in the top bar translates **all text on the screen automatically** (including every user-submitted issue) via server-side translation (`src/translate.js`) with permanent caching in Firestore.
- **Admin-Only QR Code & Moderation (`/admin`)**:
  - Sharing tools (`Share & QR Code`, SVG download, copyable student link) and moderation controls (`Hide`, `Remove`, `Restore`, `Dismiss Reports`) live exclusively inside the password-protected Admin Console (`/admin`).
- **Firebase Cloud Firestore Storage (`src/db.js`, `firestore.rules`)**:
  - Connected to Firebase project `studio-9101762883-d0a0e` (`student-voice-db` in `europe-west2`, London).
  - All reads and writes run strictly through the trusted Node.js `firebase-admin` backend using atomic Firestore transactions (`runTransaction`) and deterministic composite vote IDs (`${issueId}_${voterTokenHash}`). Direct browser SDK access is locked down in `firestore.rules` (`allow read, write: if false;`).

---

## 2. Running Locally

```bash
# Start development server with live reload (http://localhost:3000)
npm run dev

# Or start production server
npm start

# Run automated API & real headless Chrome E2E tests
npm test
```

- **Student App**: `http://localhost:3000`
- **Admin Console (Moderation + QR Code)**: `http://localhost:3000/admin`
- **Privacy Notice Page**: `http://localhost:3000/privacy`

---

## 3. Environment Variables (`.env.example`)

| Variable | Required | Description |
| :--- | :--- | :--- |
| `PORT` | Optional | HTTP port (default `3000`). |
| `COOKIE_SECRET` | **Yes (Prod)** | Secret key used to sign `HttpOnly` voter & admin cookies and HMAC-hash voter tokens. |
| `ADMIN_PASSWORD` | **Yes (Prod)** | Password for `/admin` moderation and QR sharing console. |
| `FIREBASE_PROJECT_ID` | **Yes** | Firebase Project ID (`studio-9101762883-d0a0e`). |
| `FIREBASE_DATABASE_ID` | **Yes** | Firestore database ID (`student-voice-db`). |
| `FIREBASE_SERVICE_ACCOUNT_PATH` | Local Dev | Path to gitignored `./service-account.json` (not needed on Cloud Run / Firebase App Hosting where Application Default Credentials are automatic). |
| `TRANSLATION_PROVIDER` | Optional | `auto` (default automatic translation), `google`, `deepl`, or `openai`. |
