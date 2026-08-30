// GitHub 응답 캐시를 Firestore에 보관 (localStorage 대신 — 방문자 간 공유)
import { doc, getDoc, setDoc } from 'firebase/firestore'
import { db } from './firebase.js'

const ref = doc(db, 'meta', 'ghCache')
const CACHE_VERSION = 2

// 화면에서 실제로 쓰는 필드만 저장 (원본 응답은 200KB대 → 문서 크기·전송량 절감)
const slimUser = (u) => u && {
  name: u.name ?? null,
  bio: u.bio ?? null,
  location: u.location ?? null,
  avatar_url: u.avatar_url ?? null,
  followers: u.followers ?? 0,
}

const slimRepo = (r) => ({
  id: r.id,
  name: r.name,
  description: r.description ?? null,
  homepage: r.homepage ?? null,
  html_url: r.html_url,
  language: r.language ?? null,
  stargazers_count: r.stargazers_count ?? 0,
  pushed_at: r.pushed_at ?? null,
  topics: r.topics || [],
})

export async function readGhCache() {
  try {
    const snap = await getDoc(ref)
    if (!snap.exists()) return null
    const { user, repos, contrib, savedAt, version } = snap.data()
    if (version !== CACHE_VERSION) return null
    if (!user && !repos?.length) return null
    return {
      data: { user: user ?? null, repos: repos || [], contrib: contrib ?? null },
      savedAt: savedAt || 0,
    }
  } catch {
    return null // 캐시는 부가 기능 — 실패해도 원본 fetch로 진행
  }
}

export async function writeGhCache({ user, repos, contrib }) {
  try {
    await setDoc(ref, {
      version: CACHE_VERSION,
      user: slimUser(user) ?? null,
      repos: (repos || []).map(slimRepo),
      contrib: contrib ?? null,
      savedAt: Date.now(),
    })
  } catch { /* noop */ }
}
