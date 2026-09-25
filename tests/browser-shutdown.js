export default async function shutdown() {
  await fetch('http://127.0.0.1:4179/__test/shutdown', { method: 'POST', signal: AbortSignal.timeout(5000) }).catch(
    () => {}
  )
}
