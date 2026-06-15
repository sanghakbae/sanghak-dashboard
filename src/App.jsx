import { useEffect, useMemo, useState } from 'react'

const GH_USER = 'sanghakbae'
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec']
// 목록에서 숨길 리포
const EXCLUDE = new Set(['sanghak-dashboard', 'muhayu'])

// GitHub 공식 언어 색상 (자주 쓰는 것만)
const LANG_COLORS = {
  JavaScript: '#f1e05a',
  TypeScript: '#3178c6',
  HTML: '#e34c26',
  CSS: '#563d7c',
  Python: '#3572A5',
  Shell: '#89e051',
  Go: '#00ADD8',
  Java: '#b07219',
  'C++': '#f34b7d',
  C: '#555555',
  Rust: '#dea584',
  Vue: '#41b883',
  Ruby: '#701516',
}

// 사람이 읽는 상대 시간
function timeAgo(iso) {
  const then = new Date(iso).getTime()
  const diff = Date.now() - then
  const day = 86400000
  if (diff < 3600000) return `${Math.max(1, Math.round(diff / 60000))}분 전`
  if (diff < day) return `${Math.round(diff / 3600000)}시간 전`
  if (diff < 30 * day) return `${Math.round(diff / day)}일 전`
  if (diff < 365 * day) return `${Math.round(diff / (30 * day))}개월 전`
  return `${Math.round(diff / (365 * day))}년 전`
}

/* ───────────────────────── hooks ───────────────────────── */

// 디바이스 분기: 모바일/PC 전용 레이아웃 선택
function useIsMobile(breakpoint = 768) {
  const query = `(max-width: ${breakpoint}px)`
  const [isMobile, setIsMobile] = useState(() =>
    typeof window !== 'undefined' ? window.matchMedia(query).matches : false
  )
  useEffect(() => {
    const mq = window.matchMedia(query)
    const handler = () => setIsMobile(mq.matches)
    handler() // 마운트 시 동기화
    mq.addEventListener('change', handler)
    window.addEventListener('resize', handler) // 일부 환경의 폴백
    return () => {
      mq.removeEventListener('change', handler)
      window.removeEventListener('resize', handler)
    }
  }, [query])
  return isMobile
}

// GitHub 프로필·리포·잔디 데이터 로더
function useGitHub() {
  const [data, setData] = useState({ user: null, repos: [], contrib: null })
  const [state, setState] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')

  useEffect(() => {
    let alive = true
    // background=true면 스켈레톤/에러로 전환하지 않고 조용히 갱신
    async function load(background = false) {
      try {
        const [u, r] = await Promise.all([
          fetch(`https://api.github.com/users/${GH_USER}`),
          fetch(`https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=updated`),
        ])
        if (!u.ok || !r.ok) throw new Error(`GitHub API ${u.status}/${r.status}`)
        const user = await u.json()
        const repos = (await r.json()).filter(
          (x) => !x.fork && !x.archived && !EXCLUDE.has(x.name)
        )

        // 잔디는 별도 서비스 — 실패해도 나머지는 표시
        let contrib = null
        try {
          const cr = await fetch(`https://github-contributions-api.jogruber.de/v4/${GH_USER}?y=last`)
          if (cr.ok) contrib = await cr.json()
        } catch { /* noop */ }

        if (!alive) return
        setData({ user, repos, contrib })
        setState('ready')
      } catch (e) {
        if (!alive || background) return // 백그라운드 실패는 기존 데이터 유지
        setError(e.message || '데이터를 불러오지 못했습니다.')
        setState('error')
      }
    }
    load()
    // 12시간마다 자동 새로고침 (페이지를 열어둔 채로도 최신 반영)
    const HALF_DAY = 12 * 60 * 60 * 1000
    const timer = setInterval(() => load(true), HALF_DAY)
    return () => { alive = false; clearInterval(timer) }
  }, [])

  return { ...data, state, error }
}

/* ───────────────────────── 잔디 그래프 ───────────────────────── */

// 일별 배열 → 주(week) 컬럼 단위로 변환 (일~토)
function buildWeeks(days) {
  if (!days?.length) return []
  const weeks = []
  let week = new Array(7).fill(null)
  let dow = new Date(days[0].date).getDay()
  for (const d of days) {
    week[dow] = d
    if (dow === 6) { weeks.push(week); week = new Array(7).fill(null) }
    dow = (dow + 1) % 7
  }
  if (week.some(Boolean)) weeks.push(week)
  return weeks
}

// 월 레이블: 연속된 주를 같은 달끼리 묶어 폭 계산
function monthSpans(weeks) {
  const spans = []
  let cur = null
  weeks.forEach((w) => {
    const first = w.find(Boolean)
    const m = first ? new Date(first.date).getMonth() : (cur ? cur.month : 0)
    if (!cur || cur.month !== m) {
      cur = { month: m, count: 1 }
      spans.push(cur)
    } else {
      cur.count += 1
    }
  })
  return spans
}

