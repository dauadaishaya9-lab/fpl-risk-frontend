import { useEffect, useRef, useState } from 'react'
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
  useUser,
} from '@clerk/react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL

const KEY_ITEMS = {
  expectedSwing: {
    title: 'Expected Swing',
    body: 'Shows the estimated points advantage or disadvantage created by your effective ownership compared with managers around your rank. Positive (+) means you are more exposed to the player’s points. Negative (−) means you are less exposed.'
  },
  yourEO: {
    title: 'Your EO',
    body: 'Your Effective Ownership (EO) describes how strongly your team is affected by this player’s points through ownership, captaincy and Triple Captaincy.'
  },
  tierEO: {
    title: 'Tier EO',
    body: 'The average Effective Ownership of managers around your rank. It is your benchmark for comparison.'
  },
  eoDifference: {
    title: 'EO Difference',
    body: 'The difference between your EO and the average EO of managers around your rank. For example, 200% Your EO minus 152% Tier EO equals +48%.'
  },
  ownership: {
    title: 'Ownership',
    body: 'The percentage of managers in your comparison group who own the player.'
  },
  captaincy: {
    title: 'Captaincy',
    body: 'The percentage of managers in your comparison group who captain the player.'
  },
  tripleCaptain: {
    title: 'Triple Captaincy',
    body: 'The percentage of managers in your comparison group who Triple Captain the player.'
  },
  percentile: {
    title: 'Exposure Percentile',
    body: 'Shows where your Effective Ownership sits compared with the managers in your comparison group. For example, the 96th percentile means your exposure is higher than roughly 96% of the sampled exposure values.'
  },
  expectedPoints: {
    title: 'Expected Points',
    body: 'The number of points you expect this player to score. This estimate is used to convert your EO difference into an expected points swing.'
  },
  decision: {
    title: 'Your Decision',
    body: 'The ownership, captaincy and Triple Captain choices you made for this analysis. These choices determine your Effective Ownership.'
  },
  rank: {
    title: 'Global Rank',
    body: 'Your FPL global rank. It determines which group of managers is used as your comparison tier.'
  },
  rankTier: {
    title: 'Rank Tier',
    body: 'The rank band containing your FPL rank. Managers from this band are used as your comparison group.'
  },
  gameweek: {
    title: 'Gameweek',
    body: 'The FPL gameweek that the analysis refers to.'
  },
  season: {
    title: 'Season',
    body: 'The FPL season associated with this analysis.'
  },
  analyses: {
    title: 'Analyses Remaining',
    body: 'The number of free analyses remaining for the current gameweek. Opening the Key does not consume a trial.'
  }
}

function useDraggable() {
  const position = useRef({ x: 0, y: 0 })
  const drag = useRef(null)
  const [style, setStyle] = useState({})

  function startDrag(event) {
    if (event.button !== 0 && event.button !== 2) return

    event.preventDefault()

    drag.current = {
      startX: event.clientX,
      startY: event.clientY,
      originX: position.current.x,
      originY: position.current.y,
    }

    const move = (e) => {
      if (!drag.current) return

      const dx = e.clientX - drag.current.startX
      const dy = e.clientY - drag.current.startY

      const x = drag.current.originX + dx
      const y = drag.current.originY + dy

      position.current = { x, y }

      setStyle({
        transform: `translate3d(${x}px, ${y}px, 0)`,
      })
    }

    const stop = () => {
      drag.current = null
      window.removeEventListener('pointermove', move)
      window.removeEventListener('pointerup', stop)
    }

    window.addEventListener('pointermove', move)
    window.addEventListener('pointerup', stop)
  }

  function preventMenu(event) {
    event.preventDefault()
  }

  return {
    style,
    startDrag,
    preventMenu,
  }
}

