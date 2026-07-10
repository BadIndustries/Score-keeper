import { useState } from "react";
import { GAMES, MEDALS, COLORS } from '../games.config.js';
import { loadGroups } from '../storage.js';
import { medalRank, filterByPeriod, computeHistoryStats } from '../gameLogic.js';
import { GIcon, PeriodChips } from '../ui.jsx';

const SUB = "rgba(255,255,255,.45)";
const BORDER = "rgba(255,255,255,.1)";
const SURFACE = "rgba(255,255,255,.05)";

function Chip({ sel, onClick, children }) {
  return (
    <div onClick={onClick}
      style={{ padding:"8px 13px", borderRadius:20, cursor:"pointer", userSelect:"none", whiteSpace:"nowrap",
        fontSize:".72rem", fontWeight:sel?700:400, display:"flex", alignItems:"center", gap:5, flexShrink:0,
        border:`1px solid ${sel?"#5eb8ff":BORDER}`, background:sel?"rgba(94,184,255,.14)":SURFACE,
        color:sel?"#5eb8ff":SUB, transition:"all .15s" }}>
      {children}
    </div>
  );
}

// Écran plein : historique global + stats, filtrables par période / jeu / groupe.
export function HistoryApp({ onBack }) {
  const [groups] = useState(() => loadGroups());
  const [tab, setTab] = useState("games");
  const [period, setPeriod] = useState("all");
  const [gameFilter, setGameFilter] = useState("all");
  const [groupFilter, setGroupFilter] = useState("all");

  const all = [];
  groups.forEach(grp => (grp.pastGames||[]).forEach(pg => all.push({ ...pg, groupName: grp.name, groupId: grp.id })));
  all.sort((a,b)=>new Date(b.date)-new Date(a.date));

  // Puces proposées : uniquement les jeux/groupes qui ont au moins une partie
  const gamesPresent = Object.keys(GAMES).filter(gid => all.some(pg => pg.gameId === gid));
  const groupsPresent = groups.filter(grp => (grp.pastGames||[]).length > 0);

  let entries = filterByPeriod(all, period);
  if (gameFilter !== "all") entries = entries.filter(pg => pg.gameId === gameFilter);
  if (groupFilter !== "all") entries = entries.filter(pg => pg.groupId === groupFilter);

  const stats = computeHistoryStats(entries);

  return (
    <div style={{ fontFamily:"'DM Sans',sans-serif", background:"#0a0a0f", color:"#e8e8f0",
      width:"100%", minHeight:"100vh", display:"flex", flexDirection:"column",
      backgroundImage:"radial-gradient(ellipse at 50% 0%,rgba(120,80,200,.12) 0%,transparent 55%)" }}>
      <style>{`*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}`}</style>

      {/* ── Header ── */}
      <div style={{ display:"flex", alignItems:"center", gap:10, flexShrink:0,
        paddingTop:"max(10px, env(safe-area-inset-top, 0px))", paddingBottom:8, paddingLeft:12, paddingRight:12,
        borderBottom:`1px solid ${BORDER}` }}>
        <div onClick={onBack} role="button" tabIndex={0}
          onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();onBack();}}}
          style={{ background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:8, width:40, height:40,
            display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", flexShrink:0 }}>←</div>
        <div style={{ fontFamily:"'Cinzel',serif", fontSize:"1.05rem", fontWeight:900, letterSpacing:".06em", flex:1 }}>
          📋 Historique & stats
        </div>
        {/* Onglets */}
        <div style={{ display:"flex", background:SURFACE, border:`1px solid ${BORDER}`, borderRadius:10, padding:3, gap:2 }}>
          {[["games","Parties"],["stats","Stats"]].map(([k,label])=>(
            <div key={k} onClick={()=>setTab(k)}
              style={{ padding:"7px 13px", borderRadius:8, cursor:"pointer", userSelect:"none", fontSize:".74rem",
                fontWeight:tab===k?700:400, background:tab===k?"rgba(94,184,255,.16)":"transparent",
                color:tab===k?"#5eb8ff":SUB }}>
              {label}
            </div>
          ))}
        </div>
      </div>

      {/* ── Filtres ── */}
      <PeriodChips value={period} onChange={setPeriod}/>
      <div style={{ display:"flex", gap:6, padding:"6px 14px 0", overflowX:"auto", flexShrink:0 }}>
        <Chip sel={gameFilter==="all"} onClick={()=>setGameFilter("all")}>Tous les jeux</Chip>
        {gamesPresent.map(gid=>(
          <Chip key={gid} sel={gameFilter===gid} onClick={()=>setGameFilter(gid)}>
            <GIcon G={GAMES[gid]} size={13}/>{GAMES[gid].label}
          </Chip>
        ))}
      </div>
      {groupsPresent.length > 1 && (
        <div style={{ display:"flex", gap:6, padding:"6px 14px 0", overflowX:"auto", flexShrink:0 }}>
          <Chip sel={groupFilter==="all"} onClick={()=>setGroupFilter("all")}>Tous les groupes</Chip>
          {groupsPresent.map(grp=>(
            <Chip key={grp.id} sel={groupFilter===grp.id} onClick={()=>setGroupFilter(grp.id)}>👥 {grp.name}</Chip>
          ))}
        </div>
      )}
      <div style={{ fontSize:".62rem", color:SUB, padding:"8px 16px 4px", flexShrink:0 }}>
        {entries.length} partie{entries.length>1?"s":""}
        {(period!=="all"||gameFilter!=="all"||groupFilter!=="all")?" avec ces filtres":""}
      </div>

      {/* ── Contenu ── */}
      <div style={{ flex:1, overflowY:"auto", padding:"4px 14px calc(env(safe-area-inset-bottom, 0px) + 24px)" }}>
        {entries.length===0 && (
          <div style={{ color:SUB, textAlign:"center", padding:40, fontSize:".85rem" }}>
            Aucune partie avec ces filtres
          </div>
        )}

        {/* Onglet Parties */}
        {tab==="games" && entries.map((pg,i)=>{
          const pgGame = GAMES[pg.gameId];
          const ds = new Date(pg.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
          const sorted = [...pg.scores].sort((a,b)=> pgGame?.winMode==="lowest" ? a.score-b.score : b.score-a.score);
          const pgTotals = pg.scores.map(x=>x.score);
          return (
            <div key={i} style={{ padding:"11px 0", borderBottom:"1px solid rgba(255,255,255,.05)",
              display:"flex", alignItems:"flex-start", gap:10 }}>
              <div style={{ flexShrink:0, marginTop:3, width:28, display:"flex", justifyContent:"center" }}>
                {pgGame ? <GIcon G={pgGame} size={24}/> : <span style={{fontSize:"1.3rem"}}>🎮</span>}
              </div>
              <div style={{ flex:1, minWidth:0 }}>
                <div style={{ display:"flex", alignItems:"center", gap:6, flexWrap:"wrap" }}>
                  <span style={{ fontFamily:"'Cinzel',serif", fontSize:".82rem", fontWeight:700,
                    color:pgGame?.accent||"#fff" }}>{pgGame?.label||pg.gameId}</span>
                  <span style={{ fontSize:".6rem", color:"rgba(255,255,255,.3)", background:SURFACE,
                    borderRadius:4, padding:"2px 6px" }}>{pg.groupName}</span>
                </div>
                <div style={{ fontSize:".76rem", color:"#e8e8f0", marginTop:3 }}>🏆 {pg.winner}</div>
                <div style={{ fontSize:".63rem", color:"rgba(255,255,255,.35)", lineHeight:1.6, marginTop:1 }}>
                  {pg.coop
                    ? `Campagne réussie en équipe`
                    : sorted.map(s=>`${MEDALS[medalRank(s.score, pgTotals, pgGame?.winMode)]} ${s.name} ${s.score}pts`).join(" · ")}
                </div>
              </div>
              <div style={{ flexShrink:0, textAlign:"right" }}>
                <div style={{ fontSize:".6rem", color:"rgba(255,255,255,.3)" }}>{ds}</div>
                <div style={{ fontSize:".58rem", color:"rgba(255,255,255,.2)" }}>
                  {pg.rounds} {pg.roundsLabel||"tour"}{pg.rounds>1?"s":""}</div>
              </div>
            </div>
          );
        })}

        {/* Onglet Stats */}
        {tab==="stats" && entries.length>0 && (
          <>
            <table style={{ width:"100%", borderCollapse:"collapse", fontSize:".78rem", marginBottom:20, marginTop:4 }}>
              <thead><tr>
                {["JOUEUR","PARTIES","🏆","VICTOIRES"].map((h,hi)=>(
                  <th key={h} style={{ color:SUB, fontWeight:400, padding:"5px 6px", fontSize:".58rem",
                    letterSpacing:".1em", borderBottom:`1px solid ${BORDER}`, textAlign:hi===0?"left":"center" }}>{h}</th>
                ))}
              </tr></thead>
              <tbody>
                {stats.map((st,si)=>(
                  <tr key={st.name}>
                    <td style={{ padding:"8px 6px", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ width:8, height:8, borderRadius:"50%", background:COLORS[si%COLORS.length], flexShrink:0 }}/>
                        <span style={{ fontFamily:"'Cinzel',serif", fontSize:".82rem", fontWeight:700 }}>{st.name}</span>
                      </div>
                    </td>
                    <td style={{ padding:"8px 6px", borderBottom:"1px solid rgba(255,255,255,.05)", textAlign:"center", color:SUB }}>{st.games}</td>
                    <td style={{ padding:"8px 6px", borderBottom:"1px solid rgba(255,255,255,.05)", textAlign:"center",
                      color:"#5eb8ff", fontWeight:700, fontFamily:"'Cinzel',serif" }}>{st.wins}</td>
                    <td style={{ padding:"8px 6px", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                      <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                        <div style={{ flex:1, height:4, background:SURFACE, borderRadius:2, overflow:"hidden" }}>
                          <div style={{ height:"100%", borderRadius:2, width:`${st.pct}%`, background:"#5eb8ff", transition:"width .3s" }}/>
                        </div>
                        <span style={{ fontSize:".7rem", minWidth:"3.5ch", textAlign:"right" }}>{st.pct}%</span>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            {/* Détail par jeu (masqué si un seul jeu filtré) */}
            {gameFilter==="all" && gamesPresent.map(gid=>{
              const Gx=GAMES[gid];
              const gh=entries.filter(pg=>pg.gameId===gid);
              if(!gh.length) return null;
              const gs=computeHistoryStats(gh);
              return (
                <div key={gid} style={{ marginBottom:16 }}>
                  <div style={{ fontSize:".6rem", letterSpacing:".15em", textTransform:"uppercase",
                    color:SUB, marginBottom:6, display:"flex", alignItems:"center", gap:5 }}>
                    <GIcon G={Gx} size={14}/><span>{Gx.label}</span>
                    <span style={{ opacity:.5 }}>({gh.length} partie{gh.length>1?"s":""})</span>
                  </div>
                  {gs.map(st=>{
                    const scores=gh.flatMap(pg=>(pg.scores||[]).filter(s=>s.name===st.name).map(s=>s.score));
                    const avg=Math.round(scores.reduce((a,b)=>a+b,0)/scores.length);
                    return (
                      <div key={st.name} style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
                        padding:"6px 2px", borderBottom:"1px solid rgba(255,255,255,.05)" }}>
                        <span style={{ fontSize:".78rem", fontWeight:600 }}>{st.name}</span>
                        <div style={{ display:"flex", gap:14, fontSize:".7rem", color:SUB }}>
                          <span><strong style={{ color:"#5eb8ff" }}>{st.wins}</strong> 🏆</span>
                          <span>moy. <strong style={{ color:"#e8e8f0" }}>{avg}</strong> {Gx.coop?"essais":"pts"}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </>
        )}
      </div>
    </div>
  );
}
