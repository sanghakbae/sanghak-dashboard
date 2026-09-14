// GitHub 새 팔로워 감지 → 웹훅 알림. GitHub Actions 크론에서 실행.
import { readFileSync, writeFileSync, mkdirSync, existsSync } from 'node:fs'

const USER = 'sanghakbae'
const WEBHOOK = process.env.WEBHOOK_URL
const TOKEN = process.env.GH_TOKEN
const STATE = 'data/followers.json'

async function fetchFollowers() {
  const all = []
  for (let page = 1; page <= 20; page++) {
    const headers = { 'User-Agent': 'follower-alert', Accept: 'application/vnd.github+json' }
    if (TOKEN) headers.Authorization = `Bearer ${TOKEN}`
    const r = await fetch(`https://api.github.com/users/${USER}/followers?per_page=100&page=${page}`, { headers })
    if (!r.ok) throw new Error(`GitHub API ${r.status}: ${await r.text()}`)
    const list = await r.json()
    all.push(...list.map((u) => u.login))
    if (list.length < 100) break
  }
  return all
}

async function notify(text) {
  if (!WEBHOOK) { console.warn('WEBHOOK_URL 없음 — 알림 건너뜀'); return }
  const r = await fetch(WEBHOOK, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text }),
  })
  if (!r.ok) throw new Error(`웹훅 전송 실패 ${r.status}: ${await r.text()}`)
}

const current = await fetchFollowers()

let known = null // null = 첫 실행(기준선만 저장, 알림 없음)
if (existsSync(STATE)) {
  try { known = JSON.parse(readFileSync(STATE, 'utf8')).followers || [] } catch { known = null }
}

if (known === null) {
  console.log(`첫 실행: 팔로워 ${current.length}명 기준선 저장 (알림 없음)`)
} else {
  const knownSet = new Set(known)
  const gained = current.filter((l) => !knownSet.has(l))
  if (gained.length === 0) {
    console.log('새 팔로워 없음')
  } else {
    console.log('새 팔로워:', gained.join(', '))
    for (const login of gained) {
      await notify(`🔔 새 GitHub 팔로워\n@${login} 님이 회원님을 팔로우했습니다.\nhttps://github.com/${login}\n(총 팔로워 ${current.length}명)`)
    }
  }
}

mkdirSync('data', { recursive: true })
writeFileSync(STATE, JSON.stringify({ followers: current, count: current.length, updatedAt: new Date().toISOString() }, null, 2) + '\n')
console.log('스냅샷 저장 완료:', current.length, '명')
