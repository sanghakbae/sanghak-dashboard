import { addDoc, collection, serverTimestamp } from 'firebase/firestore'
import { db } from './firebase.js'

// IP·위치는 세션 내 1회만 조회해 캐시
let geoPromise = null
async function getGeo() {
  if (geoPromise) return geoPromise
  geoPromise = (async () => {
    const g = {}
    try { g.ip = (await (await fetch('https://api4.ipify.org?format=json')).json()).ip } catch { /* */ }
    try {
      const url = g.ip
        ? `https://get.geojs.io/v1/ip/geo/${g.ip}.json`
        : 'https://get.geojs.io/v1/ip/geo.json'
      const r = await (await fetch(url)).json()
      Object.assign(g, { ip: g.ip || r.ip, city: r.city, region: r.region, country: r.country })
    } catch { /* */ }
    return g
  })()
  return geoPromise
}

// 감사로그: 언제(ts) 어디서(ip·위치) 무엇을(action·target) 클릭했는지 기록
export async function logEvent(action, target) {
  try {
    const geo = await getGeo()
    await addDoc(collection(db, 'audit'), {
      action,
      target: target || null,
      ip: geo.ip || 'unknown',
      city: geo.city || null,
      region: geo.region || null,
      country: geo.country || null,
      ua: navigator.userAgent,
      ref: document.referrer || null,
      path: location.pathname + location.hash,
      ts: serverTimestamp(),
    })
  } catch (e) {
    console.warn('audit 기록 실패:', e.message)
  }
}
