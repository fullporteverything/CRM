import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import type { Actions, Business, Connector, Dataset } from '../biz/types'
import * as shoebox from '../biz/shoebox'
import * as local from '../biz/local'

// Which businesses this browser has connected, and which one is open.
const LIST_KEY = 'foreman:businesses'
const CURRENT_KEY = 'foreman:current'
const THEME_KEY = 'foreman:theme'

const defaults: Business[] = [
  { id: 'shoebox', name: 'Shoebox', connector: 'shoebox', color: '#f3b63f', createdAt: 0 },
  { id: 'kestrel', name: 'Kestrel Roofing', connector: 'demo', color: '#3fb3b0', createdAt: 0 },
]

const read = <T,>(k: string, fallback: T): T => {
  try {
    const s = localStorage.getItem(k)
    return s ? (JSON.parse(s) as T) : fallback
  } catch {
    return fallback
  }
}
const write = (k: string, v: unknown) => {
  try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* blocked */ }
}

export type Status = 'loading' | 'ready' | 'signin' | 'error'
export type Page = 'dashboard' | 'pipeline' | 'contacts' | 'activities' | 'reports' | 'office'
export const pages: Page[] = ['dashboard', 'pipeline', 'contacts', 'activities', 'reports', 'office']

type Ctx = {
  businesses: Business[]
  business: Business
  switchTo: (id: string) => void
  addBusiness: (name: string, connector: Connector, config?: Record<string, string>) => void
  removeBusiness: (id: string) => void
  renameBusiness: (id: string, name: string) => void
  data: Dataset | null
  status: Status
  error: string
  refresh: () => Promise<void>
  act: <K extends keyof Actions>(name: K, ...args: Parameters<NonNullable<Actions[K]>>) => Promise<boolean>
  signedInAs: string | null
  onSignedIn: () => void
  signOut: () => Promise<void>
  resetSample: () => void
  page: Page
  go: (p: Page) => void
  contactId: string | null
  openContact: (id: string | null) => void
  query: string
  setQuery: (q: string) => void
  theme: 'dark' | 'light'
  toggleTheme: () => void
  toast: (msg: string) => void
  toastMsg: string
}

const C = createContext<Ctx | null>(null)
export const useApp = () => {
  const c = useContext(C)
  if (!c) throw new Error('useApp outside provider')
  return c
}

