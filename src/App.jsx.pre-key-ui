import { useEffect, useState } from 'react'
import {
  SignInButton,
  SignUpButton,
  UserButton,
  useAuth,
  useUser,
} from '@clerk/react'
import './App.css'

const API_URL = import.meta.env.VITE_API_URL

function App() {
  const { isSignedIn } = useUser()
  const { getToken } = useAuth()

  const [accountLoading, setAccountLoading] = useState(false)
  const [accountLinked, setAccountLinked] = useState(false)
  const [teamId, setTeamId] = useState('')
  const [error, setError] = useState('')
  const [templates, setTemplates] = useState(null)
  const [selectedPlayer, setSelectedPlayer] = useState('')
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
                onClick={loadTemplates}
                disabled={accountLoading}
              >
                Load calculator
              </button>
            ) : (
              <>
                <div className="calculator-form">
                  <label>
                    Player
                    <select
                      value={selectedPlayer}
                      onChange={(event) =>
                        setSelectedPlayer(event.target.value)
                      }
                    >
                      {templates.players?.map((player) => (
                        <option
                          key={player.playerId}
                          value={player.playerId}
                        >
                          {player.name}
                        </option>
                      ))}
                    </select>
                  </label>

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
                        <strong>{result.userExposure}</strong>
                        <span>Your exposure</span>
                      </div>

                      <div>
                        <strong>{result.tierExposure}</strong>
                        <span>Tier average</span>
                      </div>

                      <div>
                        <strong>{result.exposurePercentile}</strong>
                        <span>Exposure percentile</span>
                      </div>

                      <div>
                        <strong>{result.exposureDistanceFromMean}</strong>
                        <span>Distance from mean</span>
                      </div>

                      <div>
                        <strong>{result.relativeSwing}</strong>
                        <span>Relative expected swing</span>
                      </div>
                    </div>

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
    </main>
  )
}

export default App
