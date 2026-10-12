// Icone lineari 24px, colore = currentColor
const I = ({ d, size = 20, ...p }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" {...p}>{d}</svg>
)
export const IconDecks = p => <I {...p} d={<><rect x="7" y="3" width="12" height="16" rx="2" /><path d="M5 6.5v12A2.5 2.5 0 0 0 7.5 21H15" /></>} />
export const IconBox = p => <I {...p} d={<><path d="M3 7.5 12 3l9 4.5v9L12 21l-9-4.5z" /><path d="M3 7.5 12 12l9-4.5M12 12v9" /></>} />
export const IconBack = p => <I {...p} d={<path d="M15 5l-7 7 7 7" />} />
export const IconChevron = p => <I {...p} d={<path d="M9 5l7 7-7 7" />} />
export const IconCopy = p => <I {...p} d={<><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V6a2 2 0 0 1 2-2h9" /></>} />
export const IconCart = p => <I {...p} d={<><path d="M3 4h2l2.4 11h10.2L20 8H6.2" /><circle cx="9" cy="19.5" r="1.3" /><circle cx="17" cy="19.5" r="1.3" /></>} />
export const IconDownload = p => <I {...p} d={<><path d="M12 4v11m0 0-4.5-4.5M12 15l4.5-4.5" /><path d="M4 19h16" /></>} />
export const IconUpload = p => <I {...p} d={<><path d="M12 15V4m0 0L7.5 8.5M12 4l4.5 4.5" /><path d="M4 19h16" /></>} />
export const IconSearch = p => <I {...p} d={<><circle cx="11" cy="11" r="6.5" /><path d="m20 20-4.2-4.2" /></>} />
export const IconCheck = p => <I {...p} d={<path d="m5 12.5 4.5 4.5L19 7.5" />} />
export const IconExternal = p => <I {...p} d={<><path d="M14 4h6v6M20 4l-9 9" /><path d="M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5" /></>} />
export const IconPlus = p => <I {...p} d={<path d="M12 5v14M5 12h14" />} />
export const IconMinus = p => <I {...p} d={<path d="M5 12h14" />} />
export const IconWand = p => <I {...p} d={<><path d="m4 20 11-11M14 4l1 2 2 1-2 1-1 2-1-2-2-1 2-1zM19 11l.6 1.4L21 13l-1.4.6L19 15l-.6-1.4L17 13l1.4-.6z" /></>} />
