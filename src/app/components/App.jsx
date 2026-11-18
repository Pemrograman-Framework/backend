'use client'

import { useState, useEffect, useRef } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { LayoutDashboard, FileText, AlertTriangle, Database, Users as UsersIcon, LogOut, Bell, Search, Check } from 'lucide-react'
import useStoredState from '../../hooks/useStoredState.js'
import { seed } from '../../data.js'
import { apiBaseUrl } from '../../lib/api.js'
import { Brand, Modal } from './ui/ui.jsx'
import Login from '../(auth)/login/components/Login.jsx'
import Dashboard from '../dashboard/components/Dashboard.jsx'
import Monitoring from '../monitoring/components/Monitoring.jsx'
import Discrepancy from '../discrepancy/components/Discrepancy.jsx'
import MasterData from '../master/components/MasterData.jsx'
import Users from '../users/components/Users.jsx'

const titles = {
  dashboard: ['Dashboard Analitik', 'Periode data demo: Januari 2026'],
  monitoring: ['Monitoring PO', 'Data demo Januari 2026 — {n} Purchase Order'],
  discrepancy: ['Review Discrepancy', ''],
  master: ['Kelola Master Data', 'Manajemen supplier & katalog produk kopi'],
  users: ['Kelola User Staff', 'Manajemen akun & hak akses pengguna sistem'],
}

export default function App() {
  const [user, setUser, userLoaded] = useStoredState('ab-user', null)
  const [db, setDb] = useState(seed)
  const [dbLoaded, setDbLoaded] = useState(false)
  const [apiError, setApiError] = useState('')
  const dbRef = useRef(seed)
  const writeQueues = useRef({})
  const pathname = usePathname()
  const router = useRouter()
  const [q, setQ] = useState('')
  const [toast, setToast] = useState(null)
  const [bye, setBye] = useState(false)
  useEffect(() => { if (toast) { const t = setTimeout(() => setToast(null), 4000); return () => clearTimeout(t) } }, [toast])
  useEffect(() => {
    if (!userLoaded || !user) return
    let active = true
    fetch(`${apiBaseUrl}/data`, { credentials: 'include' })
      .then(async (response) => {
        if (response.status === 401) {
          setUser(null)
          throw new Error('Sesi berakhir. Silakan masuk kembali.')
        }
        if (!response.ok) throw new Error('Backend tidak dapat memuat data.')
        return response.json()
      })
      .then((data) => {
        if (!active) return
        dbRef.current = data
        setDb(data)
        setApiError('')
      })
      .catch(() => {
        if (active) setApiError('Backend tidak tersedia. Data demo hanya tersimpan sementara di browser.')
      })
      .finally(() => { if (active) setDbLoaded(true) })
    return () => { active = false }
  }, [setUser, user, userLoaded])
  const go = (p) => { router.push(p); window.scrollTo(0, 0) }
  const set = (key, value) => {
    const collection = typeof value === 'function' ? value(dbRef.current[key]) : value
    const next = { ...dbRef.current, [key]: collection }
    dbRef.current = next
    setDb(next)
    writeQueues.current[key] = (writeQueues.current[key] || Promise.resolve())
      .catch(() => {})
      .then(() => fetch(`${apiBaseUrl}/data/${key}`, {
        method: 'PUT',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(collection),
      }))
      .then(async (response) => {
        if (response.status === 401) {
          setUser(null)
          throw new Error('Sesi berakhir. Silakan masuk kembali.')
        }
        if (!response.ok) throw new Error('Perubahan gagal disimpan ke backend.')
        setApiError('')
      })
      .catch(() => setApiError('Perubahan belum tersimpan ke backend. Periksa server lalu muat ulang aplikasi.'))
  }
  const notify = (title, msg) => setToast({ title, msg, id: Date.now() })
  const logout = () => {
    fetch(`${apiBaseUrl}/auth/logout`, { method: 'POST', credentials: 'include' })
      .catch(() => {})
      .finally(() => { setDbLoaded(false); setUser(null); go('/') })
  }

  if (!userLoaded || (user && !dbLoaded)) {
    return <div className="app-loading" role="status" aria-label="Memuat aplikasi" />
  }

  if (!user) return <Login onLogin={(u) => { setDbLoaded(false); setUser(u); go('/dashboard') }} />

  const [, page = 'dashboard', sub] = pathname.split('/')
  const key = titles[page] ? page : 'dashboard'
  const open = db.discrepancies.filter((d) => !['Selesai', 'Ditutup'].includes(d.st)).length
  const c = { db, set, go, q, notify, user, open, sub }
  const nav = [['dashboard', 'Dashboard', LayoutDashboard, 0, 'Home'], ['monitoring', 'Monitoring PO', FileText, 0, 'PO'], ['discrepancy', 'Review Discrepancy', AlertTriangle, open, 'Review'], ['master', 'Master Data', Database, 0, 'Master'], ['users', 'Kelola User', UsersIcon, 0, 'User']]
  const [h, s] = titles[key]
  const Page = { dashboard: Dashboard, monitoring: Monitoring, discrepancy: Discrepancy, master: MasterData, users: Users }[key]

  return (
    <div className="app">
      <aside><Brand />
        <p className="sec">MENU UTAMA</p>
        {nav.slice(0, 3).map(([k, l, I, n, short]) => <a key={k} className={key === k ? 'on' : ''} aria-label={l} data-short={short} onClick={() => go('/' + k)}><I size={16} /><span className="nav-label">{l}</span>{n > 0 && <i className="count">{n}</i>}</a>)}
        <p className="sec">KONFIGURASI</p>
        {nav.slice(3).map(([k, l, I, , short]) => <a key={k} className={key === k ? 'on' : ''} aria-label={l} data-short={short} onClick={() => go('/' + k)}><I size={16} /><span className="nav-label">{l}</span></a>)}
        <a className="logout" aria-label="Keluar" data-short="Keluar" onClick={() => setBye(true)}><LogOut size={16} /><span className="nav-label">Keluar</span></a>
      </aside>
      <main>
        <header>
          <div><h1>{sub ? `${key === 'discrepancy' ? 'Review Discrepancy' : 'Monitoring PO'} / Detail ${sub}` : h}</h1><p>{s.replace('{nama}', user.nama).replace('{n}', db.pos.length)}</p></div>
          <div className="top"><div className="search"><Search size={14} /><input placeholder="Cari transaksi, supplier..." value={q} onChange={(e) => { setQ(e.target.value); if (key !== 'monitoring') go('/monitoring') }} /></div>
            <button className="icon bell" onClick={() => go('/discrepancy')}><Bell size={16} />{open > 0 && <i />}</button>
            <div className="me"><b>{user.nama}</b><small>{user.role === 'Manager' ? 'Purchasing Manager' : user.role}</small></div></div>
        </header>
        <section className="content page-transition" key={pathname}>
          {apiError && <div className="note warn" role="status">{apiError}</div>}
          {toast && <div key={toast.id} className="toast"><Check className="toast-check" size={16} /><div><b>{toast.title}</b><p>{toast.msg}</p></div><button onClick={() => setToast(null)}>×</button></div>}
          <Page c={c} />
        </section>
      </main>
      {bye && (
        <Modal title="Konfirmasi Keluar" sub="Anda akan keluar dari sesi ini. Semua pekerjaan yang belum disimpan akan tetap aman di sistem." onClose={() => setBye(false)} w={400}>
          <div className="mfoot"><button className="btn" onClick={() => setBye(false)}>Batal</button><button className="btn danger" onClick={() => { setBye(false); logout() }}>Ya, Keluar</button></div>
        </Modal>)}
    </div>
  )
}
