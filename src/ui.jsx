import { COLORS } from './games.config.js';
import { GameIcon } from './GameIcons.jsx';

export function Btn({ primary, full, sm, G, style, ...props }) {
  const { ghost, ...safeProps } = props;
  const base = { border:"none", borderRadius:10, cursor:"pointer", fontFamily:"inherit", fontWeight:600,
    fontSize: sm?".75rem":".85rem", padding: sm?"6px 14px":"11px 18px", width: full?"100%":"auto",
    transition:"opacity .15s, transform .1s" };
  const v = primary
    ? { background: G?.btnBg||"#c9933a", color: G?.btnColor||"#12100e" }
    : { background: G?.surface2||"#272320", border:`1px solid ${G?.border||"#3a342c"}`, color: G?.sub||"#8a7d6a" };
  return <button style={{...base,...v,...style}} {...safeProps}/>;
}

export function LimitCtrl({ value, onChange, G, min, max, step, label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      background:G.surface2, border:`1px solid ${G.border}`, borderRadius:10, padding:"10px 14px", marginBottom:14 }}>
      <span style={{ fontSize:".8rem", color:G.sub }}>{label}</span>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div role="button" tabIndex={0} aria-label="Diminuer" onClick={()=>onChange(Math.max(min,value-step))} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onChange(Math.max(min,value-step));}}}
          style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:6, width:36, height:36,
            display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", userSelect:"none" }}>−</div>
        <span style={{ fontFamily:"'Cinzel',serif", fontSize:"1.1rem", color:G.accent, minWidth:"3.5ch", textAlign:"center" }}>{value}</span>
        <div role="button" tabIndex={0} aria-label="Augmenter" onClick={()=>onChange(Math.min(max,value+step))} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onChange(Math.min(max,value+step));}}}
          style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:6, width:36, height:36,
            display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", userSelect:"none" }}>＋</div>
      </div>
    </div>
  );
}

export function PlayerEditRow({ name, index, onChange, onRemove, canRemove }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,.04)",
      border:"1px solid rgba(255,255,255,.08)", borderRadius:10, padding:"8px 10px", marginBottom:6 }}>
      <div style={{ width:10, height:10, borderRadius:"50%", background:COLORS[index%COLORS.length], flexShrink:0 }}/>
      <input type="text" placeholder={`Joueur ${index+1}`} maxLength={16} value={name}
        onChange={e=>onChange(e.target.value)}
        style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"inherit", fontFamily:"inherit", fontSize:".9rem" }}/>
      {canRemove && <button onClick={onRemove} aria-label="Retirer le joueur" style={{ background:"none", border:"none", color:"rgba(255,255,255,.4)", fontSize:"1.1rem", cursor:"pointer", width:36, height:36, flexShrink:0, display:"flex", alignItems:"center", justifyContent:"center" }}>✕</button>}
    </div>
  );
}

// ── BOTTOM SHEET ─────────────────────────────────────────────────────
// Conteneur d'overlay partagé : backdrop, poignée, header (titre + ✕), corps.
// Avec `G` : couleurs du thème du jeu ; sans : thème neutre sombre (GameSelector).
// Le children doit gérer son propre scroll (ex: { overflowY:"auto", flex:1 }).
export function BottomSheet({ title, onClose, children, maxHeight = "82%", zIndex = 10, G, headerExtra }) {
  const th = G
    ? { backdrop: "rgba(0,0,0,.82)", surface: G.surface, border: G.border, headerBorder: G.border,
        handle: G.border, title: G.accent, closeBg: G.surface2, closeBorder: G.border }
    : { backdrop: "rgba(0,0,0,.85)", surface: "#13121a", border: "rgba(255,255,255,.08)", headerBorder: "rgba(255,255,255,.07)",
        handle: "rgba(255,255,255,.15)", title: "#fff", closeBg: "rgba(255,255,255,.08)", closeBorder: "rgba(255,255,255,.1)" };
  return (
    <div onClick={e => { if (e.target === e.currentTarget) onClose(); }}
      style={{ position: "fixed", inset: 0, background: th.backdrop, display: "flex",
        flexDirection: "column", alignItems: "center", justifyContent: "flex-end", zIndex }}>
      <div style={{ background: th.surface, borderRadius: "20px 20px 0 0", border: `1px solid ${th.border}`,
        width: "100%", maxHeight, display: "flex", flexDirection: "column" }}>
        <div style={{ width: 36, height: 4, background: th.handle, borderRadius: 2, margin: "10px auto 8px", flexShrink: 0 }}/>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "0 16px 10px", flexShrink: 0, borderBottom: `1px solid ${th.headerBorder}`, gap: 8 }}>
          <span style={{ fontFamily: "'Cinzel',serif", fontSize: ".95rem", color: th.title }}>{title}</span>
          {headerExtra}
          <div onClick={onClose} aria-label="Fermer" role="button" tabIndex={0}
            onKeyDown={e => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onClose(); } }}
            style={{ background: th.closeBg, border: `1px solid ${th.closeBorder}`, borderRadius: 8, width: 40, height: 40,
              display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", flexShrink: 0 }}>✕</div>
        </div>
        {children}
      </div>
    </div>
  );
}

// ── GAME ENGINE ──────────────────────────────────────────────────────
export const MIN_PLAYERS = 2;

export function GIcon({ G, size = 22, style = {} }) {
  if (G.icon) {
    const iconName = G.icon.replace('game-icons:', '');
    return <GameIcon name={iconName} size={size} color={G.accent} style={style} />;
  }
  return <span style={style}>{G.emoji}</span>;
}
