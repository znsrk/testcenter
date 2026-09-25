if (process.env.VERCEL) {
  console.error(
    'This version needs a persistent Node server, SQLite disk and FFmpeg for durable profiles and audio jobs. Static Vercel hosting is not supported. See README.md and docs/AUDIO_ARCHITECTURE.md; deploy the supplied Dockerfile on a persistent host.'
  )
  process.exit(1)
}
