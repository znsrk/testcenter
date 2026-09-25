import { readConfig } from './config.js'
import { createApp } from './app.js'

const config = readConfig()
const { app, jobs, db } = createApp(config)
const server = app.listen(config.port, '0.0.0.0', () => {
  console.log(`Testcenter API running on port ${config.port}.`)
  if (!config.adminCode) console.log('Run npm run setup to configure your master access code.')
  if (!config.apiKey) console.log('OpenAI is not configured. Add OPENAI_API_KEY to .env for generation.')
  jobs.run()
})
server.requestTimeout = 30_000
let closing = false
function shutdown() {
  if (closing) return
  closing = true
  jobs.stop()
  server.close()
  const timer = setInterval(() => {
    if (!jobs.working) {
      clearInterval(timer)
      db.close()
      process.exit(0)
    }
  }, 250)
  setTimeout(() => process.exit(0), 15_000).unref()
}
process.on('SIGTERM', shutdown)
process.on('SIGINT', shutdown)
