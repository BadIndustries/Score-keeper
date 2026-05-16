import { useState, useCallback, useEffect, useRef } from "react";
import { GAMES, COLORS, MEDALS, genId, DEFAULT_LIMITS, KEY_GROUPS } from './games.config.js';
import { loadData, saveGroups, saveActiveGame, loadGroups } from './storage.js';
import { makeActiveGame } from './gameLogic.js';

// ── SHARED UI ────────────────────────────────────────────────────────
function Btn({ primary, full, sm, G, style, ...props }) {
  const { ghost, ...safeProps } = props;
  const base = { border:"none", borderRadius:10, cursor:"pointer", fontFamily:"inherit", fontWeight:600,
    fontSize: sm?".75rem":".85rem", padding: sm?"6px 14px":"11px 18px", width: full?"100%":"auto",
    transition:"opacity .15s, transform .1s" };
  const v = primary
    ? { background: G?.btnBg||"#c9933a", color: G?.btnColor||"#12100e" }
    : { background: G?.surface2||"#272320", border:`1px solid ${G?.border||"#3a342c"}`, color: G?.sub||"#8a7d6a" };
  return <button style={{...base,...v,...style}} {...safeProps}/>;
}

function LimitCtrl({ value, onChange, G, min, max, step, label }) {
  return (
    <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between",
      background:G.surface2, border:`1px solid ${G.border}`, borderRadius:10, padding:"10px 14px", marginBottom:14 }}>
      <span style={{ fontSize:".8rem", color:G.sub }}>{label}</span>
      <div style={{ display:"flex", alignItems:"center", gap:10 }}>
        <div onClick={()=>onChange(Math.max(min,value-step))}
          style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:6, width:28, height:28,
            display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", userSelect:"none" }}>−</div>
        <span style={{ fontFamily:"'Cinzel',serif", fontSize:"1.1rem", color:G.accent, minWidth:"3.5ch", textAlign:"center" }}>{value}</span>
        <div onClick={()=>onChange(Math.min(max,value+step))}
          style={{ background:G.surface, border:`1px solid ${G.border}`, borderRadius:6, width:28, height:28,
            display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer", userSelect:"none" }}>＋</div>
      </div>
    </div>
  );
}

function PlayerEditRow({ name, index, onChange, onRemove, canRemove }) {
  return (
    <div style={{ display:"flex", alignItems:"center", gap:8, background:"rgba(255,255,255,.04)",
      border:"1px solid rgba(255,255,255,.08)", borderRadius:10, padding:"8px 10px", marginBottom:6 }}>
      <div style={{ width:10, height:10, borderRadius:"50%", background:COLORS[index%COLORS.length], flexShrink:0 }}/>
      <input type="text" placeholder={`Joueur ${index+1}`} maxLength={16} value={name}
        onChange={e=>onChange(e.target.value)}
        style={{ flex:1, background:"transparent", border:"none", outline:"none", color:"inherit", fontFamily:"inherit", fontSize:".9rem" }}/>
      {canRemove && <button onClick={onRemove} style={{ background:"none", border:"none", color:"rgba(255,255,255,.3)", fontSize:"1.1rem", cursor:"pointer", padding:2 }}>✕</button>}
    </div>
  );
}

