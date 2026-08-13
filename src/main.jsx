import { useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import './styles.css'

const styles = [
  { id: 'photo-abstract-editorial', name: '抽象摄影社论', english: 'Photo Abstract Editorial', description: '把现实照片拆成形状、留白和纸面节奏。', tags: ['图片转绘', '抽象'], input: 'image', version: '0.1', cover: '/skill-assets/photo-abstract-editorial/case-1.jpg', samples: ['/skill-assets/photo-abstract-editorial/case-1.jpg', '/skill-assets/photo-abstract-editorial/case-3.jpg'] },
  { id: 'gc-minimal-zine-poster-v0-1', name: '极简 Zine 海报', english: 'GC Minimal Zine Poster', description: '用克制的版式，把一个想法压成一张海报。', tags: ['文字生图', '海报'], input: 'text', version: '0.1', cover: null, palette: 'poster' },
  { id: 'scene-distillation-zine-v1-3', name: '场景蒸馏 Zine', english: 'Scene Distillation Zine', description: '保留动作和情绪，把复杂画面压缩成视觉片段。', tags: ['图片转绘', '场景'], input: 'mixed', version: '1.3', cover: null, palette: 'scene' },
  { id: 'scenes-gathered-zine-v1-3', name: '聚景 Zine', english: 'Scenes Gathered Zine', description: '先确认主体、空间和情绪，再生成聚合式画面。', tags: ['引导式', '多轮提问'], input: 'guided', version: '1.3', cover: null, palette: 'gathered' },
]

const seedResults = [
  { id: 'result-1', title: '海边的红色房间', style: '抽象摄影社论', date: '今天 16:42', image: '/skill-assets/photo-abstract-editorial/case-3.jpg' },
  { id: 'result-2', title: '旧书店的下午', style: '抽象摄影社论', date: '昨天 11:18', image: '/skill-assets/photo-abstract-editorial/case-5.png' },
]

function App() {
  const [view, setView] = useState('styles')
  const [selectedStyle, setSelectedStyle] = useState(null)
  const [query, setQuery] = useState('')
  const [filter, setFilter] = useState('全部')
  const [favorites, setFavorites] = useState(new Set(['photo-abstract-editorial']))
  const [tasks, setTasks] = useState([])
  const [results, setResults] = useState(seedResults)
  const visibleStyles = useMemo(() => styles.filter((style) => {
    const haystack = `${style.name} ${style.english} ${style.tags.join(' ')}`.toLowerCase()
    return (!query || haystack.includes(query.trim().toLowerCase())) && (filter === '全部' || style.tags.includes(filter))
  }), [filter, query])

  function toggleFavorite(id) {
    setFavorites((current) => { const next = new Set(current); next.has(id) ? next.delete(id) : next.add(id); return next })
  }

  function startTask(style, payload) {
    const id = `task-${Date.now()}`
    setTasks((current) => [{ id, name: style.name, state: style.input === 'guided' ? 'waiting_input' : 'running', progress: style.input === 'guided' ? 18 : 24, message: style.input === 'guided' ? '需要你确认画面方向' : '正在读取风格指令' }, ...current])
    setSelectedStyle(null)
    if (style.input === 'guided') return
    window.setTimeout(() => setTasks((current) => current.map((task) => task.id === id ? { ...task, progress: 61, message: '正在整理画面结构' } : task)), 900)
    window.setTimeout(() => {
      setTasks((current) => current.map((task) => task.id === id ? { ...task, progress: 100, state: 'completed', message: '已完成并保存到结果图库' } : task))
      const image = style.samples?.[1] || style.samples?.[0]
      if (image) setResults((current) => [{ id: `result-${Date.now()}`, title: payload.text || '新的风格结果', style: style.name, date: '刚刚', image }, ...current])
    }, 2300)
  }

  function answerTask(id) {
    setTasks((current) => current.map((task) => task.id === id ? { ...task, state: 'running', progress: 49, message: '已收到回答，继续生成' } : task))
    window.setTimeout(() => setTasks((current) => current.map((task) => task.id === id ? { ...task, progress: 100, state: 'completed', message: '已完成并保存到结果图库' } : task)), 1700)
  }

  return <div className="desktop-app">
    <Header onAdd={() => window.alert('Skill Workshop 将在 Phase 5 开放')} />
    <div className="app-body">
      <Sidebar view={view} setView={(next) => { setView(next); setSelectedStyle(null) }} favorites={favorites.size} />
      <main className="workbench">
        {selectedStyle ? <CreationStudio style={selectedStyle} onBack={() => setSelectedStyle(null)} onSubmit={startTask} /> : view === 'styles' ? <StyleWorkspace styles={visibleStyles} query={query} setQuery={setQuery} filter={filter} setFilter={setFilter} favorites={favorites} onFavorite={toggleFavorite} onOpen={setSelectedStyle} /> : <ResultWorkspace results={results} />}
      </main>
      <AsideRail tasks={tasks} results={results} onAnswer={answerTask} onViewResults={() => { setView('results'); setSelectedStyle(null) }} onAdd={() => window.alert('从 GitHub 或本地目录导入 Skill')} />
    </div>
  </div>
}

function Header({ onAdd }) {
  return <header className="app-header"><div className="brand-lockup"><span className="brand-mark">S</span><div><strong>STYLE SHELF</strong><small>个人风格工作台</small></div></div><div className="runtime-state"><span className="status-mark" /> 本地工作台在线 <span className="runtime-divider" /> Codex Runner 未连接</div><div className="header-actions"><button className="header-button" onClick={onAdd}>+ 添加 Skill</button><button className="profile-button">LC</button></div></header>
}

function Sidebar({ view, setView, favorites }) {
  return <aside className="sidebar"><div className="sidebar-section"><p className="sidebar-label">工作区</p><button className={view === 'styles' ? 'side-link active' : 'side-link'} onClick={() => setView('styles')}><span>01</span> 风格卡片仓库</button><button className={view === 'results' ? 'side-link active' : 'side-link'} onClick={() => setView('results')}><span>02</span> 结果图库 <b>2</b></button></div><div className="sidebar-section secondary"><p className="sidebar-label">筛选</p><button className="side-link"><span>03</span> 最近使用</button><button className="side-link"><span>04</span> 我的收藏 <b>{favorites}</b></button></div><div className="sidebar-footer"><div className="folder-row"><span className="folder-icon">/</span><div><strong>Style Shelf</strong><small>本地资料库</small></div></div><button className="settings-link">设置与诊断</button></div></aside>
}

function StyleWorkspace({ styles: visibleStyles, query, setQuery, filter, setFilter, favorites, onFavorite, onOpen }) {
  return <section className="workspace-page page-enter"><div className="workspace-title"><div><p className="section-kicker">STYLE GALLERY</p><h1>风格卡片仓库</h1><p>选择一个风格，进入它自己的创作工作区。</p></div><div className="workspace-stats"><strong>{visibleStyles.length}</strong><span>个可用风格</span></div></div><div className="workspace-toolbar"><div className="filter-tabs">{['全部', '图片转绘', '文字生图', '引导式'].map((item) => <button className={filter === item ? 'filter-tab active' : 'filter-tab'} onClick={() => setFilter(item)} key={item}>{item}</button>)}</div><label className="workspace-search"><span>⌕</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="搜索风格、类型或名称" aria-label="搜索风格" /></label></div><div className="desktop-style-grid">{visibleStyles.map((style, index) => <DesktopStyleCard key={style.id} style={style} index={index} favorite={favorites.has(style.id)} onFavorite={onFavorite} onOpen={onOpen} />)}</div></section>
}

function DesktopStyleCard({ style, index, favorite, onFavorite, onOpen }) {
  const visual = style.cover ? <img src={style.cover} alt={`${style.name} 示例`} /> : <div className={`card-art ${style.palette}`}><span>示例素材待补</span><strong>{style.name}</strong><i>{style.english}</i></div>
  return <article className={`desktop-style-card theme-${style.palette || 'photo'}`}><div className="style-card-top"><span className="style-card-type">STYLE 0{index + 1}</span><span>{style.input === 'guided' ? '引导式工作流' : style.input === 'text' ? '文字生图' : style.input === 'mixed' ? '图片与文字' : '图片转绘'}</span><button className={favorite ? 'card-save saved' : 'card-save'} onClick={() => onFavorite(style.id)}>{favorite ? '已收藏' : '收藏'}</button></div><button className="desktop-card-image" onClick={() => onOpen(style)} aria-label={`打开 ${style.name}`}>{visual}<span className="card-open">打开工作区 ↗</span></button><div className="desktop-card-info"><div><h2>{style.name}</h2><p className="card-english">{style.english}</p><p>{style.description}</p></div></div><div className="desktop-card-meta"><span>{style.tags.join(' · ')}</span><span>v{style.version}</span></div></article>
}

function CreationStudio({ style, onBack, onSubmit }) {
  const [text, setText] = useState('')
  const [fileName, setFileName] = useState('')
  const [referenceCount, setReferenceCount] = useState('1')
  return <section className="studio-workspace page-enter"><div className="studio-topline"><button className="back-button" onClick={onBack}>← 风格卡片仓库</button><span>CREATION STUDIO / {style.name}</span></div><div className="studio-title"><div><p className="section-kicker">CREATION STUDIO</p><h1>{style.name}</h1><p>{style.description}</p></div><span className="style-version">本地 Skill · v{style.version}</span></div><div className="studio-columns"><form className="studio-form" onSubmit={(event) => { event.preventDefault(); onSubmit(style, { text, fileName, referenceCount }) }}><div className="form-heading"><strong>这次想做什么</strong><span>{style.input === 'guided' ? '开始后会继续提问' : '输入会按 Skill 的方式处理'}</span></div>{['image', 'mixed', 'guided'].includes(style.input) && <label className="drop-zone"><input type="file" accept="image/*" onChange={(event) => setFileName(event.target.files?.[0]?.name || '')} /><span className="drop-symbol">+</span><strong>{fileName || '拖入原图，或点击选择'}</strong><small>图片会复制到当前任务目录</small></label>}{['text', 'mixed', 'guided'].includes(style.input) && <label className="studio-field"><span>描述 / 要求</span><textarea value={text} onChange={(event) => setText(event.target.value)} placeholder="写下你想看到的主体、空间或感觉" /></label>}{style.input === 'mixed' && <label className="studio-field"><span>参考图</span><select value={referenceCount} onChange={(event) => setReferenceCount(event.target.value)}><option value="1">1 张主体图</option><option value="2">2 张参考图</option><option value="3">3 张参考图</option></select></label>}<button className="run-button" type="submit"><span>运行这个 Skill</span><b>⌘ ↵</b></button><p className="simulation-note">Phase 1 模拟执行 · 下一阶段连接本地 Job 与 Codex</p></form><div className="studio-preview"><div className="preview-header"><span>风格预览</span><span>输入会在这里形成结果</span></div><div className="preview-canvas">{style.cover ? <img src={style.cover} alt="风格预览" /> : <div className={`preview-art ${style.palette}`}><strong>{style.name}</strong><span>STYLE PREVIEW</span></div>}</div><div className="preview-footer"><span>输出：图片</span><span>本地保存</span></div></div></div></section>
}

function ResultWorkspace({ results }) {
  return <section className="workspace-page page-enter"><div className="workspace-title"><div><p className="section-kicker">RESULT GALLERY</p><h1>结果图库</h1><p>每次生成都会留下输入、风格和结果的本地记录。</p></div><div className="workspace-stats"><strong>{results.length}</strong><span>个本地结果</span></div></div><div className="result-workspace-grid">{results.map((result) => <article className="desktop-result-card" key={result.id}><div className="result-thumb"><img src={result.image} alt={result.title} /></div><div className="result-info"><div><h2>{result.title}</h2><p>{result.style}</p></div><span>{result.date}</span></div></article>)}</div></section>
}

function AsideRail({ tasks, results, onAnswer, onViewResults, onAdd }) {
  const currentTask = tasks[0]
  return <aside className="aside-rail"><section className="rail-section task-section"><div className="rail-heading"><div><p className="section-kicker">JOB PROGRESS</p><h2>任务进度</h2></div><span>{tasks.length ? `${tasks.length} 个任务` : '空闲'}</span></div>{currentTask ? <div className="rail-task"><div className="rail-task-title"><strong>{currentTask.name}</strong><span>{currentTask.state === 'waiting_input' ? '需要回答' : currentTask.state === 'completed' ? '已完成' : `${currentTask.progress}%`}</span></div><div className="rail-progress"><span style={{ width: `${currentTask.progress}%` }} /></div><p>{currentTask.message}</p>{currentTask.state === 'waiting_input' && <button className="rail-action" onClick={() => onAnswer(currentTask.id)}>回答问题 ↗</button>}{currentTask.state === 'completed' && <button className="rail-action" onClick={onViewResults}>打开结果图库 ↗</button>}</div> : <div className="rail-empty"><strong>还没有后台任务</strong><p>提交一个风格任务后，进度会一直显示在这里。</p></div>}</section><section className="rail-section"><div className="rail-heading"><div><p className="section-kicker">RESULT GALLERY</p><h2>最近结果</h2></div><button onClick={onViewResults}>查看全部</button></div><div className="mini-results">{results.slice(0, 2).map((result) => <button className="mini-result" key={result.id} onClick={onViewResults}><img src={result.image} alt={result.title} /><span><strong>{result.title}</strong><small>{result.style}</small></span></button>)}</div></section><section className="rail-section workshop-section"><div className="rail-heading"><div><p className="section-kicker">SKILL WORKSHOP</p><h2>Skill 管理入口</h2></div></div><p>添加、更新和检查风格能力。完成后只刷新卡片状态。</p><button className="workshop-button" onClick={onAdd}>打开 Skill Workshop <span>↗</span></button></section></aside>
}

createRoot(document.getElementById('root')).render(<App />)
