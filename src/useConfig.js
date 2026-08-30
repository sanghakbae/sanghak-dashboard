import { useEffect, useState } from 'react'
import { doc, onSnapshot, setDoc } from 'firebase/firestore'
import { db } from './firebase.js'

const ref = doc(db, 'meta', 'config')
export const DEFAULT_HIDDEN_REPOS = ['sanghak-dashboard', 'muhayu', 'zeterbae']

// 관리자가 지정한 '숨길 레포' 목록 (실시간 구독)
export function useHiddenRepos() {
  const [hidden, setHidden] = useState(DEFAULT_HIDDEN_REPOS)
  useEffect(
    () => onSnapshot(
      ref,
      (snap) => setHidden(snap.exists() ? (snap.data()?.hidden || []) : DEFAULT_HIDDEN_REPOS),
      (error) => console.warn('노출 설정 로드 실패:', error.message)
    ),
    []
  )
  return hidden
}

export async function saveHiddenRepos(hidden) {
  await setDoc(ref, { hidden, updatedAt: new Date().toISOString() }, { merge: true })
}