// ── GAME ENGINE ──────────────────────────────────────────────────────
function GameApp({ gameId, onBack }) {
  const G = GAMES[gameId];
  const [data, setData] = useState(()=>loadData(gameId));
  const [screen, setScreen] = useState("home");
  const [sheet, setSheet] = useState(null);
  const [showWin, setShowWin] = useState(false);
  const [toast, setToast] = useState(false);
  const [editState, setEditState] = useState(null);
  const [quickState, setQuickState] = useState(null);
  const [pastGroupId, setPastGroupId] = useState(null);
  const [directEdit, setDirectEdit]   = useState(null);
  const [directVal,  setDirectVal]    = useState("");
  const [statsGrpId, setStatsGrpId]   = useState(null);

  const persist = useCallback((next) => {
    saveGroups(next.groups);
    saveActiveGame(gameId, next.activeGame);
    setToast(true); setTimeout(()=>setToast(false), 1600);
  }, [gameId]);

  const update = useCallback((fn) => {
    setData(prev => { const next=fn(JSON.parse(JSON.stringify(prev))); persist(next); return next; });
  }, [persist]);

  const g = data.activeGame;
  const gameGroupName = g?.groupId ? (data.groups.find(x=>x.id===g.groupId)?.name||G.label) : "Partie rapide";

  const S = {
    root: { fontFamily:"'DM Sans',sans-serif", background:G.bg, color:G.text, width:"100%", minHeight:"100vh",
      display:"flex", flexDirection:"column", position:"relative",
      backgroundImage:`radial-gradient(ellipse at 50% 0%,${G.colorDim} 0%,transparent 55%)` },
    topBar: { display:"flex", alignItems:"center", justifyContent:"space-between",
      padding:"14px 16px 0",
      paddingTop:"max(14px, env(safe-area-inset-top, 0px))" },
    card: { background:G.surface, border:`1px solid ${G.border}`, borderRadius:14, padding:"14px 16px", marginBottom:12 },
  };

  const DEFAULT_LIMITS = G.limits || {};
  function getGroupLimit(grp){ return grp.limits?.[G.limitKey]??G.defaultLimit; }

  function startGroupGame(groupId) {
    if (data.activeGame?.groupId===groupId) {
      if (window.confirm("Une partie est en cours. La reprendre ?")) { setScreen("game"); return; }
    }
    const grp = data.groups.find(x=>x.id===groupId);
    const limit = getGroupLimit(grp);
    update(a => {
      a.activeGame = makeActiveGame(gameId, groupId, [...grp.players], limit);
      return a;
    });
    setScreen("game");
  }

  function openEditGroup(id) {
    const grp = id ? data.groups.find(x=>x.id===id) : null;
    setEditState({
      id,
      name: grp?.name||"",
      players: grp ? [...grp.players] : ["",""],
      limits: grp?.limits ? {...grp.limits} : {...DEFAULT_LIMITS},
    });
    setScreen("editGroup");
  }
  function saveGroup() {
    const {id,name,players,limits}=editState;
    const n=name.trim(); if(!n){alert("Donne un nom au groupe !");return;}
    const pl=players.map(p=>p.trim()).filter(p=>p.length>0); if(pl.length<2){alert("Il faut au moins 2 joueurs !");return;}
    update(a=>{
      if(id){
        const grp=a.groups.find(x=>x.id===id);
        grp.name=n; grp.players=pl; grp.limits=limits;
      } else {
        a.groups.push({id:genId(),name:n,players:pl,limits:{...limits},pastGames:[]});
      }
      return a;
    });
    setScreen("home");
  }
  function deleteGroup() {
    if(!window.confirm("Supprimer ce groupe ?"))return;
    update(a=>{a.groups=a.groups.filter(g=>g.id!==editState.id);return a;});
    setScreen("home");
  }

  function openQuickSetup(){setQuickState({players:["",""],limit:G.defaultLimit});setScreen("quickSetup");}
  function startQuickGame(){
    const players=quickState.players.map(p=>p.trim()).filter(p=>p.length>0);
    if(players.length<2){alert("Il faut au moins 2 joueurs !");return;}
    update(a=>{
      a.activeGame = makeActiveGame(gameId, null, players, quickState.limit);
      return a;
    });
    setScreen("game");
  }

  function nextTour(){
    update(a=>{
      const minVal = gameId==="skyjo" ? -99 : 0;
      a.activeGame.totals=a.activeGame.totals.map((t,i)=>t+a.activeGame.current[i]);
      a.activeGame.history.push([...a.activeGame.current]);
      a.activeGame.current=a.activeGame.current.map(()=>0);
      if(gameId==="flip7") a.activeGame.flip7=a.activeGame.flip7.map(()=>false);
      if(gameId==="skyjo") a.activeGame.doubled=a.activeGame.doubled.map(()=>false);
      const lim=a.activeGame.limit;
      const dominated=a.activeGame.totals.some(t=>G.winMode==="lowest"?t>=lim:t>=lim);
      if(dominated){ setShowWin(true); recordGame(a); }
      else { a.activeGame.tour+=1; if(gameId==="skyjo"||gameId==="flip7"){ a.activeGame.manche+=1; } }
      return a;
    });
  }

  function recordGame(a){
    if(!a.activeGame?.groupId) return;
    const grp=a.groups.find(g=>g.id===a.activeGame.groupId);
    if(!grp) return;
    grp.pastGames=grp.pastGames||[];
    const ranked=[...a.activeGame.players.map((name,i)=>({name,score:a.activeGame.totals[i]}))];
    ranked.sort((x,y)=>G.winMode==="lowest"?x.score-y.score:y.score-x.score);
    grp.pastGames.unshift({
      gameId, date:new Date().toISOString(),
      winner:ranked[0].name,
      scores:a.activeGame.players.map((name,i)=>({name,score:a.activeGame.totals[i]})),
      tours:a.activeGame.tour,
    });
    if(grp.pastGames.length>50) grp.pastGames=grp.pastGames.slice(0,50);
  }

  function rejouer(){
    if(!g)return;
    const{groupId,players,limit}=g;
    setShowWin(false);
    update(a=>{
      a.activeGame = makeActiveGame(gameId, groupId, [...players], limit);
      return a;
    });
    setScreen("game");
  }

  function goHome(){setShowWin(false);setSheet(null);setScreen("home");}

  function applyDirect(i) {
    const v = parseInt(directVal, 10);
    if (!isNaN(v)) {
      update(a => {
        const minVal = gameId==="skyjo" ? -99 : 0;
        a.activeGame.current[i] = Math.max(minVal, v);
        return a;
      });
    }
    setDirectEdit(null); setDirectVal("");
  }

  function shareResult() {
    if (!g) return;
    const ranked = [...g.players.map((name,i)=>({name,score:g.totals[i]}))];
    ranked.sort((a,b)=>G.winMode==="lowest"?a.score-b.score:b.score-a.score);
    const text = `${G.emoji} ${G.label} — ${ranked[0].name} gagne !\n`
      + ranked.map((r,idx)=>`${MEDALS[idx]} ${r.name}: ${r.score}pts`).join("\n")
      + `\n${roundNum} ${roundLabel.toLowerCase()}${roundNum>1?"s":""}`;
    if (navigator.share) {
      navigator.share({ title: G.label, text }).catch(()=>{});
    } else {
      navigator.clipboard?.writeText(text);
    }
  }

  function adjustScore(i,d){
    setData(prev => {
      const minVal = gameId==="skyjo" ? -99 : 0;
      const newCurrent = [...prev.activeGame.current];
      newCurrent[i] = Math.max(minVal, newCurrent[i] + d);
      const next = { ...prev, activeGame: { ...prev.activeGame, current: newCurrent } };
      persist(next);
      return next;
    });
  }
  function toggleFlip7(i){ update(a=>{a.activeGame.flip7[i]=!a.activeGame.flip7[i];return a;}); }
  function toggleDouble(i){ update(a=>{a.activeGame.doubled[i]=!a.activeGame.doubled[i];return a;}); }

  function getRankIcon(idx){
    if(!g) return "";
    const sorted=[...g.totals].sort((a,b)=>G.winMode==="lowest"?a-b:b-a);
    return["🥇","🥈","🥉","","",""][sorted.indexOf(g.totals[idx])]||"";
  }

  const roundNum = g?.history?.length ?? 0;
  const roundLabel = gameId==="skyjo"||gameId==="flip7" ? "manche" : "tour";

  // ── STATS SCREEN ───────────────────────────────────────────────────
  if(screen==="stats") {
    const grp = data.groups.find(x=>x.id===statsGrpId);
    const past = grp?.pastGames||[];
    const allPlayers = [...new Set(past.flatMap(p=>p.scores.map(s=>s.name)))];
    const stats = allPlayers.map(name=>{
      const games = past.filter(p=>p.scores.some(s=>s.name===name));
      const wins = past.filter(p=>p.winner===name).length;
      const scores = games.flatMap(p=>p.scores.filter(s=>s.name===name).map(s=>s.score));
      const avg = scores.length ? Math.round(scores.reduce((a,b)=>a+b,0)/scores.length) : 0;
      return {name, games:games.length, wins, avg, winRate:games.length?Math.round(wins/games.length*100):0};
    }).sort((a,b)=>b.winRate-a.winRate||b.wins-a.wins);
    return (
      <div style={S.root}>
        <div style={S.topBar}>
          <Btn G={G} sm onClick={()=>setScreen("home")}>← Retour</Btn>
          <span style={{fontSize:".85rem",color:G.sub}}>Statistiques — {grp?.name}</span>
          <div style={{width:60}}/>
        </div>
        <div style={{padding:"16px",maxWidth:500,margin:"0 auto",width:"100%"}}>
          {stats.length===0 && <p style={{color:G.sub,textAlign:"center"}}>Aucune partie enregistrée.</p>}
          {stats.map((s,i)=>(
            <div key={s.name} style={{...S.card,display:"flex",alignItems:"center",gap:12}}>
              <span style={{fontSize:"1.4rem"}}>{MEDALS[i]||"  "}</span>
              <div style={{flex:1}}>
                <div style={{fontWeight:700}}>{s.name}</div>
                <div style={{fontSize:".78rem",color:G.sub}}>{s.wins} victoire{s.wins!==1?"s":""} / {s.games} partie{s.games!==1?"s":""} · moy. {s.avg}pts</div>
              </div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.1rem",color:G.accent}}>{s.winRate}%</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── HISTORY ────────────────────────────────────────────────────────
  if(screen==="history"){
    const grp=data.groups.find(x=>x.id===pastGroupId);
    const past=grp?.pastGames||[];
    return(
      <div style={S.root}>
        <div style={S.topBar}>
          <Btn G={G} sm onClick={()=>setScreen("home")}>← Retour</Btn>
          <span style={{fontSize:".85rem",color:G.sub}}>Historique — {grp?.name}</span>
          <div style={{width:60}}/>
        </div>
        <div style={{padding:"16px",maxWidth:500,margin:"0 auto",width:"100%"}}>
          {past.length===0&&<p style={{color:G.sub,textAlign:"center"}}>Aucune partie enregistrée.</p>}
          {past.map((p,i)=>(
            <div key={i} style={S.card}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                <span style={{fontWeight:700}}>{MEDALS[0]} {p.winner}</span>
                <span style={{fontSize:".75rem",color:G.sub}}>{new Date(p.date).toLocaleDateString("fr-FR")}</span>
              </div>
              {p.scores.sort((a,b)=>G.winMode==="lowest"?a.score-b.score:b.score-a.score).map((s,j)=>(
                <div key={j} style={{display:"flex",justifyContent:"space-between",
                  fontSize:".82rem",color:j===0?G.accent:G.sub,padding:"2px 0"}}>
                  <span>{s.name}</span><span>{s.score} pts</span>
                </div>
              ))}
              <div style={{fontSize:".72rem",color:G.sub,marginTop:4}}>{p.tours} {roundLabel}{p.tours!==1?"s":""}</div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ── EDIT GROUP ────────────────────────────────────────────────────
  if(screen==="editGroup"&&editState){
    return (
      <div style={S.root}>
        <div style={S.topBar}>
          <Btn G={G} sm onClick={()=>setScreen("home")}>← Retour</Btn>
          <span style={{fontSize:".85rem",color:G.sub}}>{editState.id?"Modifier":"Nouveau"} groupe</span>
          <div style={{width:60}}/>
        </div>
        <div style={{padding:"16px",maxWidth:420,margin:"0 auto",width:"100%"}}>
          <div style={{marginBottom:12}}>
            <input placeholder="Nom du groupe" maxLength={32} value={editState.name}
              onChange={e=>setEditState(s=>({...s,name:e.target.value}))}
              style={{width:"100%",boxSizing:"border-box",background:G.surface,border:`1px solid ${G.border}`,
                borderRadius:10,padding:"10px 14px",color:G.text,fontFamily:"inherit",fontSize:".9rem",outline:"none"}}/>
          </div>
          <div style={{marginBottom:8}}>
            {editState.players.map((p,i)=>(
              <PlayerEditRow key={i} name={p} index={i}
                onChange={v=>setEditState(s=>{const pl=[...s.players];pl[i]=v;return{...s,players:pl};})}
                onRemove={()=>setEditState(s=>{const pl=s.players.filter((_,j)=>j!==i);return{...s,players:pl};})}
                canRemove={editState.players.length>2}/>
            ))}
          </div>
          {editState.players.length<8&&(
            <Btn G={G} full sm style={{marginBottom:16}}
              onClick={()=>setEditState(s=>({...s,players:[...s.players,""]}))}>+ Joueur</Btn>
          )}
          <div style={{marginBottom:16}}>
            <div style={{fontSize:".8rem",color:G.sub,marginBottom:8}}>Limite de score par défaut</div>
            {Object.entries(G.limits||{}).map(([key,def])=>(
              <LimitCtrl key={key} G={G}
                label={G.limitLabels?.[key]||key}
                value={editState.limits[key]??def}
                min={G.limitMin?.[key]??10} max={G.limitMax?.[key]??500} step={G.limitStep?.[key]??5}
                onChange={v=>setEditState(s=>({...s,limits:{...s.limits,[key]:v}}))}/>
            ))}
          </div>
          <Btn G={G} primary full style={{marginBottom:8}} onClick={saveGroup}>
            {editState.id?"Enregistrer":"Créer le groupe"}
          </Btn>
          {editState.id&&<Btn G={G} full style={{color:"#e05"}} onClick={deleteGroup}>Supprimer le groupe</Btn>}
        </div>
      </div>
    );
  }

  // ── QUICK SETUP ───────────────────────────────────────────────────
  if(screen==="quickSetup"&&quickState){
    return (
      <div style={S.root}>
        <div style={S.topBar}>
          <Btn G={G} sm onClick={()=>setScreen("home")}>← Retour</Btn>
          <span style={{fontSize:".85rem",color:G.sub}}>Partie rapide</span>
          <div style={{width:60}}/>
        </div>
        <div style={{padding:"16px",maxWidth:420,margin:"0 auto",width:"100%"}}>
          <div style={{marginBottom:8}}>
            {quickState.players.map((p,i)=>(
              <PlayerEditRow key={i} name={p} index={i}
                onChange={v=>setQuickState(s=>{const pl=[...s.players];pl[i]=v;return{...s,players:pl};})}
                onRemove={()=>setQuickState(s=>{const pl=s.players.filter((_,j)=>j!==i);return{...s,players:pl};})}
                canRemove={quickState.players.length>2}/>
            ))}
          </div>
          {quickState.players.length<8&&(
            <Btn G={G} full sm style={{marginBottom:16}}
              onClick={()=>setQuickState(s=>({...s,players:[...s.players,""]}))}>+ Joueur</Btn>
          )}
          <div style={{marginBottom:16}}>
            {Object.entries(G.limits||{}).map(([key,def])=>(
              <LimitCtrl key={key} G={G}
                label={G.limitLabels?.[key]||key}
                value={quickState.limit??def}
                min={G.limitMin?.[key]??10} max={G.limitMax?.[key]??500} step={G.limitStep?.[key]??5}
                onChange={v=>setQuickState(s=>({...s,limit:v}))}/>
            ))}
          </div>
          <Btn G={G} primary G={G} style={{flex:1}} onClick={startQuickGame}>{G.emoji} Commencer</Btn>
        </div>
      </div>
    );
  }

  // ── HOME ─────────────────────────────────────────────────────────
  if(screen==="home"){
    return (
      <div style={S.root}>
        <div style={S.topBar}>
          <Btn G={G} sm onClick={onBack}>← Jeux</Btn>
          <span style={{fontFamily:"'Cinzel',serif",fontSize:"1rem",color:G.accent}}>{G.emoji} {G.label}</span>
          <div style={{width:60}}/>
        </div>
        <div style={{padding:"16px",maxWidth:500,margin:"0 auto",width:"100%"}}>

          {g && (
            <div style={{...S.card, border:`1px solid ${G.accent}40`, marginBottom:16, cursor:"pointer"}}
              onClick={()=>setScreen("game")}>
              <div style={{fontSize:".72rem",color:G.sub,marginBottom:4}}>Partie en cours</div>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                <span style={{fontWeight:700}}>{gameGroupName}</span>
                <span style={{fontSize:".8rem",color:G.accent}}>Reprendre →</span>
              </div>
              <div style={{fontSize:".78rem",color:G.sub,marginTop:4}}>
                {g.players.join(", ")} · {roundNum} {roundLabel}{roundNum!==1?"s":""}
              </div>
            </div>
          )}

          <div style={{marginBottom:12}}>
            {data.groups.map(grp=>(
              <div key={grp.id} onClick={()=>startGroupGame(grp.id)}
                style={{...S.card, cursor:"pointer", display:"flex", alignItems:"center", justifyContent:"space-between"}}>
                <div>
                  <div style={{fontWeight:700}}>{grp.name}</div>
                  <div style={{fontSize:".78rem",color:G.sub}}>{grp.players.join(", ")}</div>
                </div>
                <div style={{display:"flex",gap:8}}>
                  <Btn G={G} sm onClick={e=>{e.stopPropagation();setPastGroupId(grp.id);setScreen("history");}}>📋</Btn>
                  <Btn G={G} sm onClick={e=>{e.stopPropagation();setStatsGrpId(grp.id);setScreen("stats");}}>📊</Btn>
                  <Btn G={G} sm onClick={e=>{e.stopPropagation();openEditGroup(grp.id);}}>✏️</Btn>
                </div>
              </div>
            ))}
          </div>

          <div style={{display:"flex",gap:8,marginBottom:8}}>
            <Btn G={G} primary G={G} style={{flex:1}} onClick={openQuickSetup}>{G.emoji} Partie rapide</Btn>
            <Btn G={G} style={{flex:1}} onClick={()=>openEditGroup(null)}>+ Groupe</Btn>
          </div>
        </div>
      </div>
    );
  }

  // ── GAME SCREEN ──────────────────────────────────────────────────
  if(!g) return null;
  const isWin = showWin;

  return (
    <div style={S.root}>
      {/* Toast */}
      <div style={{position:"fixed",top:16,right:16,background:G.accent,color:G.bg,padding:"6px 14px",
        borderRadius:20,fontSize:".8rem",fontWeight:600,zIndex:999,
        opacity:toast?1:0,transition:"opacity .3s",pointerEvents:"none"}}>Sauvegardé</div>

      {/* Win overlay */}
      {isWin && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",zIndex:100,
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:24}}>
          <div style={{fontSize:"3rem",marginBottom:12}}>🏆</div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.6rem",color:G.accent,marginBottom:4,textAlign:"center"}}>
            {(() => {
              const ranked=[...g.players.map((name,i)=>({name,score:g.totals[i]}))];
              ranked.sort((a,b)=>G.winMode==="lowest"?a.score-b.score:b.score-a.score);
              return ranked[0].name;
            })()} gagne !
          </div>
          <div style={{color:G.sub,fontSize:".82rem",marginBottom:18}}>Partie terminée en {roundNum} {roundLabel.toLowerCase()}{roundNum>1?"s":""}</div>
          <div style={{display:"flex",flexDirection:"column",gap:7,width:"100%",maxWidth:300,marginBottom:28}}>
            {(() => {
              const ranked=[...g.players.map((name,i)=>({name,score:g.totals[i]}))];
              ranked.sort((a,b)=>G.winMode==="lowest"?a.score-b.score:b.score-a.score);
              return ranked.map((r,idx)=>(
                <div key={idx} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                  background:G.surface,borderRadius:10,padding:"10px 16px",
                  border:idx===0?`1px solid ${G.accent}`:undefined}}>
                  <span>{MEDALS[idx]||""} {r.name}</span>
                  <span style={{fontFamily:"'Cinzel',serif",color:G.accent}}>{r.score} pts</span>
                </div>
              ));
            })()}
          </div>
          <div style={{display:"flex",gap:10,width:"100%",maxWidth:300}}>
            <Btn primary G={G} style={{flex:1,padding:"12px 22px",fontSize:".9rem"}} onClick={rejouer}>🔄 Rejouer</Btn>
            <Btn G={G} style={{flex:1,padding:"12px 22px",fontSize:".9rem"}} onClick={()=>{ shareResult(); }}>📤 Partager</Btn>
            <Btn G={G} style={{flex:1,padding:"12px 22px",fontSize:".9rem"}} onClick={goHome}>🏠 Accueil</Btn>
          </div>
        </div>
      )}

      {/* Top bar */}
      <div style={S.topBar}>
        <Btn G={G} sm onClick={goHome}>← Accueil</Btn>
        <span style={{fontFamily:"'Cinzel',serif",fontSize:".95rem",color:G.accent}}>
          {gameGroupName} · {roundNum} {roundLabel}{roundNum!==1?"s":""}
        </span>
        <Btn G={G} sm onClick={nextTour}>✓ {G.winMode==="lowest"?"Manche":"Tour"}</Btn>
      </div>

      {/* Players */}
      <div style={{flex:1,padding:"12px 14px",overflowY:"auto",
        paddingBottom:"max(80px, calc(env(safe-area-inset-bottom, 0px) + 80px))"}}>
        {g.players.map((name,i)=>{
          const isOpen = sheet===i;
          const curVal = g.current[i];
          return (
            <div key={i} style={{...S.card,position:"relative"}}>
              {/* Header row */}
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:10,height:10,borderRadius:"50%",background:COLORS[i%COLORS.length]}}/>
                  <span style={{fontWeight:700,fontSize:".95rem"}}>{name}</span>
                  <span style={{fontSize:"1rem"}}>{getRankIcon(i)}</span>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:"1.1rem",color:G.accent}}>{g.totals[i]}</span>
                  <span style={{color:G.sub,fontSize:".8rem"}}>pts</span>
                </div>
              </div>

              {/* Score row */}
              <div style={{display:"flex",alignItems:"center",gap:6}}>
                                    <div onClick={()=>adjustScore(i,-1)} style={{width:44,height:44,borderRadius:8,
                  background:G.surface2,border:`1px solid ${G.border}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  cursor:"pointer",userSelect:"none",fontSize:"1.2rem",flexShrink:0}}>−</div>

                <div onClick={()=>{ setDirectEdit(i); setDirectVal(String(curVal)); }}
                  style={{flex:1,textAlign:"center",fontFamily:"'Cinzel',serif",
                    fontSize:"1.6rem",color:G.text,cursor:"pointer",padding:"4px 0"}}>
                  {directEdit===i
                    ? <input autoFocus type="number" value={directVal}
                        onChange={e=>setDirectVal(e.target.value)}
                        onBlur={()=>applyDirect(i)}
                        onKeyDown={e=>{ if(e.key==="Enter"||e.key==="Tab") applyDirect(i); }}
                        style={{width:"100%",textAlign:"center",background:"transparent",border:"none",
                          outline:`2px solid ${G.accent}`,borderRadius:6,fontFamily:"inherit",
                          fontSize:"inherit",color:G.accent,padding:"2px"}}/>
                    : curVal
                  }
                </div>

                                    <div onClick={()=>adjustScore(i,+1)} style={{width:44,height:44,borderRadius:8,
                  background:G.surface2,border:`1px solid ${G.border}`,
                  display:"flex",alignItems:"center",justifyContent:"center",
                  cursor:"pointer",userSelect:"none",fontSize:"1.2rem",flexShrink:0}}>＋</div>

                <div onClick={()=>setSheet(isOpen?null:i)}
                  style={{width:36,height:36,borderRadius:8,background:G.surface2,
                    border:`1px solid ${G.border}`,display:"flex",alignItems:"center",
                    justifyContent:"center",cursor:"pointer",userSelect:"none",
                    color:G.sub,fontSize:"1rem",flexShrink:0}}>
                  {isOpen?"▲":"▼"}
                </div>
              </div>

              {/* flip7 toggle */}
              {gameId==="flip7" && (
                <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8}}>
                  <div onClick={()=>toggleFlip7(i)}
                    style={{padding:"4px 12px",borderRadius:20,fontSize:".78rem",cursor:"pointer",
                      background:g.flip7?.[i]?"#f7c948":"transparent",
                      border:`1px solid ${g.flip7?.[i]?"#f7c948":G.border}`,
                      color:g.flip7?.[i]?"#1a1400":G.sub, transition:"all .2s"}}>
                    Flip7 {g.flip7?.[i]?"✓":""}
                  </div>
                </div>
              )}

              {/* skyjo double toggle */}
              {gameId==="skyjo" && (
                <div style={{marginTop:8,display:"flex",alignItems:"center",gap:8}}>
                  <div onClick={()=>toggleDouble(i)}
                    style={{padding:"4px 12px",borderRadius:20,fontSize:".78rem",cursor:"pointer",
                      background:g.doubled?.[i]?"#e05560":"transparent",
                      border:`1px solid ${g.doubled?.[i]?"#e05560":G.border}`,
                      color:g.doubled?.[i]?"#fff":G.sub, transition:"all .2s"}}>
                    ×2 {g.doubled?.[i]?"✓":""}
                  </div>
                </div>
              )}

              {/* Quick vals sheet */}
              {isOpen && (
                <div style={{marginTop:10,display:"flex",flexWrap:"wrap",gap:6}}>
                  {(G.quickVals||[1,2,3,4,5,6,7,8,9,10]).map(val=>(
                    <div key={val} onClick={()=>adjustScore(i,val)}
                      style={{background:G.surface2,border:`1px solid ${G.border}`,borderRadius:8,
                        padding:"6px 12px",cursor:"pointer",fontSize:".85rem",userSelect:"none"}}>
                      +{val}
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── WHO STARTS? ──────────────────────────────────────────────────────
const WHO_CSS = `
  @keyframes wdot-in {
    from { transform: scale(0) rotate(-180deg); opacity: 0; }
    to   { transform: scale(1) rotate(0deg);   opacity: 1; }
  }
  @keyframes wslide-up {
    from { transform: translateY(30px); opacity: 0; }
    to   { transform: translateY(0);    opacity: 1; }
  }
  @keyframes wfade-in {
    from { opacity: 0; }
    to   { opacity: 1; }
  }
  @keyframes wspin {
    from { transform: rotate(0turn); }
    to   { transform: rotate(1turn); }
  }
  @keyframes wpulse {
    0%, 100% { transform: scale(1); }
    50%       { transform: scale(1.08); }
  }
  .wdot-in  { animation: wdot-in  .5s cubic-bezier(.34,1.56,.64,1) both; }
  .wslide-up { animation: wslide-up .4s ease both; }
  .wfade-in  { animation: wfade-in .3s ease both; }
  .wspin     { animation: wspin 1.4s linear infinite; }
  .wpulse    { animation: wpulse 1s ease-in-out infinite; }
`;

const WHEEL_COLORS = ["#e05560","#f7c948","#4ecb71","#4da6ff","#c97bff","#ff9f40","#ff6b9d","#40e0d0"];
const KEY_WHEEL = "who_wheel_players";
function loadWheelPlayers() {
  try { return JSON.parse(localStorage.getItem(KEY_WHEEL))||[]; } catch { return []; }
}

function WhoStartsApp({ onBack }) {
  const [mode, setMode]     = useState("hub");   // hub | fingers | wheel
  const [wSub, setWSub]     = useState("setup"); // setup | spin | result
  const [wPlayers, setWP]   = useState(loadWheelPlayers);
  const [wInput, setWInput] = useState("");
  const [wResult, setWResult] = useState(null);
  const [wSpinning, setWSpinning] = useState(false);

  const [fPhase, setFPhase]       = useState("idle");
  const [fCount, setFCount]       = useState(0);
  const [fCdNum, setFCdNum]       = useState(3);
  const [fReplay, setFReplay]     = useState(false);

  const canvasRef   = useRef(null);
  const wAngleRef   = useRef(0);
  const wSpinRef    = useRef(false);
  const fStateRef   = useRef("idle");
  const fTouchesRef = useRef(new Map());
  const fFreeRef    = useRef([0,1,2,3,4]);
  const fTimerRef   = useRef(null);

  const [groups] = useState(() => loadGroups());

  const saveAndSet = (p) => {
    try { localStorage.setItem(KEY_WHEEL, JSON.stringify(p)); } catch { /* ignore */ }
    setWP(p);
  };

  const wAdd = () => {
    const n = wInput.trim();
    if (!n || wPlayers.length >= 10) return;
    saveAndSet([...wPlayers, { name:n, color:WHEEL_COLORS[wPlayers.length % WHEEL_COLORS.length] }]);
    setWInput("");
  };

  // ── Canvas wheel ──────────────────────────────────────────────────
  const drawWheel = useCallback((angle) => {
    const canvas = canvasRef.current; if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const { width: W, height: H } = canvas;
    const cx = W/2, cy = H/2, r = Math.min(cx,cy) - 8;
    ctx.clearRect(0, 0, W, H);
    const n = wPlayers.length; if (!n) return;
    const arc = (Math.PI * 2) / n;
    wPlayers.forEach((p, i) => {
      const a0 = angle + i * arc, a1 = a0 + arc;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, a0, a1); ctx.closePath();
      ctx.fillStyle = p.color; ctx.fill();
      ctx.strokeStyle = "rgba(0,0,0,.3)"; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(a0 + arc/2);
      ctx.textAlign = "right"; ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.min(16, 100/n)}px 'DM Sans', sans-serif`;
      ctx.shadowColor = "rgba(0,0,0,.5)"; ctx.shadowBlur = 3;
      ctx.fillText(p.name, r - 12, 5); ctx.restore();
    });
    // Center circle
    ctx.beginPath(); ctx.arc(cx, cy, 18, 0, Math.PI*2);
    ctx.fillStyle = "#1a1a2e"; ctx.fill();
    ctx.strokeStyle = "rgba(255,255,255,.2)"; ctx.lineWidth = 2; ctx.stroke();
  }, [wPlayers]);

  useEffect(() => {
    const canvas = canvasRef.current; if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const size = Math.min(window.innerWidth - 32, 320);
    canvas.width = size * dpr; canvas.height = size * dpr;
    canvas.style.width = `${size}px`; canvas.style.height = `${size}px`;
    const ctx = canvas.getContext("2d"); ctx.scale(dpr, dpr);
    drawWheel(wAngleRef.current);
  }, [wPlayers, drawWheel]);

  const spinWheel = () => {
    if (wSpinning || wPlayers.length < 2) return;
    setWSpinning(true); setWSub("spin"); setWResult(null);
    const duration = 3000 + Math.random() * 2000;
    const totalRot = (Math.PI * 2) * (5 + Math.random() * 5);
    const start = performance.now();
    const startAngle = wAngleRef.current;
    const animate = (now) => {
      const t = Math.min(1, (now - start) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      wAngleRef.current = startAngle + totalRot * ease;
      drawWheel(wAngleRef.current);
      if (t < 1) { requestAnimationFrame(animate); return; }
      // Winner
      const arc = (Math.PI * 2) / wPlayers.length;
      const normalised = (((-wAngleRef.current) % (Math.PI*2)) + Math.PI*2) % (Math.PI*2);
      const idx = Math.floor(normalised / arc) % wPlayers.length;
      setWResult(wPlayers[idx]);
      setWSub("result"); setWSpinning(false);
    };
    requestAnimationFrame(animate);
  };

  // ── Finger chooser ────────────────────────────────────────────────
  function fStart(e){
    if(fStateRef.current!=="idle")return;
    e.preventDefault();
    Array.from(e.changedTouches).forEach(t=>{
      if(fTouchesRef.current.size>=5)return;
      const free=fFreeRef.current.shift();
      if(free===undefined)return;
      fTouchesRef.current.set(t.identifier,free);
    });
    setFCount(fTouchesRef.current.size);
  }
  function fEnd(e){
    if(fStateRef.current==="idle"&&fTouchesRef.current.size>0){
      fStateRef.current="countdown";
      setFPhase("countdown");
      let n=3; setFCdNum(n);
      fTimerRef.current=setInterval(()=>{
        n--;
        if(n<=0){
          clearInterval(fTimerRef.current);
          fStateRef.current="result";
          setFPhase("result");
        } else { setFCdNum(n); }
      },1000);
    }
    Array.from(e.changedTouches).forEach(t=>{
      const slot=fTouchesRef.current.get(t.identifier);
      if(slot!==undefined){ fFreeRef.current.push(slot); fFreeRef.current.sort(); }
      fTouchesRef.current.delete(t.identifier);
    });
  }
  function fReset(){
    clearInterval(fTimerRef.current);
    fStateRef.current="idle"; fTouchesRef.current.clear();
    fFreeRef.current=[0,1,2,3,4];
    setFPhase("idle"); setFCount(0); setFCdNum(3); setFReplay(false);
  }

  // ── Hub ───────────────────────────────────────────────────────────
  const hubS = {
    root: {fontFamily:"'Bebas Neue',sans-serif",background:"#0f0f1a",color:"#f0f0ff",
      width:"100%",minHeight:"100vh",display:"flex",flexDirection:"column"},
    topBar: {display:"flex",alignItems:"center",gap:12,padding:"16px",
      paddingTop:"max(16px, env(safe-area-inset-top, 0px))"},
    title: {fontSize:"1.4rem",letterSpacing:2,color:"#a78bfa"},
  };

  if(mode==="hub") return (
    <div style={hubS.root}>
      <style>{WHO_CSS}</style>
      <div style={hubS.topBar}>
        <button onClick={onBack} style={{background:"none",border:"none",color:"#a78bfa",
          fontSize:"1rem",cursor:"pointer",fontFamily:"inherit",letterSpacing:1}}>← RETOUR</button>
        <span style={hubS.title}>QUI COMMENCE ?</span>
      </div>

      {/* Group quick-pick */}
      {groups.length>0 && (
        <div style={{padding:"0 16px 12px"}}>
          <div style={{fontSize:".7rem",color:"rgba(167,139,250,.6)",marginBottom:8,letterSpacing:2}}>TIRER AU SORT DANS UN GROUPE</div>
          <div style={{display:"flex",flexDirection:"column",gap:6}}>
            {groups.map(grp=>{
              const winner = grp.players[Math.floor(Math.random()*grp.players.length)];
              return (
                <button key={grp.id}
                  onClick={()=>{
                    const w=grp.players[Math.floor(Math.random()*grp.players.length)];
                    alert(`🎲 ${w} commence !`);
                  }}
                  style={{background:"rgba(167,139,250,.08)",border:"1px solid rgba(167,139,250,.2)",
                    borderRadius:10,padding:"10px 14px",color:"#f0f0ff",fontFamily:"inherit",
                    fontSize:".9rem",cursor:"pointer",textAlign:"left",letterSpacing:.5}}>
                  🎲 {grp.name} <span style={{color:"rgba(167,139,250,.5)",fontSize:".75rem"}}>({grp.players.length} joueurs)</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:10,flex:1}}>
        <button onClick={()=>setMode("fingers")}
          style={{background:"rgba(167,139,250,.1)",border:"1px solid rgba(167,139,250,.3)",
            borderRadius:14,padding:"20px 16px",color:"#f0f0ff",fontFamily:"inherit",
            fontSize:"1.2rem",letterSpacing:2,cursor:"pointer",textAlign:"left"}}>
          👆 DOIGTS SUR L'ÉCRAN
          <div style={{fontSize:".65rem",color:"rgba(167,139,250,.6)",marginTop:4,letterSpacing:1}}>
            Posez tous vos doigts simultanément
          </div>
        </button>
        <button onClick={()=>{setMode("wheel");setWSub("setup");}}
          style={{background:"rgba(167,139,250,.1)",border:"1px solid rgba(167,139,250,.3)",
            borderRadius:14,padding:"20px 16px",color:"#f0f0ff",fontFamily:"inherit",
            fontSize:"1.2rem",letterSpacing:2,cursor:"pointer",textAlign:"left"}}>
          🎡 ROUE DE LA FORTUNE
          <div style={{fontSize:".65rem",color:"rgba(167,139,250,.6)",marginTop:4,letterSpacing:1}}>
            Ajoutez des joueurs et faites tourner
          </div>
        </button>
      </div>
    </div>
  );

  // ── Fingers ──────────────────────────────────────────────────────
  if(mode==="fingers") return (
    <div style={{...hubS.root,userSelect:"none",WebkitUserSelect:"none"}}
      onTouchStart={fStart} onTouchEnd={fEnd} onTouchCancel={fEnd}>
      <style>{WHO_CSS}</style>
      <div style={hubS.topBar}>
        <button onClick={()=>{fReset();setMode("hub");}}
          style={{background:"none",border:"none",color:"#a78bfa",
            fontSize:"1rem",cursor:"pointer",fontFamily:"inherit",letterSpacing:1}}>← RETOUR</button>
        <span style={hubS.title}>DOIGTS SUR L'ÉCRAN</span>
      </div>
      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",
        justifyContent:"center",padding:24,gap:20}}>

        {fPhase==="idle" && (
          <div className="wfade-in" style={{textAlign:"center"}}>
            <div style={{fontSize:"3rem",marginBottom:12}}>👆</div>
            <div style={{fontSize:"1.1rem",letterSpacing:2,color:"rgba(240,240,255,.7)"}}>
              {fCount===0?"POSEZ VOS DOIGTS":`${fCount} DOIGT${fCount>1?"S":""} DÉTECTÉ${fCount>1?"S":""}`}
            </div>
            {fCount>0&&<div style={{fontSize:".7rem",color:"rgba(167,139,250,.6)",marginTop:8,letterSpacing:1}}>
              LEVEZ UN DOIGT POUR LANCER
            </div>}
          </div>
        )}

        {fPhase==="countdown" && (
          <div className="wslide-up" style={{textAlign:"center"}}>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"8rem",color:"#a78bfa",
              lineHeight:1,animation:`wpulse 1s ease-in-out infinite`}}>{fCdNum}</div>
            <div style={{fontSize:".8rem",letterSpacing:3,color:"rgba(167,139,250,.6)"}}>PRÉPAREZ-VOUS…</div>
          </div>
        )}

        {fPhase==="result" && (
          <div className="wslide-up" style={{textAlign:"center"}}>
            <div style={{fontSize:"4rem",marginBottom:8}}>🎉</div>
            <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"2rem",color:"#a78bfa",letterSpacing:3,marginBottom:4}}>
              DOIGT {(()=>{
                const slots=[...fTouchesRef.current.values()];
                if(slots.length>0) return slots[Math.floor(Math.random()*slots.length)]+1;
                return Math.floor(Math.random()*Math.max(fCount,1))+1;
              })()} !
            </div>
            <div style={{fontSize:".75rem",color:"rgba(167,139,250,.5)",letterSpacing:2,marginBottom:24}}>COMMENCE EN PREMIER</div>
            <button onClick={fReset}
              style={{background:"rgba(167,139,250,.15)",border:"1px solid rgba(167,139,250,.3)",
                borderRadius:10,padding:"12px 28px",color:"#f0f0ff",fontFamily:"inherit",
                fontSize:"1rem",letterSpacing:2,cursor:"pointer"}}>
              RECOMMENCER
            </button>
          </div>
        )}
      </div>
    </div>
  );

  // ── Wheel ─────────────────────────────────────────────────────────
  return (
    <div style={hubS.root}>
      <style>{WHO_CSS}</style>
      <div style={hubS.topBar}>
        <button onClick={()=>setMode("hub")}
          style={{background:"none",border:"none",color:"#a78bfa",
            fontSize:"1rem",cursor:"pointer",fontFamily:"inherit",letterSpacing:1}}>← RETOUR</button>
        <span style={hubS.title}>ROUE DE LA FORTUNE</span>
      </div>

      {/* Wheel canvas + pointer */}
      <div style={{display:"flex",justifyContent:"center",alignItems:"center",
        position:"relative",padding:"0 16px",marginBottom:16}}>
        <canvas ref={canvasRef} style={{borderRadius:"50%",boxShadow:"0 0 30px rgba(167,139,250,.3)"}}/>
        {/* Pointer */}
        <div style={{position:"absolute",right:"calc(50% - 160px - 16px + 4px)",top:"50%",
          transform:"translateY(-50%) rotate(180deg)",
          width:0,height:0,
          borderTop:"12px solid transparent",borderBottom:"12px solid transparent",
          borderRight:"22px solid #a78bfa",
          filter:"drop-shadow(0 0 6px rgba(167,139,250,.8))"}}/>
      </div>

      {/* Controls */}
      {wSub==="setup" && (
        <div style={{padding:"0 16px",display:"flex",flexDirection:"column",gap:10}}>
          <div style={{display:"flex",gap:8}}>
            <input value={wInput} onChange={e=>setWInput(e.target.value)}
              onKeyDown={e=>e.key==="Enter"&&wAdd()}
              placeholder="Nom du joueur" maxLength={16}
              style={{flex:1,background:"rgba(255,255,255,.06)",border:"1px solid rgba(167,139,250,.3)",
                borderRadius:10,padding:"10px 14px",color:"#f0f0ff",fontFamily:"inherit",fontSize:".9rem",outline:"none"}}/>
            <button onClick={wAdd}
              style={{background:"rgba(167,139,250,.2)",border:"1px solid rgba(167,139,250,.4)",
                borderRadius:10,padding:"10px 16px",color:"#a78bfa",fontFamily:"inherit",
                fontSize:"1rem",cursor:"pointer",letterSpacing:1}}>+</button>
          </div>
          <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
            {wPlayers.map((p,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,
                background:`${p.color}22`,border:`1px solid ${p.color}55`,
                borderRadius:20,padding:"4px 10px 4px 4px"}}>
                <div style={{width:10,height:10,borderRadius:"50%",background:p.color}}/>
                <span style={{fontSize:".8rem",color:"#f0f0ff"}}>{p.name}</span>
                <button onClick={()=>saveAndSet(wPlayers.filter((_,j)=>j!==i))}
                  style={{background:"none",border:"none",color:"rgba(255,255,255,.4)",
                    cursor:"pointer",padding:0,fontSize:".8rem",lineHeight:1}}>✕</button>
              </div>
            ))}
          </div>
          {/* Quick-add from groups */}
          {groups.length>0&&(
            <div style={{marginTop:4}}>
              <div style={{fontSize:".65rem",color:"rgba(167,139,250,.5)",marginBottom:6,letterSpacing:2}}>IMPORTER UN GROUPE</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {groups.map(grp=>(
                  <button key={grp.id} onClick={()=>{
                    const existing=new Set(wPlayers.map(p=>p.name));
                    const toAdd=grp.players.filter(n=>!existing.has(n));
                    const newList=[...wPlayers,...toAdd.map((name,i)=>({name,color:WHEEL_COLORS[(wPlayers.length+i)%WHEEL_COLORS.length]}))].slice(0,10);
                    saveAndSet(newList);
                  }}
                    style={{background:"rgba(167,139,250,.08)",border:"1px solid rgba(167,139,250,.2)",
                      borderRadius:8,padding:"4px 10px",color:"rgba(167,139,250,.8)",fontFamily:"inherit",
                      fontSize:".75rem",cursor:"pointer",letterSpacing:.5}}>
                    + {grp.name}
                  </button>
                ))}
              </div>
            </div>
          )}
          <button onClick={spinWheel} disabled={wPlayers.length<2}
            style={{background:wPlayers.length<2?"rgba(167,139,250,.1)":"rgba(167,139,250,.25)",
              border:`1px solid rgba(167,139,250,${wPlayers.length<2?".2":".5"})`,
              borderRadius:12,padding:"14px",color:wPlayers.length<2?"rgba(167,139,250,.4)":"#a78bfa",
              fontFamily:"inherit",fontSize:"1.1rem",letterSpacing:2,cursor:wPlayers.length<2?"default":"pointer"}}>
            🎡 LANCER
          </button>
        </div>
      )}

      {wSub==="spin" && (
        <div style={{textAlign:"center",padding:"0 16px"}}>
          <div className="wspin" style={{display:"inline-block",fontSize:"2rem",marginBottom:8}}>⏳</div>
          <div style={{fontSize:".8rem",letterSpacing:3,color:"rgba(167,139,250,.6)"}}>LA ROUE TOURNE…</div>
        </div>
      )}

      {wSub==="result" && wResult && (
        <div className="wslide-up" style={{textAlign:"center",padding:"0 16px"}}>
          <div style={{fontSize:"2rem",marginBottom:6}}>🎉</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"1.8rem",color:wResult.color,
            letterSpacing:3,marginBottom:4}}>{wResult.name}</div>
          <div style={{fontSize:".7rem",color:"rgba(167,139,250,.5)",letterSpacing:2,marginBottom:20}}>COMMENCE EN PREMIER</div>
          <button onClick={()=>{setWSub("setup");setWResult(null);}}
            style={{background:"rgba(167,139,250,.15)",border:"1px solid rgba(167,139,250,.3)",
              borderRadius:10,padding:"12px 28px",color:"#f0f0ff",fontFamily:"inherit",
              fontSize:"1rem",letterSpacing:2,cursor:"pointer"}}>
            RELANCER
          </button>
        </div>
      )}
    </div>
  );
}

