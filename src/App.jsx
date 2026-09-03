import { useEffect, useMemo, useState } from 'react'
import { SignInButton, SignUpButton, UserButton, useAuth, useUser } from '@clerk/react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL || 'https://fpl-risk-backend.onrender.com'
const KEY_ITEMS = [['Ownership', 'The percentage of managers in your rank tier who own this player.'], ['Captaincy', 'The percentage of managers in your rank tier who have this player as captain.'], ['Triple Captaincy', 'The percentage of managers in your rank tier using Triple Captain on this player.'], ['Your EO', 'Your effective ownership: how much this player counts toward your points based on whether you own, captain, or Triple Captain him.'], ['Tier EO', 'The average effective ownership of this player across managers in your rank tier.'], ['EO Difference', 'The difference between your effective ownership and the average effective ownership in your rank tier.'], ['Exposure percentile', 'Where your effective ownership ranks compared with other managers in your rank tier, from lowest to highest. Example: the 90th percentile means your exposure is higher than most managers around your rank.'], ['Relative expected swing', 'The estimated points you gain or lose compared with the average exposure of managers in your rank tier. Example: if you do not own a heavily exposed player and expect him to score 23 points, a negative swing means you are estimated to lose relative ground if he reaches that score.']]
function formatPercent(value, digits = 0) { const n = Number(value); return Number.isFinite(n) ? `${n.toFixed(digits)}%` : '—' }
function formatEO(value) { const n = Number(value) * 100; return Number.isFinite(n) ? `${n.toFixed(0)}%` : '—' }
function formatNumber(value) { const n = Number(value); return Number.isFinite(n) ? n.toLocaleString() : '—' }
const POSITION_NAMES = { 1: 'GK', 2: 'DEF', 3: 'MID', 4: 'FWD' }
async function apiRequest(path, token, options = {}) { if (!token) throw new Error('Your sign-in session is not ready. Please try again.'); const response = await fetch(`${API_URL}${path}`, { ...options, credentials: 'include', headers: { ...(options.body ? { 'Content-Type': 'application/json' } : {}), Authorization: `Bearer ${token}`, ...(options.headers || {}) } }); const contentType = response.headers.get('content-type') || ''; const data = contentType.includes('application/json') ? await response.json() : { error: await response.text() }; if (!response.ok) { const error = new Error(data.error || `Request failed (${response.status})`); error.status = response.status; error.code = data.code; error.data = data; throw error } return data }
function ExposureBar({ value, label }) { const width = Math.max(0, Math.min(100, Number(value) * 100)); return <div className="exposure-row"><div className="exposure-label"><span>{label}</span><strong>{formatEO(value)}</strong></div><div className="bar-track"><div className="bar-fill" style={{ width: `${width}%` }} /></div></div> }
function App() {
  const [installPrompt, setInstallPrompt] = useState(null)

  useEffect(() => {
    const handler = event => {
      event.preventDefault()
      setInstallPrompt(event)
    }

    window.addEventListener('beforeinstallprompt', handler)

    return () => {
      window.removeEventListener('beforeinstallprompt', handler)
    }
  }, [])

  async function installApp() {
    if (!installPrompt) {
      alert('To install FPL Risk, use your browser menu and choose "Add to Home screen" or "Install app".')
      return
    }

    installPrompt.prompt()
    await installPrompt.userChoice
    setInstallPrompt(null)
  }
  const { isLoaded: authLoaded, isSignedIn, getToken } = useAuth(); const { user } = useUser(); const [teamId, setTeamId] = useState(''); const [account, setAccount] = useState(null); const [templates, setTemplates] = useState(null); const [players, setPlayers] = useState([]); const [query, setQuery] = useState(''); const [selectedPlayer, setSelectedPlayer] = useState(null); const [playerPickerOpen, setPlayerPickerOpen] = useState(false); const [owns, setOwns] = useState(true); const [captain, setCaptain] = useState(false); const [tripleCaptain, setTripleCaptain] = useState(false); const [expectedPoints, setExpectedPoints] = useState(''); const [usage, setUsage] = useState(null); const [result, setResult] = useState(null); const [loading, setLoading] = useState(true); const [working, setWorking] = useState(false); const [error, setError] = useState(''); const [showKey, setShowKey] = useState(false); const [showAbout, setShowAbout] = useState(false)
  const selectedTemplate = useMemo(() => templates?.players?.find(p => Number(p.playerId) === Number(selectedPlayer)) || null, [templates, selectedPlayer]); const selectedGeneralPlayer = useMemo(() => players.find(p => Number(p.playerId) === Number(selectedPlayer)) || null, [players, selectedPlayer]); const selectedPlayerName = selectedGeneralPlayer?.name || selectedTemplate?.name || result?.player?.name || 'Choose a player'
  const getPlayerMeta = player => { const team = player.teamName || player.team || player.teamShortName || (player.teamId ? `Team ${player.teamId}` : ''); const position = player.positionName || POSITION_NAMES[player.position] || ''; return [team, position].filter(Boolean).join(' · ') }
  const filteredPlayers = useMemo(() => { const q = query.trim().toLowerCase(); if (!q) return players.slice(0, 10); return players.filter(p => `${p.name} ${p.firstName || ''} ${p.lastName || ''} ${getPlayerMeta(p)}`.toLowerCase().includes(q)).slice(0, 12) }, [players, query])
  useEffect(() => { if (!authLoaded) return; if (!isSignedIn) { setAccount(null); setTemplates(null); setPlayers([]); setResult(null); setUsage(null); setLoading(false); setPlayerPickerOpen(false); return }; let cancelled = false; async function boot() { setLoading(true); setError(''); try { const token = await getToken(); const [linked, usageData] = await Promise.all([apiRequest('/api/account/fpl', token), apiRequest('/api/calculator/usage', token)]); if (cancelled) return; setAccount(linked.linked ? linked : null); setUsage(usageData); if (linked.linked) { const data = await apiRequest('/api/calculator/templates', token); if (cancelled) return; setTemplates(data); if (data.players?.[0]) setSelectedPlayer(data.players[0].playerId) } } catch (err) { if (!cancelled) setError(err.status === 401 ? 'Your authentication session could not be verified. Sign out and sign back in.' : err.message) } finally { if (!cancelled) setLoading(false) } }; boot(); return () => { cancelled = true } }, [authLoaded, isSignedIn, getToken])
  async function linkTeam(event) { event.preventDefault(); const id = teamId.trim(); if (!/^\d+$/.test(id) || Number(id) <= 0) return setError('Enter a valid FPL Team ID.'); setWorking(true); setError(''); try { const token = await getToken(); const data = await apiRequest('/api/account/fpl', token, { method: 'POST', body: JSON.stringify({ fplId: Number(id) }) }); setAccount(data); setTeamId(''); const [templateData, usageData] = await Promise.all([apiRequest('/api/calculator/templates', token), apiRequest('/api/calculator/usage', token)]); setTemplates(templateData); setUsage(usageData); setSelectedPlayer(templateData.players?.[0]?.playerId || null) } catch (err) { setError(err.status === 401 ? 'Authentication failed. Your Clerk session was not accepted by the backend.' : err.message) } finally { setWorking(false) } }
  async function loadPlayers() { setPlayerPickerOpen(true); if (players.length) return; try { const token = await getToken(); const data = await apiRequest('/api/calculator/players', token); setPlayers(data.players || []) } catch (err) { setError(err.message); setPlayerPickerOpen(false) } }
  function choosePlayer(player) { setSelectedPlayer(Number(player.playerId)); setQuery(''); setResult(null); setPlayerPickerOpen(false) }
  async function analyze() { if (!selectedPlayer) return setError('Choose a player first.'); const points = Number(expectedPoints); if (!Number.isFinite(points) || points < 0 || points > 100) return setError('Enter expected points between 0 and 100.'); if (tripleCaptain && !captain) return setError('Triple Captain requires Captain.'); setWorking(true); setError(''); setResult(null); try { const token = await getToken(); const data = await apiRequest('/api/calculator/analyze', token, { method: 'POST', body: JSON.stringify({ playerId: Number(selectedPlayer), owns, captain, tripleCaptain, expectedPoints: points }) }); setResult(data); setUsage(data.usage || usage) } catch (err) { setError(err.status === 429 ? `${err.message}${err.data?.resetsAt ? ` Resets at ${new Date(err.data.resetsAt).toLocaleString()}.` : ''}` : err.message) } finally { setWorking(false) } }
  if (!authLoaded || loading) return <div className="loading-screen"><div className="loader" /><span>Loading FPL Risk</span></div>
  if (!isSignedIn) return <main className="landing"><div className="landing-glow" /><header className="topbar"><div className="logo"><span>FPL</span> RISK</div><div className="auth-actions"><SignInButton mode="modal"><button className="button ghost">Sign in</button></SignInButton><SignUpButton mode="modal"><button className="button primary">Get started</button></SignUpButton></div></header><section className="hero"><div className="eyebrow">FANTASY PREMIER LEAGUE · DECISION ENGINE</div><h1>Know the risk<br /><em>before</em> you click.</h1><p>See how your ownership, captaincy and Triple Captaincy decisions compare with managers around your global rank.</p><div className="hero-actions"><SignUpButton mode="modal"><button className="button primary large">Start calculating <span>→</span></button></SignUpButton><button type="button" className="micro install-link" onClick={installApp}>Works on web · Install on your phone</button></div><div className="hero-preview"><div className="preview-label">EXAMPLE DECISION</div><div className="preview-player"><div className="avatar">S</div><div><strong>Ødegaard</strong><span>Captain · 8.2 expected points</span></div><b className="up">+4.8 pts</b></div></div></section></main>
  return <main className="app-shell"><header className="topbar app-topbar"><div className="logo"><span>FPL</span> RISK</div><div className="top-meta"><span className="season-dot" /> LIVE ENGINE <UserButton /></div></header><div className="page">{error && <div className="alert"><span>!</span><div>{error}</div><button onClick={() => setError('')}>×</button></div>}{!account ? <section className="connect-card"><div className="connect-copy"><div className="eyebrow">STEP 01 · IDENTIFY YOUR TEAM</div><h1>Connect your FPL team.</h1><p>We use your current global rank to put your decisions against the right comparison group.</p><div className="trust-row"><span>✓ Current-season verification</span><span>✓ Your ID is stored securely</span></div></div><form className="connect-form" onSubmit={linkTeam}><label>FPL Team ID</label><div className="input-row"><input inputMode="numeric" value={teamId} onChange={e => setTeamId(e.target.value)} placeholder="e.g. 1234567" /><button className="button primary" disabled={working}>{working ? 'Verifying…' : 'Connect →'}</button></div><small>Find it in FPL under Points / Gameweek history.</small></form></section> : <><section className="dashboard-head"><div><div className="eyebrow">FPL RISK ENGINE · GW {templates?.gameweek ?? '—'}</div><h1>Make the decision.<br /><span>See the consequence.</span></h1><p>Hi {account.playerName || user?.firstName || 'manager'}. Your rank is <strong>#{formatNumber(account.rank ?? templates?.manager?.rank)}</strong> in the <strong>{templates?.tier?.name || 'current tier'}</strong> band.</p></div>{usage && <div className="usage-pill"><strong>{usage.unlimited ? 'UNLIMITED' : `${usage.remaining} / ${usage.limit}`}</strong><span>analyses left</span></div>}</section><section className="calculator-grid"><div className="panel decision-panel"><div className="panel-heading"><div><span className="step">02</span><div><h2>Build your decision</h2><p>Tell us what you're considering.</p></div></div></div><div className="field"><label>Player</label><button className="player-select" onClick={() => { if (playerPickerOpen) { setPlayerPickerOpen(false); setQuery('') } else { loadPlayers() } }} type="button"><span>{selectedPlayerName}</span><span>{playerPickerOpen ? '⌃' : '⌄'}</span></button>{playerPickerOpen && <div className="player-picker"><input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search players…" />{filteredPlayers.map(player => <button type="button" key={player.playerId} onClick={() => choosePlayer(player)}><span><strong>{player.name}</strong>{getPlayerMeta(player) && <small>{getPlayerMeta(player)}</small>}</span><span>#{player.playerId}</span></button>)}</div>}</div><div className="field"><label>Expected points</label><div className="points-input"><input inputMode="decimal" value={expectedPoints} onChange={e => setExpectedPoints(e.target.value)} placeholder="0" /><span>pts</span></div><small>What you realistically expect the player to score this gameweek.</small></div><div className="decision-options"><label>YOUR EXPOSURE</label><div className="toggle-row"><button className={owns ? 'toggle active' : 'toggle'} onClick={() => setOwns(v => !v)} type="button"><span className="switch" /> Own</button><button className={captain ? 'toggle active' : 'toggle'} onClick={() => setCaptain(v => !v)} type="button"><span className="switch" /> Captain</button><button className={tripleCaptain ? 'toggle active' : 'toggle'} onClick={() => { setTripleCaptain(v => !v); setCaptain(true) }} type="button"><span className="switch" /> Triple Captain</button></div></div><button className="button primary analyze-button" disabled={working || !selectedPlayer} onClick={analyze}>{working ? 'Calculating risk…' : 'Analyze risk →'}</button></div><div className="panel tier-panel"><div className="panel-heading"><div><span className="step">03</span><div><h2>Your comparison group</h2><p>Based on the latest completed gameweek data.</p></div></div></div>{templates?.players?.length ? <div className="template-list">{templates.players.map(player => <button key={player.playerId} className={Number(selectedPlayer) === Number(player.playerId) ? 'template selected' : 'template'} onClick={() => choosePlayer(player)}><span className="template-rank">0{player.rank}</span><span className="template-name">{player.name}<small>{formatPercent(player.ownershipPct, 1)} owned</small></span><span className="template-arrow">→</span></button>)}</div> : <div className="empty">Connect your team to load the current rank-tier templates.</div>}</div></section>{result && <section className="results-section"><div className="result-heading"><div><div className="eyebrow">RESULT · {result.player.name}</div><h2>The risk is <span className={Number(result.relativeSwing) >= 0 ? 'positive' : 'negative'}>{Number(result.relativeSwing) >= 0 ? 'in your favour' : 'against you'}.</span></h2></div><div className="result-swing"><strong>{Number(result.relativeSwing) >= 0 ? '+' : ''}{Number(result.relativeSwing).toFixed(2)}</strong><span>expected pts</span></div></div><div className="result-grid"><div className="result-card"><span>Ownership</span><strong>{formatPercent(result.ownershipPct, 1)}</strong><small>of managers in your tier</small></div><div className="result-card"><span>Your EO</span><strong>{formatEO(result.userExposure)}</strong><small>your effective exposure</small></div><div className="result-card"><span>Tier EO</span><strong>{formatEO(result.tierExposure)}</strong><small>comparison average</small></div><div className="result-card"><span>EO Difference</span><strong className={Number(result.userExposure) >= Number(result.tierExposure) ? 'positive' : 'negative'}>{Number(result.userExposure) >= Number(result.tierExposure) ? '+' : ''}{((Number(result.userExposure) - Number(result.tierExposure)) * 100).toFixed(0)}%</strong><small>versus your tier</small></div><div className="result-card"><span>Percentile</span><strong>{result.exposurePercentile}</strong><small>exposure position</small></div><div className="result-card"><span>Captaincy</span><strong>{formatPercent(result.captainPct, 1)}</strong><small>managers in your tier</small></div></div><div className="analysis-bottom"><div className="panel exposure-panel"><div className="mini-heading"><h3>Exposure picture</h3></div><ExposureBar value={result.userExposure} label="Your EO" /><ExposureBar value={result.tierExposure} label="Tier EO" /><div className="swing-note"><span>Relative expected swing</span><strong className={Number(result.relativeSwing) >= 0 ? 'positive' : 'negative'}>{Number(result.relativeSwing) >= 0 ? '+' : ''}{Number(result.relativeSwing).toFixed(2)} pts</strong></div></div></div></section>}{result?.rankImpact && (
  <section className="rank-movement-section">
    <div className="result-heading">
      <div>
        <div className="eyebrow">RANK MOVEMENT</div>
        <h2>
          Expected rank movement{" "}
          <span className={
            result.rankImpact.direction === "up"
              ? "positive"
              : result.rankImpact.direction === "down"
                ? "negative"
                : ""
          }>
            {result.rankImpact.direction === "up"
              ? "up"
              : result.rankImpact.direction === "down"
                ? "down"
                : "unchanged"}
          </span>
        </h2>
        <p>
          Based on your current points and relative expected point swing,
          using the observed rank-boundary lower limit.
        </p>
      </div>

      <div className="result-swing">
        <strong className={
          Number(result.rankImpact.estimatedRankMovement) > 0
            ? "positive"
            : Number(result.rankImpact.estimatedRankMovement) < 0
              ? "negative"
              : ""
        }>
          {Number(result.rankImpact.estimatedRankMovement) > 0 ? "+" : ""}
          {formatNumber(result.rankImpact.estimatedRankMovement)}
        </strong>
        <span>rank places</span>
      </div>
    </div>

    <div className="rank-movement-grid">
      <div className="result-card">
        <span>Current rank</span>
        <strong>#{formatNumber(result.rankImpact.currentRank)}</strong>
      </div>

      <div className="result-card">
        <span>Current points</span>
        <strong>{formatNumber(result.rankImpact.currentPoints)}</strong>
      </div>

      <div className="result-card">
        <span>Point swing</span>
        <strong className={
          Number(result.rankImpact.pointSwing) > 0
            ? "positive"
            : Number(result.rankImpact.pointSwing) < 0
              ? "negative"
              : ""
        }>
          {Number(result.rankImpact.pointSwing) > 0 ? "+" : ""}
          {formatNumber(result.rankImpact.pointSwing)}
        </strong>
      </div>

      <div className="result-card">
        <span>Projected points</span>
        <strong>{formatNumber(result.rankImpact.projectedPoints)}</strong>
      </div>

      <div className="result-card">
        <span>Estimated rank</span>
        <strong>#{formatNumber(result.rankImpact.estimatedRank)}</strong>
      </div>

      <div className="result-card">
        <span>Direction</span>
        <strong className={
          result.rankImpact.direction === "up"
            ? "positive"
            : result.rankImpact.direction === "down"
              ? "negative"
              : ""
        }>
          {result.rankImpact.direction
            ? String(result.rankImpact.direction).toUpperCase()
            : "—"}
        </strong>
      </div>

      <div className="result-card">
        <span>Boundary lower limit</span>
        <strong>{formatNumber(result.rankImpact.boundaryLowerLimit)}</strong>
      </div>

      <div className="result-card">
        <span>Boundary distance</span>
        <strong>{formatNumber(result.rankImpact.boundaryDistance)}</strong>
        <small>points</small>
      </div>
    </div>
  </section>
)}<section className="footer-tools"><button className="key-button" onClick={() => setShowAbout(v => !v)}>About FPL Risk <span>{showAbout ? '↑' : '→'}</span></button>{showAbout && <div className="about-card"><div className="eyebrow">THE IDEA</div><h3>Use what we learned to make the next decision.</h3><p>FPL Risk uses information from completed gameweeks to help you make decisions in the current gameweek. What we learn from GW1 becomes useful for GW2 decisions. When GW2 finishes, its data becomes useful for GW3, and the cycle continues.</p><p>The calculator compares your decision with managers around your rank and estimates the relative risk of that decision. It is not a guarantee of your final points or rank movement.</p><p><strong>Free:</strong> 3 calculations each gameweek. <strong>Premium:</strong> unlimited calculations.</p><div className="about-flow"><span>GW1 data</span><b>→</b><span>GW2 decisions</span><b>→</b><span>GW2 data</span><b>→</b><span>GW3 decisions</span></div></div>}<button className="key-button" onClick={() => setShowKey(v => !v)}>What do these numbers mean? <span>{showKey ? '↑' : '→'}</span></button>{showKey && <div className="key-grid">{KEY_ITEMS.map(([title, body]) => <div key={title}><strong>{title}</strong><p>{body}</p></div>)}</div>}</section></>}</div></main>
}
export default App
