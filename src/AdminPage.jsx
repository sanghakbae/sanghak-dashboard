import { useEffect, useMemo, useState } from 'react'
import { collection, getDocs, limit, orderBy, query } from 'firebase/firestore'
import { db } from './firebase.js'
import { useHiddenRepos, saveHiddenRepos } from './useConfig.js'

const GH_USER = 'sanghakbae'

function fmtTime(ts) {
  if (!ts) return '-'
  const d = ts.toDate ? ts.toDate() : new Date(ts)
  return d.toLocaleString('ko-KR', { hour12: false })
}

const ACTION_LABEL = { open: '바로가기', code: '코드', site: '사이트열기', visit: '방문' }

export default function AdminPage({ user, onLogout, onExit }) {
  const [repos, setRepos] = useState([])
  const [logs, setLogs] = useState([])
  const [loadingLogs, setLoadingLogs] = useState(true)
  const [saving, setSaving] = useState(false)
  const hidden = useHiddenRepos()
  const hiddenSet = useMemo(() => new Set(hidden), [hidden])

  // 전체 레포(숨김 포함) 로드 — 노출 토글용
  useEffect(() => {
    fetch(`https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=updated`)
      .then((r) => r.json())
      .then((d) => setRepos(d.filter((x) => !x.fork && !x.archived)))
      .catch(() => {})
  }, [])

  // 감사로그 로드
  useEffect(() => {
    ;(async () => {
      try {
        const snap = await getDocs(query(collection(db, 'audit'), orderBy('ts', 'desc'), limit(300)))
        setLogs(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
      } catch (e) {
        console.warn('로그 로드 실패:', e.message)
      } finally {
        setLoadingLogs(false)
      }
    })()
  }, [])

  async function toggle(name) {
    const next = hiddenSet.has(name) ? hidden.filter((n) => n !== name) : [...hidden, name]
    setSaving(true)
    try { await saveHiddenRepos(next) } finally { setSaving(false) }
  }

  return (
    <div className="page admin-page">
      <header className="admin-head">
        <div>
          <h1 className="admin-title">관리자</h1>
          <p className="admin-sub">{user?.email}</p>
        </div>
        <div className="admin-head-actions">
          <a className="btn-sm" href="#">← 대시보드</a>
          <button className="btn-sm" onClick={onLogout}>로그아웃</button>
        </div>
      </header>

      {/* 레포 노출 설정 */}
      <section className="admin-card">
        <h2 className="admin-h2">레포지토리 노출 설정 {saving && <span className="admin-muted">저장 중…</span>}</h2>
        <p className="admin-muted">끄면 공개 대시보드에서 숨겨집니다. (실시간 반영)</p>
        <div className="repo-list">
          {repos.map((r) => {
            const visible = !hiddenSet.has(r.name)
            return (
              <label key={r.id} className="repo-row">
                <span className="repo-name">{r.name}</span>
                <input type="checkbox" className="toggle" checked={visible} onChange={() => toggle(r.name)} />
                <span className={`toggle-state ${visible ? 'on' : 'off'}`}>{visible ? '노출' : '숨김'}</span>
              </label>
            )
          })}
          {!repos.length && <p className="admin-muted">레포를 불러오는 중…</p>}
        </div>
      </section>

      {/* 감사 로그 */}
      <section className="admin-card">
        <h2 className="admin-h2">감사 로그 <span className="admin-muted">최근 {logs.length}건</span></h2>
        <div className="log-scroll">
          <table className="log-table">
            <thead>
              <tr><th>시간</th><th>IP</th><th>위치</th><th>동작</th><th>대상</th><th>UA</th></tr>
            </thead>
            <tbody>
              {logs.map((l) => (
                <tr key={l.id}>
                  <td className="nowrap">{fmtTime(l.ts)}</td>
                  <td className="nowrap">{l.ip}</td>
                  <td className="nowrap">{[l.city, l.country].filter(Boolean).join(', ') || '-'}</td>
                  <td>{ACTION_LABEL[l.action] || l.action}</td>
                  <td>{l.target || '-'}</td>
                  <td className="ua">{l.ua}</td>
                </tr>
              ))}
              {!loadingLogs && !logs.length && (
                <tr><td colSpan={6} className="admin-muted">기록이 없습니다.</td></tr>
              )}
              {loadingLogs && (
                <tr><td colSpan={6} className="admin-muted">로그를 불러오는 중…</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
