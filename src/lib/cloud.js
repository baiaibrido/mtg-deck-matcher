// Profilo su Firebase (caricato solo quando serve: chi non accede non scarica niente).
// Accesso con Google o con un link via email; la collezione sta in Firestore (Europa) nel documento users/<uid>.
// La configurazione non è segreta: la sicurezza la danno le regole di Firestore (docs/firestore.rules).
import { initializeApp } from 'firebase/app'
import {
  getAuth, onAuthStateChanged, GoogleAuthProvider, signInWithPopup, signInWithRedirect,
  sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink, signOut, deleteUser,
} from 'firebase/auth'
import { initializeFirestore, doc, onSnapshot, setDoc, deleteDoc, serverTimestamp } from 'firebase/firestore'

const app = initializeApp({
  apiKey: 'AIzaSyBFtVC_pYvzYNc26V-RwAkBqKyczrzqAl8',
  authDomain: 'netdeckable.firebaseapp.com',
  projectId: 'netdeckable',
  storageBucket: 'netdeckable.firebasestorage.app',
  messagingSenderId: '1010276578046',
  appId: '1:1010276578046:web:26b16734103cc509f36baf',
})
const auth = getAuth(app)
const db = initializeFirestore(app, { ignoreUndefinedProperties: true })
const userDoc = uid => doc(db, 'users', uid)

export const watchUser = cb => onAuthStateChanged(auth, u => cb(u ? { uid: u.uid, email: u.email } : null))

export async function signInGoogle(lang) {
  auth.languageCode = lang
  const provider = new GoogleAuthProvider()
  try { await signInWithPopup(auth, provider) }
  catch (e) {
    // finestra bloccata dal browser: si accede passando dalla pagina di Google
    if (e?.code === 'auth/popup-blocked') return signInWithRedirect(auth, provider)
    throw e
  }
}

export async function sendLink(email, lang) {
  auth.languageCode = lang
  await sendSignInLinkToEmail(auth, email, { url: `${location.origin}/collection`, handleCodeInApp: true })
}
export const isLink = href => isSignInWithEmailLink(auth, href)
export const finishLink = (email, href) => signInWithEmailLink(auth, email, href)

// cb(dati | null, scrittura ancora in viaggio da questo dispositivo)
export const watchCollection = (uid, cb, onError) =>
  onSnapshot(userDoc(uid), { includeMetadataChanges: false }, s => cb(s.exists() ? s.data() : null, s.metadata.hasPendingWrites), onError)

export const saveCollection = (uid, collection) => setDoc(userDoc(uid), { collection, updatedAt: serverTimestamp(), v: 1 })

export const logout = () => signOut(auth)

// Firebase elimina un account solo se l'accesso è recente (pochi minuti): lo controlliamo prima,
// così non si cancellano i dati lasciando in piedi l'account. Poi prima i dati, poi l'account.
export async function removeAccount() {
  const u = auth.currentUser
  if (!u) return
  if (Date.now() - new Date(u.metadata.lastSignInTime).getTime() > 4 * 60 * 1000) throw Object.assign(new Error('recent'), { code: 'auth/requires-recent-login' })
  await deleteDoc(userDoc(u.uid))
  await deleteUser(u)
}
