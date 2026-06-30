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

// ── GAME ENGINE ──────────────────────────────────────────────────────
export const MIN_PLAYERS = 2;

export function GIcon({ G, size = 22, style = {} }) {
  if (G.icon) {
    const iconName = G.icon.replace('game-icons:', '');
    return <GameIcon name={iconName} size={size} color={G.accent} style={style} />;
  }
  return <span style={style}>{G.emoji}</span>;
}