function FloatingKey({ item, onClose }) {
  const { style, startDrag, preventMenu } = useDraggable()

  if (!item) return null

  return (
    <div
      className="floating-key"
      style={style}
      onContextMenu={preventMenu}
    >
      <div
        className="floating-key-header"
        onPointerDown={startDrag}
      >
        <div>
          <span className="floating-key-label">KEY</span>
          <h3>{item.title}</h3>
        </div>

        <button
          type="button"
          className="floating-key-close"
          onPointerDown={(event) => event.stopPropagation()}
          onClick={onClose}
          aria-label="Close explanation"
        >
          ×
        </button>
      </div>

      <div className="floating-key-body">
        {item.body}
      </div>
    </div>
  )
}

function ResultKey({ onSelect }) {
  return (
    <section className="result-key">
      <div className="result-key-heading">
        <p className="eyebrow">REFERENCE</p>
        <h2>Understand your result</h2>
        <p>Tap any metric to see what it means.</p>
      </div>

      <div className="result-key-grid">
        {Object.entries(KEY_ITEMS).map(([id, item]) => (
          <button
            key={id}
            type="button"
            className="result-key-item"
            onClick={() => onSelect(id)}
          >
            <span>{item.title}</span>
            <span className="result-key-arrow">→</span>
          </button>
        ))}
      </div>
    </section>
  )
}