const pageFromHash = (): Page => {
  const h = location.hash.replace(/^#\/?/, '').split('?')[0] as Page
  return pages.includes(h) ? h : 'dashboard'
}

export function AppProvider({ children }: { children: ReactNode }) {
  const [businesses, setBusinesses] = useState<Business[]>(() => {
    const saved = read<Business[]>(LIST_KEY, [])
    return saved.length ? saved : defaults
  })
  const [currentId, setCurrentId] = useState<string>(() => read<string>(CURRENT_KEY, 'shoebox'))
  const business = businesses.find((b) => b.id === currentId) ?? businesses[0]
  const [data, setData] = useState<Dataset | null>(null)
  const [status, setStatus] = useState<Status>('loading')
  const [error, setError] = useState('')
  const [page, setPage] = useState<Page>(pageFromHash)
  const [contactId, setContactId] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [theme, setTheme] = useState<'dark' | 'light'>(() => read(THEME_KEY, 'dark'))
  const [toastMsg, setToast] = useState('')
  const loadSeq = useRef(0)
  const toastTimer = useRef<number>()

  useEffect(() => write(LIST_KEY, businesses), [businesses])
  useEffect(() => write(CURRENT_KEY, business.id), [business.id])
  useEffect(() => {
    document.documentElement.dataset.theme = theme
    write(THEME_KEY, theme)
  }, [theme])
  useEffect(() => {
    const h = () => setPage(pageFromHash())
    window.addEventListener('hashchange', h)
    return () => window.removeEventListener('hashchange', h)
  }, [])

  const toast = useCallback((msg: string) => {
    setToast(msg)
    window.clearTimeout(toastTimer.current)
    toastTimer.current = window.setTimeout(() => setToast(''), 2600)
  }, [])

  const load = useCallback(async (quiet = false) => {
    const seq = ++loadSeq.current
    if (!quiet) setStatus('loading')
    try {
      let ds: Dataset
      if (business.connector === 'shoebox') {
        if (!shoebox.savedSession(business)) {
          if (seq === loadSeq.current) { setStatus('signin'); setData(null) }
          return
        }
        ds = await shoebox.load(business)
      } else {
        ds = local.load(business)
      }
      if (seq !== loadSeq.current) return
      setData(ds)
      setStatus('ready')
      setError('')
    } catch (e) {
      if (seq !== loadSeq.current) return
      if (e instanceof shoebox.ShoeboxError && (e.code === 'session_ended' || e.code === 'forbidden')) {
        setStatus('signin')
        setData(null)
        setError(e.code === 'forbidden' ? e.message : '')
        return
      }
      const msg = e instanceof Error ? e.message : 'Something went wrong.'
      if (quiet) return // keep showing the last good data
      setError(msg)
      setStatus('error')
    }
  }, [business])

  useEffect(() => {
    setData(null)
    setContactId(null)
    void load()
  }, [load])

  // Live connectors refresh on a timer and when the window comes back.
  useEffect(() => {
    if (business.connector !== 'shoebox') return
    const t = window.setInterval(() => void load(true), 30_000)
    const f = () => document.visibilityState === 'visible' && void load(true)
    document.addEventListener('visibilitychange', f)
    return () => {
      window.clearInterval(t)
      document.removeEventListener('visibilitychange', f)
    }
  }, [business.connector, load])

  const actionsFor = useMemo<Actions>(() => (business.connector === 'shoebox' ? shoebox.actions(business) : local.actions(business)), [business])

  const act: Ctx['act'] = async (name, ...args) => {
    const fn = actionsFor[name] as ((...a: unknown[]) => Promise<void>) | undefined
    if (!fn) return false
    try {
      await fn(...args)
      await load(true)
      return true
    } catch (e) {
      if (e instanceof shoebox.ShoeboxError && e.code === 'session_ended') {
        setStatus('signin')
        setData(null)
      }
      toast(e instanceof Error ? e.message : 'That didn’t work.')
      return false
    }
  }

  const go = (p: Page) => {
    setPage(p)
    try { history.replaceState(null, '', '#/' + p) } catch { /* sandboxed frame */ }
    window.scrollTo({ top: 0 })
  }

  const value: Ctx = {
    businesses, business,
    switchTo: (id) => setCurrentId(id),
    addBusiness: (name, connector, config) => {
      const id = `${connector}-${Date.now().toString(36)}`
      const palette = ['#3fb3b0', '#4f8df0', '#e8a948', '#c27bd6', '#3fcf8e', '#ef5b5b']
      setBusinesses((bs) => [...bs, { id, name, connector, config, color: palette[bs.length % palette.length], createdAt: Date.now() }])
      setCurrentId(id)
    },
    removeBusiness: (id) => {
      const b = businesses.find((x) => x.id === id)
      if (b && b.connector !== 'shoebox') local.resetLocal(b)
      if (b?.connector === 'shoebox') void shoebox.signOut(b)
      setBusinesses((bs) => bs.filter((x) => x.id !== id))
      if (currentId === id) setCurrentId(businesses.find((x) => x.id !== id)?.id ?? 'shoebox')
    },
    renameBusiness: (id, name) => setBusinesses((bs) => bs.map((b) => (b.id === id ? { ...b, name } : b))),
    data, status, error, refresh: () => load(true), act,
    signedInAs: business.connector === 'shoebox' ? shoebox.savedSession(business)?.email ?? null : null,
    onSignedIn: () => void load(),
    signOut: async () => {
      await shoebox.signOut(business)
      setData(null)
      setStatus('signin')
    },
    resetSample: () => {
      local.resetLocal(business)
      void load()
      toast('Sample data reset')
    },
    page, go, contactId, openContact: setContactId, query, setQuery,
    theme, toggleTheme: () => setTheme((t) => (t === 'dark' ? 'light' : 'dark')),
    toast, toastMsg,
  }
  return <C.Provider value={value}>{children}</C.Provider>
}
