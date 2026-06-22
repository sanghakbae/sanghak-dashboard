// 전용 Firebase 프로젝트(sanghak-dashboard) — 웹 config는 공개 가능 값
import { initializeApp } from 'firebase/app'
import { getAuth, GoogleAuthProvider } from 'firebase/auth'
import { getFirestore } from 'firebase/firestore'
import { getAnalytics, isSupported } from 'firebase/analytics'

export const firebaseConfig = {
  apiKey: 'AIzaSyB0qK1zUamJYGQFRibcN5onZOZjpUgIA1c',
  authDomain: 'sanghak-dashboard.firebaseapp.com',
  projectId: 'sanghak-dashboard',
  storageBucket: 'sanghak-dashboard.firebasestorage.app',
  messagingSenderId: '805093095402',
  appId: '1:805093095402:web:dc06a67b689c2d867b6493',
  measurementId: 'G-3TBMJ0EZWX',
}

export const app = initializeApp(firebaseConfig)
export const auth = getAuth(app)
export const db = getFirestore(app)
export const googleProvider = new GoogleAuthProvider()

// GA4 — 지원 환경에서만
export let analytics = null
if (typeof window !== 'undefined') {
  isSupported().then((ok) => { if (ok) analytics = getAnalytics(app) }).catch(() => {})
}

// 관리자 이메일 (감사로그·노출설정 접근 권한). 필요시 수정.
export const ADMIN_EMAILS = ['totoriverce@gmail.com', 'qa@muhayu.com']
export const isAdmin = (user) => !!user && ADMIN_EMAILS.includes(user.email)
