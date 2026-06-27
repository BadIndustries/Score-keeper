import { useRegisterSW } from 'virtual:pwa-register/react';

// Popup automatique : s'affiche quand une nouvelle version est prête.
export function UpdatePrompt() {
  const {
    needRefresh: [needRefresh, setNeedRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisteredSW(_swUrl, r) {
      // Vérifie périodiquement s'il y a une mise à jour (toutes les heures)
      if (r) setInterval(() => r.update(), 60 * 60 * 1000);
    },
  });

  if (!needRefresh) return null;

  return (
    <div style={{
      position: 'fixed',
      left: 12, right: 12,
      bottom: 'calc(env(safe-area-inset-bottom, 0px) + 16px)',
      zIndex: 9999,
      background: '#13121a',
      border: '1px solid rgba(255,255,255,.14)',
      borderRadius: 16,
      boxShadow: '0 8px 32px rgba(0,0,0,.55)',
      padding: '14px 16px',
      display: 'flex',
      alignItems: 'center',
      gap: 12,
      maxWidth: 460,
      margin: '0 auto',
      fontFamily: "'DM Sans',sans-serif",
      color: '#e8e8f0',
    }}>
      <span style={{ fontSize: '1.6rem', flexShrink: 0 }}>🚀</span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ fontWeight: 700, fontSize: '.9rem' }}>Nouvelle version disponible</div>
        <div style={{ fontSize: '.72rem', color: 'rgba(255,255,255,.45)', marginTop: 2 }}>
          Mets à jour pour profiter des dernières nouveautés.
        </div>
      </div>
      <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
        <button onClick={() => setNeedRefresh(false)}
          style={{ background: 'rgba(255,255,255,.08)', border: '1px solid rgba(255,255,255,.12)',
            borderRadius: 10, padding: '9px 12px', color: 'rgba(255,255,255,.6)',
            fontSize: '.8rem', fontFamily: 'inherit', cursor: 'pointer' }}>
          Plus tard
        </button>
        <button onClick={() => updateServiceWorker(true)}
          style={{ background: '#5eb8ff', border: 'none', borderRadius: 10, padding: '9px 14px',
            color: '#0a0a0f', fontWeight: 700, fontSize: '.8rem', fontFamily: 'inherit', cursor: 'pointer' }}>
          Mettre à jour
        </button>
      </div>
    </div>
  );
}
