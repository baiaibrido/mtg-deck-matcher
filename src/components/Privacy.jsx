import { getLang } from '../i18n/index.js'

// Informativa privacy (art. 13 GDPR). In italiano e in inglese (le altre lingue vedono l'inglese).
const OWNER = 'Alberto Talini', MAIL = 'netdeckable@protonmail.com', UPDATED = { it: '21 ottobre 2026', en: '21 October 2026' }
const mail = <a href={`mailto:${MAIL}`}>{MAIL}</a>

const IT = <>
  <h1>Informativa sulla privacy</h1>
  <p className="pv-lead">Netdeckable è un sito gratuito e senza pubblicità, fatto da un appassionato. Qui trovi quali dati tratta, perché e come puoi controllarli.</p>
  <h2>Chi è il titolare</h2>
  <p>{OWNER}, privato cittadino. Per qualsiasi richiesta: {mail}.</p>
  <h2>Senza account</h2>
  <p>La collezione, i preferiti e le impostazioni (lingua, valuta, tema) restano solo nel tuo browser: non arrivano a noi. Per mostrare immagini e prezzi delle carte il browser le chiede direttamente a Scryfall (Scryfall LLC, Stati Uniti), che riceve il tuo indirizzo IP come ogni sito che visiti. Il sito è ospitato da Vercel Inc. (Stati Uniti), che registra dati tecnici delle visite come indirizzo IP e browser per farlo funzionare e proteggerlo.</p>
  <h2>Con il profilo</h2>
  <p>Se accedi (con Google o con un link via email) salviamo nel tuo profilo:</p>
  <ul>
    <li>l'indirizzo email e un codice che identifica l'account (se accedi con Google, Google ci passa anche nome e foto del profilo: non li usiamo);</li>
    <li>la tua collezione (carte, copie, stampa, foil) e la data dell'ultimo aggiornamento.</li>
  </ul>
  <p>Servono solo a farti ritrovare la collezione su tutti i tuoi dispositivi (base giuridica: il servizio che chiedi, art. 6.1.b GDPR). Non li vendiamo, non li usiamo per pubblicità e non li condividiamo con nessuno oltre ai fornitori qui sotto.</p>
  <h2>Fornitori</h2>
  <p>Accesso e salvataggio usano Google Firebase (Google): la collezione è conservata in data center europei; i dati di accesso possono essere trattati anche negli Stati Uniti. I trasferimenti fuori dall'Unione europea avvengono con le garanzie previste dal GDPR (clausole contrattuali standard o EU-U.S. Data Privacy Framework).</p>
  <h2>Per quanto tempo</h2>
  <p>Finché tieni il profilo. Con «Elimina il profilo» (nella pagina Collezione) cancelli subito account e collezione salvata online; la copia nel tuo browser resta finché non la svuoti tu.</p>
  <h2>I tuoi diritti</h2>
  <p>Puoi chiedere di vedere, correggere, cancellare o ricevere i tuoi dati (la collezione si scarica anche da sola con «Esporta»), opporti o limitarne l'uso, scrivendo a {mail}. Puoi anche presentare un reclamo al Garante per la protezione dei dati personali (<a href="https://www.garanteprivacy.it" target="_blank" rel="noreferrer">garanteprivacy.it</a>).</p>
  <h2>Età</h2>
  <p>Il profilo è riservato a chi ha almeno 14 anni.</p>
  <h2>Cookie</h2>
  <p>Niente cookie di profilazione né statistiche. Il sito usa solo la memoria del browser per le funzioni che chiedi (impostazioni, collezione, accesso al profilo): per queste non serve il consenso.</p>
  <p className="hint">Ultimo aggiornamento: {UPDATED.it}.</p>
</>

const EN = <>
  <h1>Privacy notice</h1>
  <p className="pv-lead">Netdeckable is a free, ad-free site made by a fan. This page explains what data it handles, why, and how you control it.</p>
  <h2>Who is responsible</h2>
  <p>{OWNER}, private individual (data controller). For any request: {mail}.</p>
  <h2>Without an account</h2>
  <p>Your collection, favourites and settings (language, currency, theme) stay in your browser only: they never reach us. To show card images and prices your browser asks Scryfall (Scryfall LLC, United States) directly, which receives your IP address like any site you visit. The site is hosted by Vercel Inc. (United States), which logs technical data such as IP address and browser to run and protect it.</p>
  <h2>With a profile</h2>
  <p>If you sign in (with Google or an email link) we store in your profile:</p>
  <ul>
    <li>your email address and an account identifier (with Google sign-in, Google also passes your profile name and photo: we don't use them);</li>
    <li>your collection (cards, copies, printing, foil) and the date of the last update.</li>
  </ul>
  <p>They are used only to give you your collection on all your devices (legal basis: the service you request, art. 6(1)(b) GDPR). We don't sell them, use them for advertising or share them with anyone beyond the providers below.</p>
  <h2>Providers</h2>
  <p>Sign-in and storage use Google Firebase (Google): your collection is stored in European data centres; sign-in data may also be processed in the United States. Transfers outside the European Union rely on GDPR safeguards (standard contractual clauses or the EU-U.S. Data Privacy Framework).</p>
  <h2>How long</h2>
  <p>As long as you keep your profile. «Delete profile» (on the Collection page) immediately erases your account and the collection stored online; the copy in your browser stays until you clear it.</p>
  <h2>Your rights</h2>
  <p>You can ask to access, correct, delete or receive your data (you can also download your collection yourself with «Export»), and to object to or restrict its use, by writing to {mail}. You can also lodge a complaint with your data protection authority (in Italy, the <a href="https://www.garanteprivacy.it" target="_blank" rel="noreferrer">Garante per la protezione dei dati personali</a>).</p>
  <h2>Age</h2>
  <p>Profiles are for people aged 14 or over.</p>
  <h2>Cookies</h2>
  <p>No tracking or analytics cookies. The site only uses browser storage for features you ask for (settings, collection, staying signed in), which needs no consent.</p>
  <p className="hint">Last updated: {UPDATED.en}.</p>
</>

export default function Privacy() {
  return <article className="privacy">{getLang() === 'it' ? IT : EN}</article>
}
