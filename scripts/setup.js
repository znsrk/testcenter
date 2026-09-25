import { existsSync, readFileSync, writeFileSync } from 'node:fs'
import { randomBytes } from 'node:crypto'

if (existsSync('.env')) {
  console.log('.env already exists; it was preserved. Set ADMIN_ACCESS_CODE and OPENAI_API_KEY there.')
} else {
  const code = 'MASTER-' + randomBytes(18).toString('base64url')
  const template = readFileSync('.env.example', 'utf8')
  writeFileSync('.env', template.replace('ADMIN_ACCESS_CODE=', `ADMIN_ACCESS_CODE=${code}`), {
    flag: 'wx',
    mode: 0o600,
  })
  console.log(
    'Created ignored .env with a random master access code. Read it locally, add OPENAI_API_KEY, then run npm run dev.'
  )
}
