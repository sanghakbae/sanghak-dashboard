import { useEffect, useRef, useState } from 'react'

const isStandalone = () =>
  window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone === true

export default function PWAStatus() {
  const [installEvent, setInstallEvent] = useState(null)
  const [showIosGuide, setShowIosGuide] = useState(false)
  const [updateWorker, setUpdateWorker] = useState(null)
  const [installing, setInstalling] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const reloadForUpdate = useRef(false)

  useEffect(() => {
    const onInstallPrompt = (event) => {
      event.preventDefault()
      setInstallEvent(event)
      setDismissed(false)
    }
    const onInstalled = () => setInstallEvent(null)
    window.addEventListener('beforeinstallprompt', onInstallPrompt)
    window.addEventListener('appinstalled', onInstalled)

    const isiOS = /iphone|ipad|ipod/i.test(navigator.userAgent)
    setShowIosGuide(isiOS && !isStandalone())

    // 개발 서버에는 서비스 워커를 등록하지 않아 기존 개발 흐름과 캐시를 방해하지 않는다.
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      let refreshing = false
      let registration = null
      let updateTimer = null
      const onControllerChange = () => {
        // 최초 설치 때 clients.claim()이 발생해도 페이지를 갑자기 새로고침하지 않는다.
        if (!reloadForUpdate.current || refreshing) return
        refreshing = true
        window.location.reload()
      }
      const checkForUpdate = () => registration?.update().catch(() => {})
      const onVisibilityChange = () => {
        if (document.visibilityState === 'visible') checkForUpdate()
      }
      navigator.serviceWorker.addEventListener('controllerchange', onControllerChange)
      document.addEventListener('visibilitychange', onVisibilityChange)

      navigator.serviceWorker.register('/sw.js', { updateViaCache: 'none' }).then((nextRegistration) => {
        registration = nextRegistration
        const watchWorker = (worker) => {
          if (!worker) return
          const detectInstalledUpdate = () => {
            if (worker.state === 'installed' && navigator.serviceWorker.controller) setUpdateWorker(worker)
          }
          detectInstalledUpdate()
          worker.addEventListener('statechange', detectInstalledUpdate)
        }
        if (registration.waiting && navigator.serviceWorker.controller) setUpdateWorker(registration.waiting)
        watchWorker(registration.installing)
        registration.addEventListener('updatefound', () => watchWorker(registration.installing))
        checkForUpdate()
        updateTimer = window.setInterval(checkForUpdate, 60 * 60 * 1000)
      }).catch(() => { /* PWA 지원 실패가 기존 페이지에 영향을 주지 않도록 무시 */ })

      return () => {
        window.removeEventListener('beforeinstallprompt', onInstallPrompt)
        window.removeEventListener('appinstalled', onInstalled)
        navigator.serviceWorker.removeEventListener('controllerchange', onControllerChange)
        document.removeEventListener('visibilitychange', onVisibilityChange)
        if (updateTimer) window.clearInterval(updateTimer)
      }
    }

    return () => {
      window.removeEventListener('beforeinstallprompt', onInstallPrompt)
      window.removeEventListener('appinstalled', onInstalled)
    }
  }, [])

  async function install() {
    if (!installEvent) return
    setInstalling(true)
    try {
      await installEvent.prompt()
      await installEvent.userChoice
      setInstallEvent(null)
    } catch {
      // 설치 UI 실패가 대시보드 사용에 영향을 주지 않도록 안내만 닫는다.
      setInstallEvent(null)
    } finally {
      setInstalling(false)
    }
  }

  function applyUpdate() {
    if (!updateWorker) return
    reloadForUpdate.current = true
    updateWorker.postMessage({ type: 'SKIP_WAITING' })
  }

  if (updateWorker) {
    return (
      <aside className="pwa-toast" role="status" aria-live="polite">
        <img src="/icons/icon-192.png" alt="" />
        <div className="pwa-toast-copy">
          <strong>새 업데이트가 있어요</strong>
          <span>지금 적용하면 최신 버전으로 다시 열립니다.</span>
        </div>
        <button className="pwa-action" onClick={applyUpdate}>업데이트</button>
        <button className="pwa-close" onClick={() => setUpdateWorker(null)} aria-label="업데이트 알림 닫기">×</button>
      </aside>
    )
  }

  if (dismissed || isStandalone() || (!installEvent && !showIosGuide)) return null

  return (
    <aside className="pwa-toast" role="status" aria-live="polite">
      <img src="/icons/icon-192.png" alt="" />
      <div className="pwa-toast-copy">
        <strong>홈 화면에 설치하세요</strong>
        <span>{showIosGuide ? 'Safari의 공유 버튼을 누른 뒤 ‘홈 화면에 추가’를 선택하세요.' : '앱처럼 빠르고 편하게 실행할 수 있어요.'}</span>
      </div>
      {installEvent && <button className="pwa-action" onClick={install} disabled={installing}>{installing ? '설치 중…' : '설치'}</button>}
      <button className="pwa-close" onClick={() => setDismissed(true)} aria-label="설치 안내 닫기">×</button>
    </aside>
  )
}
