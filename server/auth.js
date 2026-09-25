import { createHash, randomBytes, randomUUID, timingSafeEqual } from 'node:crypto'
import { AppError } from './config.js'
import { now, transaction } from './db.js'

export const hashSecret = (value) => createHash('sha256').update(value).digest('hex')
const normalize = (code) => code.trim()
export const COOKIE = 'testcenter_session'

export function createAuth(db, config) {
  const cookieOptions = {
    httpOnly: true,
    secure: config.secureCookie,
    sameSite: 'strict',
    path: '/',
    maxAge: 365 * 24 * 60 * 60 * 1000,
  }
  function issueCode(label) {
    const code =
      'TC-' +
      randomBytes(15)
        .toString('hex')
        .toUpperCase()
        .match(/.{1,6}/g)
        .join('-')
    const id = randomUUID()
    db.prepare('INSERT INTO codes(id,hash,label,created_at) VALUES(?,?,?,?)').run(id, hashSecret(code), label, now())
    return { id, code, label }
  }
  function login(code, res) {
    if (!config.adminCode) throw new AppError(503, 'Access is not configured. Run npm run setup on the server.')
    const digest = hashSecret(normalize(code))
    const isMaster = timingSafeEqual(Buffer.from(digest), Buffer.from(hashSecret(config.adminCode)))
    const user = transaction(db, () => {
      if (isMaster) {
        db.prepare("INSERT OR IGNORE INTO users VALUES('admin','admin',?)").run(now())
        return db.prepare("SELECT * FROM users WHERE id='admin'").get()
      }
      const access = db.prepare('SELECT * FROM codes WHERE hash=? AND disabled=0').get(digest)
      if (!access)
        throw new AppError(401, 'That access code is not valid. Check it or ask your teacher for a new code.')
      if (!access.user_id) {
        const id = randomUUID()
        db.prepare("INSERT INTO users VALUES(?,'student',?)").run(id, now())
        db.prepare('UPDATE codes SET user_id=? WHERE id=?').run(id, access.id)
        access.user_id = id
      }
      return db.prepare('SELECT * FROM users WHERE id=?').get(access.user_id)
    })
    const token = randomBytes(32).toString('base64url')
    db.prepare('DELETE FROM sessions WHERE expires_at < ?').run(Date.now())
    db.prepare('INSERT INTO sessions VALUES(?,?,?)').run(hashSecret(token), user.id, Date.now() + cookieOptions.maxAge)
    res.cookie(COOKIE, token, cookieOptions)
    return user
  }
  function authenticate(req, _res, next) {
    const token = req.cookies[COOKIE]
    const user =
      token &&
      db
        .prepare(
          `SELECT u.* FROM sessions s JOIN users u ON u.id=s.user_id
      WHERE s.hash=? AND s.expires_at>? AND (u.role='admin' OR EXISTS
      (SELECT 1 FROM codes c WHERE c.user_id=u.id AND c.disabled=0))`
        )
        .get(hashSecret(token), Date.now())
    if (!user) return next(new AppError(401, 'Enter your access code to continue.'))
    req.user = user
    next()
  }
  function admin(req, _res, next) {
    next(req.user.role === 'admin' ? undefined : new AppError(403, 'Only the administrator can do this.'))
  }
  function logout(req, res) {
    if (req.cookies[COOKIE]) db.prepare('DELETE FROM sessions WHERE hash=?').run(hashSecret(req.cookies[COOKIE]))
    res.clearCookie(COOKIE, { ...cookieOptions, maxAge: undefined })
  }
  function revoke(id) {
    const code = db.prepare('SELECT * FROM codes WHERE id=?').get(id)
    if (!code) throw new AppError(404, 'Code not found.')
    transaction(db, () => {
      db.prepare('UPDATE codes SET disabled=1 WHERE id=?').run(id)
      if (code.user_id) db.prepare('DELETE FROM sessions WHERE user_id=?').run(code.user_id)
    })
  }
  return { issueCode, login, authenticate, admin, logout, revoke }
}