function App() {
  const { isSignedIn } = useUser()
  const { getToken } = useAuth()

  const [accountLoading, setAccountLoading] = useState(false)
  const [accountLinked, setAccountLinked] = useState(false)
  const [teamId, setTeamId] = useState('')
  const [error, setError] = useState('')
  const openKey = (id) => setSelectedKey(id)

  const [selectedKey, setSelectedKey] = useState(null)
  const [templates, setTemplates] = useState(null)
  const [allPlayers, setAllPlayers] = useState([])
  const [selectedPlayer, setSelectedPlayer] = useState('')
  const [playerSearch, setPlayerSearch] = useState('')
  const [owns, setOwns] = useState(true)
  const [captain, setCaptain] = useState(false)
  const [tripleCaptain, setTripleCaptain] = useState(false)
  const [expectedPoints, setExpectedPoints] = useState('')
  const [analysisLoading, setAnalysisLoading] = useState(false)
  const [result, setResult] = useState(null)

  useEffect(() => {
    if (!isSignedIn) {
      setAccountLinked(false)
      setTeamId('')
      setError('')
      setTemplates(null)
      setResult(null)
      return
    }

    async function checkAccount() {
      setAccountLoading(true)
      setError('')

      try {
        const token = await getToken()

        const response = await fetch(`${API_URL}/api/account/fpl`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Failed to check FPL account.')
        }

        setAccountLinked(Boolean(data.linked))
      } catch (err) {
        setError(err.message || 'Failed to connect to the backend.')
      } finally {
        setAccountLoading(false)
      }
    }

    checkAccount()
  }, [isSignedIn, getToken])

  async function linkTeam() {
    const id = teamId.trim()

    if (!id || !/^\d+$/.test(id)) {
      setError('Enter a valid FPL Team ID.')
      return
    }

    setAccountLoading(true)
    setError('')

    try {
      const token = await getToken()

      const response = await fetch(`${API_URL}/api/account/fpl`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          fplId: Number(id),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to link your FPL account.')
      }

      setAccountLinked(true)
      setTeamId('')
    } catch (err) {
      setError(err.message || 'Failed to link your FPL account.')
    } finally {
      setAccountLoading(false)
    }
  }

  async function loadTemplates() {
    setAccountLoading(true)
    setError('')
    setResult(null)

    try {
      const token = await getToken()

      const response = await fetch(`${API_URL}/api/calculator/templates`, {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load calculator data.')
      }

      setTemplates(data)

      if (data.players?.length && !selectedPlayer) {
        setSelectedPlayer(String(data.players[0].playerId))
      }
    } catch (err) {
      setError(err.message || 'Failed to load calculator data.')
    } finally {
      setAccountLoading(false)
    }
  }

  async function loadAllPlayers() {
    setError('')

    try {
      const token = await getToken()

      const response = await fetch(API_URL + "/api/calculator/players", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to load players.')
      }

      setAllPlayers(data.players || [])
    } catch (err) {
      setError(err.message || 'Failed to load players.')
    }
  }
  async function analyzeRisk() {
    if (!selectedPlayer) {
      setError('Select a player.')
      return
    }

    const points = Number(expectedPoints)

    if (!Number.isFinite(points) || points < 0 || points > 100) {
      setError('Expected points must be between 0 and 100.')
      return
    }

    if (tripleCaptain && !captain) {
      setError('Triple Captain requires Captain to be selected.')
      return
    }

    setAnalysisLoading(true)
    setError('')
    setResult(null)

    try {
      const token = await getToken()

      const response = await fetch(`${API_URL}/api/calculator/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          playerId: Number(selectedPlayer),
          owns,
          captain,
          tripleCaptain,
          expectedPoints: points,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Risk analysis failed.')
      }

      setResult(data)
    } catch (err) {
      setError(err.message || 'Risk analysis failed.')
    } finally {
      setAnalysisLoading(false)
    }
  }

  return (
    <main className="app">
      <header className="header">
        <div className="brand">
          <span className="brand-mark">FPL</span>
          <span>Risk Calculator</span>
        </div>

        <div className="auth-controls">
          {isSignedIn ? (
            <UserButton />
          ) : (
            <>
              <SignInButton mode="modal">
                <button className="button secondary">Sign in</button>
              </SignInButton>

              <SignUpButton mode="modal">
                <button className="button primary">Sign up</button>
              </SignUpButton>
            </>
          )}
        </div>
      </header>

      <section className="hero-section">
        <p className="eyebrow">FPL decision intelligence</p>

        <h1>
          Know the risk
          <br />
          behind your picks.
        </h1>

        <p className="description">
          Compare your captaincy and ownership decisions against managers
          around your rank.
        </p>

        {!isSignedIn ? (
          <SignUpButton mode="modal">
            <button className="button primary large">Get started</button>
          </SignUpButton>
        ) : accountLoading ? (
          <div className="welcome">Checking your FPL account...</div>
        ) : accountLinked ? (
          <div className="calculator">
            <div className="welcome">
              <p>You're signed in. Your calculator is ready.</p>
            </div>

            {!templates ? (
              <button
                type="button"
                className="button primary large"
                onClick={async () => { await loadTemplates(); await loadAllPlayers() }}
                disabled={accountLoading}
              >
                Load calculator
              </button>
            ) : (
              <>
                <section className="template-players">
                  <div className="template-heading">
                    <p className="eyebrow">YOUR RANK TIER</p>
                    <h2>Popular picks</h2>
                    <p>Start with one of the five most-used players around your rank.</p>
                  </div>

                  <div className="template-player-grid">
                    {templates.players?.slice(0, 5).map((player) => (
                      <button
                        type="button"
                        key={player.playerId}
                        className={
                          "template-player" +
                          (selectedPlayer === String(player.playerId)
                            ? " selected"
                            : "")
                        }
                        onClick={() => {
                          setSelectedPlayer(String(player.playerId))
                          setPlayerSearch(player.name)
                        }}
                      >
                        <span className="template-rank">#{player.rank}</span>
                        <strong>{player.name}</strong>
                        <span>{player.ownershipPct}% owned</span>
                      </button>
                    ))}
                  </div>
                </section>

                <div className="calculator-form">
                  <label>
                    Player
                    <input
                      type="text"
                      placeholder="Search any FPL player..."
                      value={playerSearch}
                      onChange={(event) => {
                        const value = event.target.value
                        setPlayerSearch(value)

                        const match = allPlayers.find((player) =>
                          player.name.toLowerCase().includes(value.toLowerCase())
                        )

                        if (match) {
                          setSelectedPlayer(String(match.playerId))
                        }
                      }}
                    />
                  </label>

                  {playerSearch && (
                    <div className="player-search-results">
                      {allPlayers
                        .filter((player) =>
                          player.name
                            .toLowerCase()
                            .includes(playerSearch.toLowerCase())
                        )
                        .slice(0, 8)
                        .map((player) => (
                          <button
                            type="button"
                            key={player.playerId}
                            className="player-search-result"
                            onClick={() => {
                              setSelectedPlayer(String(player.playerId))
                              setPlayerSearch(player.name)
                            }}
                          >
                            <span>{player.name}</span>
                          </button>
                        ))}
                    </div>
                  )}

                  <label>
                    Expected points
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      placeholder="e.g. 6.5"
                      value={expectedPoints}
                      onChange={(event) =>
                        setExpectedPoints(event.target.value)
                      }
                    />
                  </label>

                  <label className="choice">
                    <input
                      type="checkbox"
                      checked={owns}
                      onChange={(event) => setOwns(event.target.checked)}
                    />
                    Own player
                  </label>

                  <label className="choice">
                    <input
                      type="checkbox"
                      checked={captain}
                      onChange={(event) => {
                        setCaptain(event.target.checked)
                        if (!event.target.checked) {
                          setTripleCaptain(false)
                        }
                      }}
                    />
                    Captain
                  </label>

                  <label className="choice">
                    <input
                      type="checkbox"
                      checked={tripleCaptain}
                      disabled={!captain}
                      onChange={(event) =>
                        setTripleCaptain(event.target.checked)
                      }
                    />
                    Triple Captain
                  </label>

                  <button
                    type="button"
                    className="button primary large"
                    onClick={analyzeRisk}
                    disabled={analysisLoading}
                  >
                    {analysisLoading ? 'Analyzing...' : 'Analyze risk'}
                  </button>
                </div>

                {result && (
                  <section className="results">
                    <h2>{result.player.name}</h2>

                    <div className="result-grid">
                      <div>
                        <strong>{result.ownershipPct}%</strong>
                        <span>Ownership</span>
                      </div>

                      <div>
                        <strong>{result.captainPct}%</strong>
                        <span>Captaincy</span>
                      </div>

                      <div>
                        <strong>{result.tripleCaptainPct}%</strong>
                        <span>Triple Captain</span>
                      </div>

                      <div>
                        <strong>{(Number(result.userExposure) * 100).toFixed(0)}%</strong>
                        <span>Your EO</span>
                      </div>

                      <div>
                        <strong>{(Number(result.tierExposure) * 100).toFixed(0)}%</strong>
                        <span>Tier EO</span>
                      </div>

                      <div>
                        <strong>{result.exposurePercentile}</strong>
                        <span>Exposure percentile</span>
                      </div>

                      <div>
                        <strong>{(() => {
  const diff = (Number(result.userExposure) - Number(result.tierExposure)) * 100
  return (diff > 0 ? '+' : '') + diff.toFixed(0) + '%'
})()}</strong>
                        <span>EO Difference</span>
                      </div>

                      <div>
                        <strong>{result.relativeSwing}</strong>
                        <span>Relative expected swing</span>
                      </div>
                    </div>

                    <ResultKey onSelect={openKey} />

                    {result.usage && (
                      <p className="usage">
                        Analyses remaining: {result.usage.remaining} /{' '}
                        {result.usage.limit}
                      </p>
                    )}
                  </section>
                )}
              </>
            )}
          </div>
        ) : (
          <div className="account-form">
            <h2>Connect your FPL team</h2>

            <p>
              Enter your FPL Team ID once. We'll remember it for this season.
            </p>

            <input
              type="number"
              inputMode="numeric"
              placeholder="FPL Team ID"
              value={teamId}
              onChange={(event) => setTeamId(event.target.value)}
            />

            <button
              type="button"
              className="button primary large"
              onClick={linkTeam}
              disabled={accountLoading}
            >
              {accountLoading ? 'Connecting...' : 'Connect FPL team'}
            </button>
          </div>
        )}

        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
      </section>
    <FloatingKey
      item={selectedKey ? KEY_ITEMS[selectedKey] : null}
      onClose={() => setSelectedKey(null)}
    />

    </main>
  )
}

export default App