function ContributionGraph({ contrib, compact = false }) {
  const days = contrib?.contributions || []
  const total = contrib?.total?.lastYear ?? 0
  const weeks = useMemo(() => buildWeeks(days), [days])
  const spans = useMemo(() => monthSpans(weeks), [weeks])

  if (!days.length) return null

  return (
    <section className="panel contrib">
      <h2 className="panel-title">
        <span className="contrib-total">{total}</span> contributions in the last year
      </h2>

      <div className="contrib-inner">
        {/* 월 레이블 — 주 개수 비율로 가변폭 */}
        <div className={`contrib-months${compact ? '' : ' has-days'}`}>
          {spans.map((s, i) => (
            <span key={i} className="contrib-month" style={{ flex: s.count }}>
              {s.count > 1 ? MONTHS[s.month] : ''}
            </span>
          ))}
        </div>

        <div className="contrib-body">
          {/* 요일 레이블 (PC만) */}
          {!compact && (
            <div className="contrib-days">
              {['', 'Mon', '', 'Wed', '', 'Fri', ''].map((d, i) => (
                <span key={i}>{d}</span>
              ))}
            </div>
          )}
          {/* 셀 — 주 컬럼이 100% 폭을 나눠 가짐 */}
          <div className="contrib-grid">
            {weeks.map((w, wi) => (
              <div key={wi} className="contrib-week">
                {w.map((d, di) => (
                  <span
                    key={di}
                    className={`contrib-cell lvl-${d ? d.level : 0}`}
                    title={d ? `${d.date}: ${d.count} contributions` : ''}
                  />
                ))}
              </div>
            ))}
          </div>
        </div>

        {/* 범례 */}
        <div className="contrib-legend">
          <span>Less</span>
          {[0, 1, 2, 3, 4].map((l) => <span key={l} className={`contrib-cell lvl-${l} legend-cell`} />)}
          <span>More</span>
        </div>
      </div>
    </section>
  )
}

/* ───────────────────────── 공용 조각 ───────────────────────── */

function LangDot({ lang }) {
  if (!lang) return null
  return (
    <span className="lang">
      <span className="lang-dot" style={{ background: LANG_COLORS[lang] || '#8b949e' }} />
      {lang}
    </span>
  )
}

function ProjectCard({ repo }) {
  const live = repo.homepage && repo.homepage.startsWith('http') ? repo.homepage : null
  return (
    <article className="card">
      <div className="card-top">
        <h3 className="card-title">
          <a href={repo.html_url} target="_blank" rel="noreferrer">{repo.name}</a>
        </h3>
        {live && <span className="badge-live">LIVE</span>}
      </div>

      <p className="card-desc">{repo.description || '설명이 없습니다.'}</p>

      {repo.topics?.length > 0 && (
        <div className="topics">
          {repo.topics.slice(0, 4).map((t) => (
            <span key={t} className="topic">#{t}</span>
          ))}
        </div>
      )}

      <div className="card-meta">
        <LangDot lang={repo.language} />
        {repo.stargazers_count > 0 && <span className="meta-item">★ {repo.stargazers_count}</span>}
        <span className="meta-item muted">{timeAgo(repo.pushed_at)} 업데이트</span>
      </div>

      <div className="card-actions">
        {live && (
          <a className="btn btn-primary" href={live} target="_blank" rel="noreferrer">
            바로가기 ↗
          </a>
        )}
        <a className="btn btn-ghost" href={repo.html_url} target="_blank" rel="noreferrer">
          코드
        </a>
      </div>
    </article>
  )
}

function Stats({ stats }) {
  return (
    <section className="stats">
      {stats.map((s) => (
        <div key={s.label} className="stat">
          <span className="stat-num">{s.num}</span>
          <span className="stat-label">{s.label}</span>
        </div>
      ))}
    </section>
  )
}

function Toolbar({ query, setQuery, lang, setLang, sort, setSort, languages }) {
  return (
    <section className="toolbar">
      <input
        className="search"
        type="search"
        placeholder="프로젝트 검색 (이름·설명·태그)"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <div className="filters">
        <select value={lang} onChange={(e) => setLang(e.target.value)}>
          {languages.map((l) => (
            <option key={l} value={l}>{l === '전체' ? '모든 언어' : l}</option>
          ))}
        </select>
        <select value={sort} onChange={(e) => setSort(e.target.value)}>
          <option value="updated">최근 업데이트순</option>
          <option value="name">이름순</option>
          <option value="stars">스타순</option>
        </select>
      </div>
    </section>
  )
}

