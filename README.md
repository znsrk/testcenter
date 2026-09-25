# Testcenter

English olympiad practice for classes 9–11. The current Vercel release is a static, browser-only app: one shared access code, OpenAI-generated text tasks, local drafts and progress, and writing feedback out of 40. Audio generation is under construction.

## Deploy the browser-only version on Vercel

Import this repository as a **Vite** project. Use the repository root, `npm install`, `npm run build`, and `dist` as the output directory. In **Project Settings → Environment Variables**, set these for **Production** before deploying:

```dotenv
VITE_ACCESS_CODE=your-shared-friends-code
VITE_OPENAI_API_KEY=your-separate-limited-openai-project-key
VITE_OPENAI_TEXT_MODEL=gpt-5-mini
```

Redeploy after changing any of them; Vite embeds their values at build time. Both the access code and OpenAI key can be extracted by anyone who loads the site, so the code is only a casual gate, **not real security**. Use a dedicated OpenAI project key and a strict spending limit. Never commit the real values. The old `OPENAI_API_KEY`/`ADMIN_ACCESS_CODE` settings do not configure this static deployment.

Progress, generated tasks, essays, and attempts stay in the current browser's IndexedDB. Signing out does not erase them. Clearing site data, switching browsers/devices, or using private browsing does not restore them. Jobs need the page open while generating; an interrupted job can be resumed after returning. The former SQLite data and recordings are not migrated to browsers or hosted on Vercel. Audio generation and cross-device profiles require a future backend.

For local static development, put the three `VITE_` values in an ignored `.env.local`, run `npm install` and `npm run dev:web`, then open the Vite URL. `npm run build`, `npm test`, and `npm run test:e2e` verify the static build, pure/server legacy logic, and a mocked browser generation flow respectively. Browser smoke tests do not spend OpenAI credits. The reference-paper audit remains in [docs/REFERENCE_AUDIT.md](docs/REFERENCE_AUDIT.md).

## Legacy persistent-server version (not deployed on Vercel)

The Node/SQLite/FFmpeg server remains in the repository for future use. The sections below document that older architecture; its server accounts and audio library are separate from the current static app.

### Run the legacy server locally

Requires **Node.js 22.13+** and **FFmpeg** on PATH for audio generation. Its login UI is no longer the active frontend; these are server settings only.

```sh
npm install
npm run setup
```

The setup command creates an ignored `.env` with a random `ADMIN_ACCESS_CODE` and preserves any existing `.env`. Open it locally and set `OPENAI_API_KEY` for the legacy server. This is different from the browser-only deployment's `VITE_` variables.

```sh
npm run dev
```

Open **http://localhost:5173** (use this exact origin, matching `APP_ORIGIN`). Vite proxies `/api` to the Node server on port 3001. If you change the API port, also update the Vite proxy. No paid API calls run automatically on startup except previously queued jobs resuming.

1. Enter the master code from `.env` on the website's code screen.
2. In **Admin studio**, create student codes and copy them before leaving. Only code hashes are stored.
3. A student enters one code. A permanent anonymous profile is created once, with no signup form. The same code restores the profile on another browser/device.
4. Choose class, olympiad stage, skill and task format in **Practice studio**. The task runs as a saved background job, then appears in **My library**.
5. Answers and essays autosave. Submit for points, explanations, active time and saved attempts. Writing uses four IELTS criteria with a proportional /40 conversion; it is practice feedback, not an official IELTS grade.
6. Each student code may generate **two private listening tasks per day** in the Listening room. The admin may separately generate **two shared listening tasks per day across the entire site**. Choose monologue, dialogue or five speakers. Failed jobs can resume without using another slot. Transcripts are available before answering.

API keys, profile data and audio stay on the server. There is no email/name collection. Anyone holding a student's code can open that profile, so treat codes as credentials. Keep backups of the persistent data folder; clearing a browser does not erase synced progress.

## What changed

The active frontend is `src/studio`, entered from `src/main.tsx`. The previous signup/Gemini/Supabase screens remain on disk to preserve the existing files, but are not routed, compiled or bundled into the new app. Unused dependencies from those screens were removed. Existing Supabase users/history were not imported: there were no connection credentials or a schema dump available, and new code profiles are a separate data model.

The backend is `server/`: Express, Node's built-in SQLite, OpenAI Responses with strict JSON schemas, server-side scoring, secure session cookies and a durable background queue. The frontend contains no API keys or client-trusted admin checks.

All 11 supplied PDFs were inspected. See [the reference audit](docs/REFERENCE_AUDIT.md) for formats, class-specific word ranges and missing reference combinations. `Tasks/` is preserved and stays ignored. Short practice sets and unsupported combinations are adaptations, not replicas of full official papers.

## Audio planning

Read [the audio and persistence architecture](docs/AUDIO_ARCHITECTURE.md) for quota semantics, script validation, stable voice mapping, saved-segment retry, 6–8 minute verification, publication, storage estimates and failure boundaries.

The two default models were selected using [official OpenAI model documentation](https://developers.openai.com/api/docs/models/gpt-5-mini) and [speech documentation](https://developers.openai.com/api/docs/guides/text-to-speech). At implementation, text pricing was $0.25 input / $2 output per million tokens. Actual account availability and billed quality/cost need a live API check.

Writing criteria follow [IELTS's official writing description](https://ielts.org/take-a-test/test-types/ielts-academic-test/ielts-academic-format-writing). The score is calculated as `mean(four criterion bands) / 9 * 40`, rounded to one decimal. This custom conversion is shown alongside criterion bands and evidence from the student's writing.

### Deploy the legacy server with persistence

```sh
npm run build
npm start
```

The Node server serves both `dist/` and `/api`. For direct local production-build testing, set `APP_ORIGIN=http://localhost:3001` and open that address. In production, use an HTTPS reverse proxy and set:

```dotenv
NODE_ENV=production
APP_ORIGIN=https://your-domain.example
COOKIE_SECURE=true
TRUST_PROXY=1
DATA_DIR=/persistent/testcenter
```

Set `TRUST_PROXY` only to match your actual trusted proxy chain. The startup validation requires a master code of at least 16 characters, HTTPS origin and secure cookies for production. Do not expose the dev server publicly.

Alternatively use the supplied `Dockerfile` and `compose.yaml` after configuring `.env` for production:

```sh
docker compose up --build -d
```

The container installs FFmpeg, runs as a non-root user, stores data in the `testcenter-data` volume, and binds port 3001 to localhost for a reverse proxy. Run **one instance per database**. Use a host with persistent disk for this legacy architecture; the current `vercel.json` instead deploys the separate static browser-only app.

Back up the entire `DATA_DIR`, including audio. For a simple consistent backup, gracefully stop the app, copy that directory/volume (including any SQLite WAL files), then restart. Restore the same directory and environment settings. Never delete the volume to update the app. The database is not automatically synchronized between different servers.

## Verify

```sh
npm run build
npm test
npx playwright install chromium
npm run test:e2e
npm audit
```

Backend tests use temporary databases. Audio tests exercise the actual FFmpeg pipeline with synthetic PCM. Browser tests cover desktop/mobile login, generation, draft reload, marks, writing feedback, audio playback and admin access. The browser harness only runs through the test command; production never enables fake AI or test credentials. No API charges occur in these tests.

No live model output or TTS recording has been verified until a real `OPENAI_API_KEY` is configured. For acceptance, create a task in each format, grade a sample essay, and use one admin listening slot to confirm actual speech quality and question correctness before sharing the site.
