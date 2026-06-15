import { useEffect, useState } from 'react'

// baseball 프로젝트의 Firestore를 재사용(별도 문서). 웹 API 키는 공개 가능 값.
const PROJECT = 'baseball-93c5d'
const API_KEY = 'AIzaSyDQ6_sGVnwGrFXLNkwuWyoCWhCsEHpln24'
const DOC = `projects/${PROJECT}/databases/(default)/documents/meta/visitors-sanghak`
const READ = `https://firestore.googleapis.com/v1/${DOC}?key=${API_KEY}`
const COMMIT = `https://firestore.googleapis.com/v1/projects/${PROJECT}/databases/(default)/documents:commit?key=${API_KEY}`

// 페이지 로드(새로고침)당 1회만 증가. 모듈 플래그로 StrictMode 중복 호출 방지.
let countedThisLoad = false

export function useVisitors() {
  const [count, setCount] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        // 이미 이 로드에서 증가했으면(StrictMode 2회차) 읽기만
        if (countedThisLoad) {
          const d = await (await fetch(READ)).json()
          const v = Number(d?.fields?.count?.integerValue)
          if (alive && Number.isFinite(v)) setCount(v)
          return
        }
        countedThisLoad = true
        // standalone transform: 다른 필드 건드리지 않고 count만 +1, 새 값 반환
        const body = {
          writes: [{
            transform: {
              document: DOC,
              fieldTransforms: [{ fieldPath: 'count', increment: { integerValue: '1' } }],
            },
          }],
        }
        const d = await (await fetch(COMMIT, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        })).json()
        const v = Number(d?.writeResults?.[0]?.transformResults?.[0]?.integerValue)
        if (alive && Number.isFinite(v)) setCount(v)
      } catch {
        /* 카운터 실패는 페이지에 영향 없음 */
      }
    })()
    return () => { alive = false }
  }, [])

  return count
}