function Grid({ repos }) {
  if (!repos.length) return <div className="notice">검색 결과가 없습니다.</div>
  return (
    <div className="grid">
      {repos.map((r) => <ProjectCard key={r.id} repo={r} />)}
    </div>
  )
}

/* ───────────────────────── 레이아웃: PC / 모바일 ───────────────────────── */

function DesktopDashboard(props) {
  const { user, contrib, stats, filtered, toolbar } = props
  return (
    <div className="page page-desktop">
      <header className="hero">
        {user && <img className="avatar" src={user.avatar_url} alt={user.name || GH_USER} />}
        <div className="hero-body">
          <h1 className="hero-name">{user?.name || 'Zeter Bae'}</h1>
          <p className="hero-bio">
            {user?.bio?.replace(/\s+/g, ' ').trim() ||
              'Security Researcher · Web · System · Cloud Security'}
          </p>
          <div className="hero-tags">
            {user?.location && <span className="hero-tag">📍 {user.location}</span>}
            <a className="hero-tag link" href={`https://github.com/${GH_USER}`} target="_blank" rel="noreferrer">
              @{GH_USER}
            </a>
          </div>
        </div>
      </header>

      <Stats stats={stats} />
      <ContributionGraph contrib={contrib} />
      <Toolbar {...toolbar} />
      <Grid repos={filtered} />
    </div>
  )
}

function MobileDashboard(props) {
  const { user, contrib, stats, filtered, toolbar } = props
  return (
    <div className="page page-mobile">
      <header className="hero hero-m">
        {user && <img className="avatar" src={user.avatar_url} alt={user.name || GH_USER} />}
        <h1 className="hero-name">{user?.name || 'Zeter Bae'}</h1>
        <p className="hero-bio">
          {user?.bio?.replace(/\s+/g, ' ').trim() ||
            'Security Researcher · Web · System · Cloud Security'}
        </p>
        <div className="hero-tags">
          {user?.location && <span className="hero-tag">📍 {user.location}</span>}
          <a className="hero-tag link" href={`https://github.com/${GH_USER}`} target="_blank" rel="noreferrer">
            @{GH_USER}
          </a>
        </div>
      </header>

      <Stats stats={stats} />
      <ContributionGraph contrib={contrib} compact />
      <Toolbar {...toolbar} />
      <Grid repos={filtered} />
    </div>
  )
}

/* ───────────────────────── App ───────────────────────── */

export default function App() {
  const { user, repos, contrib, state, error } = useGitHub()
  const isMobile = useIsMobile()

  const [query, setQuery] = useState('')
  const [lang, setLang] = useState('전체')
  const [sort, setSort] = useState('updated')

  const languages = useMemo(() => {
    const set = new Set(repos.map((r) => r.language).filter(Boolean))
    return ['전체', ...Array.from(set).sort()]
  }, [repos])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    let list = repos.filter((r) => {
      const matchQ =
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.topics || []).some((t) => t.toLowerCase().includes(q))
      return matchQ && (lang === '전체' || r.language === lang)
    })
    return [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'stars') return b.stargazers_count - a.stargazers_count
      return new Date(b.pushed_at) - new Date(a.pushed_at)
    })
  }, [repos, query, lang, sort])

  const liveCount = useMemo(
    () => repos.filter((r) => r.homepage && r.homepage.startsWith('http')).length,
    [repos]
  )

  const stats = [
    { num: repos.length, label: '프로젝트' },
    { num: liveCount, label: '라이브 서비스' },
    { num: Math.max(0, languages.length - 1), label: '사용 언어' },
    { num: user?.followers ?? 0, label: '팔로워' },
  ]

  const toolbar = { query, setQuery, lang, setLang, sort, setSort, languages }

  if (state === 'loading') {
    return (
      <div className="page">
        <div className="bg-grid" aria-hidden />
        <div className="grid" style={{ marginTop: 24 }}>
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="card skeleton" />)}
        </div>
      </div>
    )
  }

  if (state === 'error') {
    return (
      <div className="page">
        <div className="bg-grid" aria-hidden />
        <div className="notice error" style={{ marginTop: 40 }}>
          <p>데이터를 불러오지 못했습니다.</p>
          <p className="muted">{error}</p>
          <p className="muted">GitHub API 요청 한도(시간당 60회)에 걸렸을 수 있어요. 잠시 후 새로고침해 주세요.</p>
        </div>
      </div>
    )
  }

  const shared = { user, contrib, stats, filtered, toolbar }

  return (
    <>
      <div className="bg-grid" aria-hidden />
      {isMobile ? <MobileDashboard {...shared} /> : <DesktopDashboard {...shared} />}
      <footer className="foot">
        <span>© {new Date().getFullYear()} sanghak.kr</span>
        <span className="muted">{isMobile ? '모바일' : 'PC'} · 데이터: GitHub API</span>
      </footer>
    </>
  )
}
