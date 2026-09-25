# Listening generation and persistence

## Product rule

The master-code administrator may reserve **two listening tasks total per calendar day**, site-wide. Each task has a selected class (9–11), olympiad stage and question format. Calendar days use `APP_TIMEZONE`, default `Asia/Qyzylorda` (UTC+5). These are two manual generations, not two scheduled automatic runs or two per class. All valid profiles can see every published recording and filter the library by class/stage. Existing recordings never expire.

Each student code may also reserve **two private listening tasks per calendar day** through ordinary generation with `skill: listening`. These do not consume the administrator's shared slots. A student's recordings are visible only to that profile; shared administrator recordings are visible to all profiles. The server enforces both quotas from the authenticated profile and its database records. Students cannot retry another profile's job or publish a shared recording.

## Durable workflow

1. Validate the selection, authenticated session, API configuration and FFmpeg availability.
2. Within a SQLite `BEGIN IMMEDIATE` transaction, reserve the next daily slot and save a job. The administrator's shared slots use a unique `(day,slot)` constraint; each student's count is checked by owner and day in the same transaction. Request idempotency prevents double allocation. Return the job ID immediately.
3. Generate original questions and a script together through OpenAI strict Structured Outputs. Validate schema, question count, choice keys, evidence quotations, speaker count and 900–1200 spoken words (prompt targets 950–1100). Save the validated content as the job checkpoint before any TTS call.
4. Generate raw 24 kHz, mono, signed 16-bit PCM for each script segment. The script has at most 40 segments, each no more than 2,600 characters, comfortably below the speech model's input token limit for English. Speaker numbers consistently map to `coral`, `onyx`, `sage`, `nova`, `ash`.
5. Save each complete segment atomically (`.partial` then rename). On resume, reuse already completed segments; do not regenerate the script or completed speech. Add brief 350 ms gaps between segments.
6. Measure raw duration directly from sample count. Assemble with FFmpeg. Audio near the limits is normalized toward seven minutes using `atempo` (preserves pitch), only within the permitted 0.65–1.4 tempo range. Read the resulting WAV data to verify actual duration is 360–480 seconds. Do not pad minutes of silence or publish an out-of-range recording.
7. Atomically insert the task and finish the job. Administrator recordings are shared; student recordings remain private. Only then does a recording appear in the listening room. Serve its WAV through an authenticated endpoint with byte-range support for seeking. Never expose private file-system paths.
8. On process restart, interrupted jobs return to the queue and resume from their database checkpoint/files. On provider/encoding failure, save a recoverable failed job. Its owner can resume it up to three times. A failed reservation remains counted that day because earlier calls may already have incurred costs.

The server runs one worker, processing persisted jobs in creation order. Closing a browser does not cancel a job. Run **one Node process per database/data directory**; horizontal workers/replicas require a distributed job lease and shared storage, which this implementation does not provide.

## Audio styles

- Monologue: one stable voice, with natural paragraph boundaries between TTS calls.
- Dialogue: two or three recurring speakers, each with a different stable voice. Multiple TTS calls are assembled in turn order.
- Five speakers: distinct short extracts for matching roles/attitudes, as seen in the national examples.

The total recording is 6–8 minutes, not that duration for each voice. Questions follow the recording and include all the evidence needed. Every authorized user can open the transcript before answering; correct answers and feedback remain hidden until submission. The player explicitly identifies the voices as AI-generated.

## Cost and failure boundaries

Default text model: `gpt-5-mini` ($0.25 input / $2 output per million tokens when checked on 2026-09-25). Default TTS: `gpt-4o-mini-tts` ($0.60 per million text input tokens; $12 per million audio output tokens). Model pricing and availability may change; both names are environment-configurable. [Text model](https://developers.openai.com/api/docs/models/gpt-5-mini), [TTS model](https://developers.openai.com/api/docs/models/gpt-4o-mini-tts), [speech API](https://developers.openai.com/api/docs/guides/text-to-speech).

Student audio generation incurs TTS charges under the same server API key as administrator generation. The number of student profiles multiplies possible daily spending; two-per-profile is not a site-wide cost ceiling. The SDK does not automatically retry paid requests. The daily reservation limits, three explicit retries per job, script checkpoint and per-segment cache bound repeated work. A network failure or crash after a provider accepted a request but before the completed response reached disk can still lead to a repeated charge for that in-flight call. The application cannot guarantee exactly-once billing at an external provider.

Final audio is WAV for reliable assembly and exact duration measurement (about 20 MB for seven minutes), plus saved PCM segments. Budget approximately 40 MB of storage per new recording including checkpoints; daily usage now scales with the number of active students. Back up and provision the persistent volume accordingly. Archiving/compressing old segments can be added later; no user recordings are automatically deleted.

## Profiles, drafts and results

Each high-entropy student code is hashed; first use creates one permanent anonymous profile. Reusing the same code restores that profile on another device. Sessions last one year; the underlying profile and history do not expire. No email, name or password is collected. Codes cannot be recovered from their hashes, so keep the original code. Revocation disables access but preserves history.

Tasks, drafts, attempts, scores, essays, results, job checkpoints and code hashes live in SQLite. Audio lives under `DATA_DIR/audio`. Frontend drafts are backed up locally on each change, debounced to the server and periodically saved. Revision checks reject stale overwrites from other tabs. Local storage is only a recovery aid, never the authority for identity, roles or grades. Clearing browser storage does not delete synced progress; unsynced changes cannot be recovered from a different device.

The timer records focused, visible activity, pausing after two minutes without interaction and during review/grading. Listening playback counts as activity. Time is a practice estimate supplied by the browser, not a tamper-proof proctored exam metric. Attempts record incremental active time, while the task draft retains total active time.

## Verification

`npm test` includes a real FFmpeg assembly test with synthetic PCM: distinct voices, saved-segment reuse after a failure, pitch-preserving length normalization and final duration validation. API integration tests cover per-student and administrator quotas, privacy, idempotency, retry/restart recovery and shared publication. Browser tests use a separate temporary database and fake provider; they do not spend money or write production data. A live provider check still requires an API key and funded account.
