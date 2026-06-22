import { useEffect, useState } from 'react'
import { doc, getDoc, increment, setDoc } from 'firebase/firestore'
import { db } from './firebase.js'

const ref = doc(db, 'meta', 'visitors')

// 로드(새로고침)당 1회만 증가. 모듈 플래그로 StrictMode 중복 호출 방지.
let counted = false

export function useVisitors() {
  const [count, setCount] = useState(null)

  useEffect(() => {
    let alive = true
    ;(async () => {
      try {
        const shouldCount = !counted
        const snap = await getDoc(ref) // 증분 전 서버값 읽기
        const v = snap.data()?.count
        if (alive && typeof v === 'number') setCount(v + (shouldCount ? 1 : 0))
        if (shouldCount) {
          counted = true
          setDoc(ref, { count: increment(1), updatedAt: new Date().toISOString() }, { merge: true })
            .catch((e) => console.warn('방문자 카운트 증가 실패:', e.message))
        }
      } catch (e) {
        console.warn('방문자 카운트 비활성:', e.message)
      }
    })()
    return () => { alive = false }
  }, [])

  return count
}
