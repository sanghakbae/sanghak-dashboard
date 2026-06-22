import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from './firebase.js'

const ref = doc(db, 'meta', 'config')

// 관리자가 지정한 '숨길 레포' 목록 (실시간 구독)
export function useHiddenRepos() {
  const [hidden, setHidden] = useState([])
  useEffect(
    () => onSnapshot(ref, (snap) => setHidden(snap.data()?.hidden || []), () => {}),
    []
  )
  return hidden
}

export async function saveHiddenRepos(hidden) {
  await setDoc(ref, { hidden, updatedAt: new Date().toISOString() }, { merge: true })
}