// ── SELECTOR SCREEN ───────────────────────────────────────────────────────────
function GameSelector({ onSelect }) {
  const [showHistory,  setShowHistory]  = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [importMsg,    setImportMsg]    = useState(null);
  const [updateMsg,    setUpdateMsg]    = useState(null);
  const [updating,     setUpdating]     = useState(false);
  const [groups,       setGroups]       = useState(() => loadGroups());

  const allHistory = () => {
    const entries = [];
    groups.forEach(grp => {
      (grp.pastGames||[]).forEach(pg => entries.push({ ...pg, groupName: grp.name }));
    });
    return entries.sort((a,b) => new Date(b.date) - new Date(a.date));
  };

  // ── PWA update check ─────────────────────────────────────────────
  async function checkUpdate() {
    if (!('serviceWorker' in navigator)) {
      setUpdateMsg('⚠️ Service Worker non supporté sur ce navigateur.');
      return;
    }
    setUpdating(true); setUpdateMsg(null);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) { setUpdateMsg('ℹ️ Aucun Service Worker enregistré.'); setUpdating(false); return; }
      await reg.update();
      if (reg.waiting) {
        const reload = () => window.location.reload();
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        // controllerchange = nouveau SW actif → recharge
        if (navigator.serviceWorker.controller) {
          navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });
        } else {
          reload();
        }
        // Fallback : iOS ne déclenche pas toujours controllerchange
        setTimeout(() => {
          if (!document.hidden) window.location.reload();
        }, 3000);
      } else {
        setUpdateMsg('✓ Vous avez déjà la dernière version.');
        setUpdating(false);
      }
    } catch (e) {
      setUpdateMsg(`⚠️ Erreur : ${e.message}`);
      setUpdating(false);
    }
    navigator.serviceWorker.addEventListener('controllerchange', () => {}, { once: true });  // cleanup noop if needed
  }

  // ── removeEventListener cleanup ────────────────────────────────
  useEffect(() => {
    return () => {
      // nothing to clean up here, { once: true } handles it
    };
  }, []);

  function exportGroups() {
    const groups = loadGroups();
    const blob = new Blob([JSON.stringify(groups, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'score-keeper-groupes.json'; a.click();
    URL.revokeObjectURL(url);
  }

  function importGroups(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const groups = JSON.parse(e.target.result);
        if (!Array.isArray(groups)) throw new Error('not array');
        for (const g of groups) {
          if (typeof g.id !== 'string') throw new Error('id');
          if (typeof g.name !== 'string' || g.name.length > 50) throw new Error('name');
          if (!Array.isArray(g.players) || g.players.length > 20) throw new Error('players');
          for (const p of g.players) {
            if (typeof p !== 'string' || p.length > 24) throw new Error('player name');
          }
        }
        saveGroups(groups);
        setImportMsg(`✓ ${groups.length} groupe${groups.length>1?'s':''} restauré${groups.length>1?'s':''} !`);
      } catch { setImportMsg('⚠️ Fichier invalide, rien n\'a été modifié.'); }
    };
    reader.readAsText(file);
  }

  return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:"#0a0a0f",color:"#e8e8f0",
      width:"100%",minHeight:"100vh",display:"flex",flexDirection:"column",alignItems:"center",
      justifyContent:"center",
      paddingTop:"max(30px, env(safe-area-inset-top, 0px))",
      paddingLeft:"30px",paddingRight:"30px",
      paddingBottom:"max(30px, env(safe-area-inset-bottom, 0px))"}}>

      <style>{`*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}`}</style>

      {/* History overlay */}
      {showHistory && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:200,
          display:"flex",flexDirection:"column",padding:20,
          paddingTop:"max(20px, env(safe-area-inset-top, 0px))"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
            <span style={{fontFamily:"'Cinzel',serif",fontSize:"1.1rem",color:"#a78bfa"}}>Historique général</span>
            <button onClick={()=>setShowHistory(false)}
              style={{background:"none",border:"none",color:"rgba(255,255,255,.5)",fontSize:"1.4rem",cursor:"pointer"}}>✕</button>
          </div>
          <div style={{overflowY:"auto",flex:1}}>
            {allHistory().length===0&&<p style={{color:"rgba(255,255,255,.4)",textAlign:"center"}}>Aucune partie enregistrée.</p>}
            {allHistory().map((e,i)=>(
              <div key={i} style={{background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",
                borderRadius:12,padding:"12px 14px",marginBottom:8}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                  <span style={{fontWeight:700,color:"#e8e8f0"}}>🏆 {e.winner}</span>
                  <span style={{fontSize:".72rem",color:"rgba(255,255,255,.35)"}}>{new Date(e.date).toLocaleDateString("fr-FR")}</span>
                </div>
                <div style={{fontSize:".78rem",color:"rgba(255,255,255,.45)"}}>{e.groupName} · {GAMES[e.gameId]?.label||e.gameId}</div>
                <div style={{marginTop:6,display:"flex",flexWrap:"wrap",gap:4}}>
                  {(e.scores||[]).sort((a,b)=>b.score-a.score).map((s,j)=>(
                    <span key={j} style={{fontSize:".72rem",background:"rgba(255,255,255,.06)",
                      borderRadius:20,padding:"2px 8px",color:"rgba(255,255,255,.6)"}}>
                      {s.name} {s.score}
                    </span>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Settings overlay */}
      {showSettings && (
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,.92)",zIndex:200,
          display:"flex",flexDirection:"column",padding:20,
          paddingTop:"max(20px, env(safe-area-inset-top, 0px))"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
            <span style={{fontFamily:"'Cinzel',serif",fontSize:"1.1rem",color:"#a78bfa"}}>Paramètres</span>
            <button onClick={()=>setShowSettings(false)}
              style={{background:"none",border:"none",color:"rgba(255,255,255,.5)",fontSize:"1.4rem",cursor:"pointer"}}>✕</button>
          </div>

          {/* Update check */}
          <div onClick={updating ? undefined : checkUpdate}
            style={{background:"rgba(255,255,255,.04)",
              borderRadius:14,padding:"16px 18px",cursor:updating?"default":"pointer",
              display:"flex",alignItems:"center",gap:14,opacity:updating?.6:1}}>
            <span style={{fontSize:"1.6rem"}}>{updating?"⏳":"🔄"}</span>
            <div>
              <div style={{fontWeight:600,fontSize:".9rem"}}>Mise à jour</div>
              <div style={{fontSize:".75rem",color:"rgba(255,255,255,.45)",marginTop:2}}>
                    {updating?"Vérification en cours…":"Charger la dernière version"}</div>
            </div>
          </div>
          {updateMsg&&<div style={{marginTop:8,fontSize:".8rem",color:updateMsg.startsWith("✓")?"#4ecb71":"#f7c948",
            padding:"8px 12px",background:"rgba(255,255,255,.04)",borderRadius:8}}>{updateMsg}</div>}

          <div style={{height:1,background:"rgba(255,255,255,.06)",margin:"20px 0"}}/>

          {/* Export */}
          <div onClick={exportGroups}
            style={{background:"rgba(255,255,255,.04)",
              borderRadius:14,padding:"16px 18px",cursor:"pointer",
              display:"flex",alignItems:"center",gap:14,marginBottom:10}}>
            <span style={{fontSize:"1.6rem"}}>📤</span>
            <div>
              <div style={{fontWeight:600,fontSize:".9rem"}}>Exporter les groupes</div>
              <div style={{fontSize:".75rem",color:"rgba(255,255,255,.45)",marginTop:2}}>Télécharger un fichier JSON</div>
            </div>
          </div>

          {/* Import */}
          <label style={{background:"rgba(255,255,255,.04)",
            borderRadius:14,padding:"16px 18px",cursor:"pointer",
            display:"flex",alignItems:"center",gap:14,marginBottom:10}}>
            <span style={{fontSize:"1.6rem"}}>📥</span>
            <div>
              <div style={{fontWeight:600,fontSize:".9rem"}}>Importer des groupes</div>
              <div style={{fontSize:".75rem",color:"rgba(255,255,255,.45)",marginTop:2}}>Restaurer depuis un fichier JSON</div>
            </div>
            <input type="file" accept=".json" style={{display:"none"}}
              onChange={e=>{if(e.target.files?.[0]) importGroups(e.target.files[0]);}}/>
          </label>
          {importMsg&&<div style={{fontSize:".8rem",color:importMsg.startsWith("✓")?"#4ecb71":"#f7c948",
            padding:"8px 12px",background:"rgba(255,255,255,.04)",borderRadius:8,marginTop:4}}>{importMsg}</div>}
        </div>
      )}

      {/* Header */}
      <div style={{textAlign:"center",marginBottom:32}}>
        <div style={{fontFamily:"'Cinzel',serif",fontSize:"2rem",fontWeight:900,
          background:"linear-gradient(135deg,#a78bfa,#60a5fa)",
          WebkitBackgroundClip:"text",WebkitTextFillColor:"transparent",marginBottom:6}}>
          Score Keeper
        </div>
        <div style={{fontSize:".8rem",color:"rgba(255,255,255,.35)",letterSpacing:1}}>Choisissez un jeu</div>
      </div>

      {/* Game grid */}
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,width:"100%",maxWidth:400,marginBottom:20}}>
        {Object.entries(GAMES).filter(([id])=>id!=="whoStarts").map(([id,G])=>(
          <button key={id} onClick={()=>onSelect(id)}
            style={{background:`linear-gradient(135deg,${G.colorDim},${G.surface})`,
              border:`1px solid ${G.border}`,borderRadius:16,padding:"20px 14px",
              color:G.text,fontFamily:"'DM Sans',sans-serif",cursor:"pointer",
              display:"flex",flexDirection:"column",alignItems:"center",gap:8,
              transition:"transform .15s,box-shadow .15s",
              boxShadow:`0 4px 20px ${G.colorDim}`}}>
            <span style={{fontSize:"2.2rem"}}>{G.emoji}</span>
            <span style={{fontFamily:"'Cinzel',serif",fontSize:".85rem",fontWeight:700,letterSpacing:.5}}>{G.label}</span>
            {G.desc&&<span style={{fontSize:".68rem",color:"rgba(255,255,255,.45)",textAlign:"center",lineHeight:1.3}}>{G.desc}</span>}
          </button>
        ))}
      </div>

      {/* Who starts button */}
      <button onClick={()=>onSelect("whoStarts")}
        style={{width:"100%",maxWidth:400,background:"rgba(167,139,250,.08)",
          border:"1px solid rgba(167,139,250,.25)",borderRadius:14,padding:"14px",
          color:"#a78bfa",fontFamily:"'DM Sans',sans-serif",fontSize:".9rem",
          cursor:"pointer",marginBottom:12,letterSpacing:.5}}>
        🎲 Qui commence ?
      </button>

      {/* Footer buttons */}
      <div style={{display:"flex",gap:10,width:"100%",maxWidth:400}}>
        <button onClick={()=>setShowHistory(true)}
          style={{flex:1,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",
            borderRadius:12,padding:"10px",color:"rgba(255,255,255,.5)",fontFamily:"inherit",
            fontSize:".8rem",cursor:"pointer"}}>📋 Historique</button>
        <button onClick={()=>setShowSettings(true)}
          style={{flex:1,background:"rgba(255,255,255,.04)",border:"1px solid rgba(255,255,255,.08)",
            borderRadius:12,padding:"10px",color:"rgba(255,255,255,.5)",fontFamily:"inherit",
            fontSize:".8rem",cursor:"pointer"}}>⚙️ Paramètres</button>
      </div>
    </div>
  );
}

// ── ROOT ─────────────────────────────────────────────────────────────────────
export default function App() {
  const [gameId, setGameId] = useState(null);
  if (gameId==="whoStarts") return <WhoStartsApp onBack={()=>setGameId(null)}/>;
  return gameId
    ? <GameApp gameId={gameId} onBack={()=>setGameId(null)}/>
    : <GameSelector onSelect={setGameId}/>;
}
