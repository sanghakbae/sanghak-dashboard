import { useEffect, useMemo, useState } from 'react'

const GH_USER = 'sanghakbae'

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

export default function App() {
  const [user, setUser] = useState(null)
  const [repos, setRepos] = useState([])
  const [state, setState] = useState('loading') // loading | ready | error
  const [error, setError] = useState('')

  const [query, setQuery] = useState('')
  const [lang, setLang] = useState('전체')
  const [sort, setSort] = useState('updated') // updated | name | stars

  useEffect(() => {
    let alive = true
    async function load() {
      try {
        const [u, r] = await Promise.all([
          fetch(`https://api.github.com/users/${GH_USER}`),
          fetch(`https://api.github.com/users/${GH_USER}/repos?per_page=100&sort=updated`),
        ])
        if (!u.ok || !r.ok) throw new Error(`GitHub API ${u.status}/${r.status}`)
        const userData = await u.json()
        const repoData = await r.json()
        if (!alive) return
        setUser(userData)
        setRepos(repoData.filter((x) => !x.fork && !x.archived))
        setState('ready')
      } catch (e) {
        if (!alive) return
        setError(e.message || '데이터를 불러오지 못했습니다.')
        setState('error')
      }
    }
    load()
    return () => { alive = false }
  }, [])

  const languages = useMemo(() => {
    const set = new Set(repos.map((r) => r.language).filter(Boolean))
    return ['전체', ...Array.from(set).sort()]
  }, [repos])

  const filtered = useMemo(() => {
    let list = repos.filter((r) => {
      const q = query.trim().toLowerCase()
      const matchQ =
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.description || '').toLowerCase().includes(q) ||
        (r.topics || []).some((t) => t.toLowerCase().includes(q))
      const matchL = lang === '전체' || r.language === lang
      return matchQ && matchL
    })
    list = [...list].sort((a, b) => {
      if (sort === 'name') return a.name.localeCompare(b.name)
      if (sort === 'stars') return b.stargazers_count - a.stargazers_count
      return new Date(b.pushed_at) - new Date(a.pushed_at)
    })
    return list
  }, [repos, query, lang, sort])

  const liveCount = useMemo(
    () => repos.filter((r) => r.homepage && r.homepage.startsWith('http')).length,
    [repos]
  )

  return (
    <div className="page">
      <div className="bg-grid" aria-hidden />

      <header className="hero">
        {user && (
          <img className="avatar" src={user.avatar_url} alt={user.name || GH_USER} />
        )}
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

      {state === 'ready' && (
        <section className="stats">
          <div className="stat">
            <span className="stat-num">{repos.length}</span>
            <span className="stat-label">프로젝트</span>
          </div>
          <div className="stat">
            <span className="stat-num">{liveCount}</span>
            <span className="stat-label">라이브 서비스</span>
          </div>
          <div className="stat">
            <span className="stat-num">{languages.length - 1}</span>
            <span className="stat-label">사용 언어</span>
          </div>
          <div className="stat">
            <span className="stat-num">{user?.followers ?? 0}</span>
            <span className="stat-label">팔로워</span>
          </div>
        </section>
      )}

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

      <main className="content">
        {state === 'loading' && (
          <div className="grid">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="card skeleton" />
            ))}
          </div>
        )}

        {state === 'error' && (
          <div className="notice error">
            <p>데이터를 불러오지 못했습니다.</p>
            <p className="muted">{error}</p>
            <p className="muted">GitHub API 요청 한도(시간당 60회)에 걸렸을 수 있어요. 잠시 후 새로고침해 주세요.</p>
          </div>
        )}

        {state === 'ready' && (
          filtered.length > 0 ? (
            <div className="grid">
              {filtered.map((r) => <ProjectCard key={r.id} repo={r} />)}
            </div>
          ) : (
            <div className="notice">검색 결과가 없습니다.</div>
          )
        )}
      </main>

      <footer className="foot">
        <span>© {new Date().getFullYear()} sanghak.kr</span>
        <span className="muted">데이터: GitHub API · 실시간</span>
      </footer>
    </div>
  )
}
