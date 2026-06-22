import { useEffect, useState } from 'react'
import { onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { auth, googleProvider } from './firebase.js'

// Google OAuth 로그인 상태
export function useAuth() {
  const [user, setUser] = useState(null)
  const [ready, setReady] = useState(false)

  useEffect(() => onAuthStateChanged(auth, (u) => { setUser(u); setReady(true) }), [])

  const login = () =>
    signInWithPopup(auth, googleProvider).catch((e) => console.warn('로그인 실패:', e.message))
  const logout = () => signOut(auth).catch((e) => console.warn('로그아웃 실패:', e.message))

  return { user, ready, login, logout }
}
