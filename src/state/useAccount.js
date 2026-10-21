import { useEffect, useRef, useState } from 'react'
import { firstSync, fingerprint, mergeMax } from '../lib/sync.js'
import { getLang } from '../i18n/index.js'

// Profilo facoltativo: la collezione resta sempre anche nel browser (si usa senza account e senza rete);
// con l'accesso viene copiata nel profilo e tenuta uguale su tutti i dispositivi.
const FLAG = 'mdm.account' // c'è un accesso su questo dispositivo: Firebase si carica all'avvio
const LAST = 'mdm.cloudSync' // { uid, fp }: ultima collezione uguale tra dispositivo e profilo
const LINK_EMAIL = 'mdm.linkEmail' // email a cui è stato mandato il link di accesso
const read = k => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } }
const write = (k, v) => { try { v == null ? localStorage.removeItem(k) : localStorage.setItem(k, JSON.stringify(v)) } catch { /* archiviazione piena o bloccata */ } }
const linkInUrl = () => { const p = new URLSearchParams(location.search); return p.get('mode') === 'signIn' && p.has('oobCode') }
let cloudP = null
const loadCloud = () => (cloudP ||= import('../lib/cloud.js'))

export function useAccount({ collection, setCollection, toast, t }) {
  const [user, setUser] = useState(null)
  const [state, setState] = useState(() => (read(FLAG) || linkInUrl() ? 'loading' : 'out')) // out | loading | in
  const [sync, setSync] = useState('idle') // idle | saving | saved | offline | error
  const [conflict, setConflict] = useState(null) // { remote }: profilo e dispositivo diversi, decide l'utente
  const [needEmail, setNeedEmail] = useState(false) // link aperto su un altro dispositivo: serve l'email
  const [error, setError] = useState(null)
  const cloud = useRef(null), started = useRef(null)
  const synced = useRef(null) // impronta della collezione uguale al profilo (null: primo contatto da fare)
  const inflight = useRef(null) // impronta in salvataggio
  const coll = useRef(collection); coll.current = collection
  const uid = user?.uid

  const start = () => (started.current ||= (async () => {
    const c = cloud.current = await loadCloud()
    c.watchUser(u => {
      setUser(u); setState(u ? 'in' : 'out'); write(FLAG, u ? 1 : null)
      if (!u) { synced.current = null; setSync('idle') }
    })
    if (linkInUrl()) {
      const email = read(LINK_EMAIL)
      if (email) await completeLink(email)
      else setNeedEmail(true)
    }
    return c
  })())
  useEffect(() => { if (state === 'loading') start() }, [])

  const mark = (list, id) => { const fp = fingerprint(list); synced.current = fp; write(LAST, { uid: id, fp }); setSync('saved') }
  const apply = (list, id) => { mark(list, id); setCollection(list, { count: false }) }
  const save = async (list, id) => {
    const fp = fingerprint(list)
    inflight.current = fp
    setSync(navigator.onLine === false ? 'offline' : 'saving')
    try { await cloud.current.saveCollection(id, list); if (inflight.current === fp) inflight.current = null; mark(list, id) }
    catch { inflight.current = null; setSync('error') }
  }

  // collezione del profilo: primo contatto e poi le modifiche fatte su altri dispositivi
  useEffect(() => {
    if (!uid) return
    let first = true
    const off = cloud.current.watchCollection(uid, (data, pending) => {
      if (pending) return
      const remote = data?.collection ?? null
      if (first) {
        first = false
        const what = firstSync(coll.current, remote, uid, read(LAST))
        if (what === 'download') apply(remote, uid)
        else if (what === 'upload') save(coll.current, uid)
        else if (what === 'same') mark(remote ?? [], uid)
        else setConflict({ remote })
        return
      }
      if (!remote) return
      const rf = fingerprint(remote)
      if (rf === synced.current || rf === inflight.current) return // è la nostra
      if (fingerprint(coll.current) === synced.current) apply(remote, uid) // cambiata altrove, qui niente di nuovo
      else setConflict({ remote })
    }, () => setSync('error'))
    return off
  }, [uid])

  // modifiche fatte qui: salvate nel profilo poco dopo (una scrittura per una serie di clic)
  useEffect(() => {
    if (!uid || synced.current == null || conflict) return
    const fp = fingerprint(collection)
    if (fp === synced.current || fp === inflight.current) return
    setSync('saving')
    const id = setTimeout(() => save(collection, uid), 1200)
    return () => clearTimeout(id)
  }, [collection, uid, conflict])

  useEffect(() => { // senza rete il salvataggio aspetta: lo diciamo
    const on = () => setSync(s => (s === 'saving' && !navigator.onLine ? 'offline' : s === 'offline' && navigator.onLine ? 'saving' : s))
    addEventListener('online', on); addEventListener('offline', on)
    return () => { removeEventListener('online', on); removeEventListener('offline', on) }
  }, [])

  async function completeLink(email) {
    setError(null)
    try { await cloud.current.finishLink(email, location.href); write(LINK_EMAIL, null); setNeedEmail(false); toast(t('acc.welcome')) }
    catch { setError('link') }
    history.replaceState(history.state, '', location.pathname) // via il codice del link dall'indirizzo
  }

  return {
    state, user, sync, conflict, needEmail, error, setError,
    signInGoogle: async () => {
      setError(null)
      try { const c = await start(); await c.signInGoogle(getLang()); toast(t('acc.welcome')) }
      catch (e) { if (!['auth/popup-closed-by-user', 'auth/cancelled-popup-request'].includes(e?.code)) setError('signin') }
    },
    sendLink: async email => { setError(null); const c = await start(); await c.sendLink(email, getLang()); write(LINK_EMAIL, email) },
    completeLink: async email => { await start(); return completeLink(email) },
    signOut: async () => { await cloud.current?.logout() },
    remove: async () => {
      setError(null)
      try { await cloud.current.removeAccount(); write(LAST, null); toast(t('acc.deleted')) }
      catch (e) { setError(e?.code === 'auth/requires-recent-login' ? 'recent' : 'delete') }
    },
    resolve: choice => { // 'merge' | 'profile' | 'device'
      const remote = conflict?.remote || []
      setConflict(null)
      if (choice === 'profile') return apply(remote, uid)
      const list = choice === 'merge' ? mergeMax(remote, coll.current) : coll.current
      if (choice === 'merge') setCollection(list, { count: false })
      save(list, uid)
    },
  }
}
