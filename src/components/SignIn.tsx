import React, { useState } from 'react'
import { useApp } from '../state/app'
import { Icon } from './ui'
import * as shoebox from '../biz/shoebox'

// Signs in with a Shoebox admin account. Same email, password and two-factor
// code as the Shoebox app; the password stays in this browser.
export function SignIn() {
  const { business, onSignedIn, error: loadError } = useApp()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [ticket, setTicket] = useState('')
  const [code, setCode] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState(loadError)
  const [wipe, setWipe] = useState('')

  const handle = (r: shoebox.SignInStep) => {
    if ('ok' in r) return onSignedIn()
    if ('twoFactor' in r) {
      setTicket(r.ticket)
      setError('')
      return
    }
    setError(r.error)
    setWipe(r.wipeWarning ?? '')
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setBusy(true)
    setError('')
    try {
      handle(ticket ? await shoebox.signIn2fa(business, email, ticket, code) : await shoebox.signIn(business, email, password))
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Couldn’t sign in.')
    }
    setBusy(false)
    setPassword('')
  }

  return (
    <div className="page">
      <div className="signin">
        <form className="card" onSubmit={submit}>
          <span className="biz-dot" style={{ width: 40, height: 40, borderRadius: 12, fontSize: 18, background: business.color + '33', color: business.color }}>{business.name[0]}</span>
          <h1>{ticket ? 'Two-factor code' : `Connect ${business.name}`}</h1>
          <p>
            {ticket
              ? 'Enter the 6-digit code from your authenticator app.'
              : 'Sign in with your Shoebox admin account. Your password stays in this browser: only a proof derived from it is sent, the same way the Shoebox app signs in.'}
          </p>
          {error && <div className="err"><Icon name="alert" /> <span>{error}{wipe && <><br />{wipe}</>}</span></div>}
          {ticket ? (
            <>
              <div className="field">
                <label htmlFor="si-code">Code</label>
                <input id="si-code" className="input code-input" inputMode="numeric" autoComplete="one-time-code" maxLength={7} value={code} onChange={(e) => setCode(e.target.value)} autoFocus required />
              </div>
              <div className="note"><Icon name="info" /> <span>Wrong codes count toward your Shoebox wipe limit, just like in the app. If you aren’t sure, use the app to check your authenticator first.</span></div>
            </>
          ) : (
            <>
              <div className="field">
                <label htmlFor="si-email">Email</label>
                <input id="si-email" className="input" type="email" autoComplete="username" value={email} onChange={(e) => setEmail(e.target.value)} required autoFocus />
              </div>
              <div className="field">
                <label htmlFor="si-pw">Password</label>
                <input id="si-pw" className="input" type="password" autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} required />
              </div>
            </>
          )}
          <button className="btn btn-primary" style={{ width: '100%', height: 42, marginTop: 6 }} disabled={busy}>
            <Icon name="lock" /> {busy ? (ticket ? 'Checking…' : 'Signing in…') : ticket ? 'Verify' : 'Sign in'}
          </button>
          {ticket && <button type="button" className="btn btn-ghost" style={{ width: '100%', marginTop: 8 }} onClick={() => { setTicket(''); setCode('') }}>Start over</button>}
          <p className="faint" style={{ fontSize: 12, marginTop: 14, marginBottom: 0 }}>Only accounts marked as admins can open this. You’ll see account details and counts, never anyone’s receipts: those are encrypted with keys Shoebox doesn’t have.</p>
        </form>
      </div>
    </div>
  )
}
