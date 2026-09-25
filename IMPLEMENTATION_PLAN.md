# Testcenter implementation

## Ordered work

- [x] 1. Replace browser-side Gemini generation with a server-side OpenAI Responses API adapter, strict JSON schemas, validation and configurable low-cost models.
- [x] 2. Replace signup with admin-issued access codes. First use creates a permanent anonymous profile; the same code restores it. Store only code/session hashes, with server-enforced admin permissions.
- [x] 3. Inspect every supplied PDF and document task formats. Build class/stage/skill generation and an admin-only shared listening library.
- [x] 3.5. Persist generated tasks, unfinished answers, attempts, feedback, points and active working time in a database.
- [x] 4. Evaluate essays against the four IELTS writing criteria and transparently convert the assessment to /40.
- [x] 5. Replace the UI with a responsive practice dashboard, task workspace, listening library, writing feedback and admin studio.
- [x] Verify build, backend security/persistence, audio limits/recovery, scoring and browser workflows; document deployment and remaining credentials.

## Decisions

- Text/assessment: `gpt-5-mini`; speech: `gpt-4o-mini-tts`. Both configurable server-side. Never expose an API key to the frontend.
- One unique reusable student code identifies one indefinite profile. No email, name or password. Admin creates/revokes codes; revocation preserves history. The master code is separate and server-only.
- SQLite and private audio files live on a persistent disk. A Node server serves the API and built frontend. This requires a persistent Node host, not a static-only or ephemeral Vercel deployment.
- Two listening generations total per calendar day in `Asia/Qyzylorda`, configurable timezone. The limit covers reservations (including failed jobs) to cap spend and prevent concurrent over-allocation. Retrying a failed job resumes the existing reservation.
- Each audio generation selects one class and olympiad stage. Published recordings remain available indefinitely to all valid codes. Students cannot call the generation or retry endpoints.
- Durable audio jobs save script/questions and each PCM segment, map speakers to stable distinct voices, assemble with FFmpeg, measure and normalize to 6–8 minutes without altering pitch, and publish only after audio and questions are ready. Jobs resume after server restart.
- Supplied material informs structure and difficulty; generated content is original. Missing reference combinations are explicitly identified as adaptations.
- Preserve `Tasks/` and all other existing source files. The previous app stays on disk but is excluded from the new application entry point.

## Configuration needed for live generation

`OPENAI_API_KEY`, a strong `ADMIN_ACCESS_CODE`, and a persistent `DATA_DIR`. No paid generation is performed during automated tests.

Local setup created an ignored `.env` with a random master code. `OPENAI_API_KEY` remains empty. Live task/essay quality and live speech must be checked after adding a funded key; the API and browser tests use an isolated fake provider. Docker deployment files are provided but the container was not built because Docker is unavailable on this device. A persistent production host has not been selected or deployed.

Validation: production build passed; 9 backend/audio integration tests passed; 10 desktop/mobile browser tests passed; dependency audit reported zero known vulnerabilities. All 14 original files in `Tasks/` remain present and ignored.
