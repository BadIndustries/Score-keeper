import { useState, useCallback, useEffect, useRef } from "react";
import { GAMES, COLORS, MEDALS, genId, DEFAULT_LIMITS, KEY_GROUPS } from './games.config.js';
import { loadData, saveGroups, saveActiveGame, loadGroups } from './storage.js';

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
      paddingTop:"max(8px, env(safe-area-inset-top, 0px))", paddingBottom:"7px",
      paddingLeft:"14px", paddingRight:"14px",
      borderBottom:`1px solid ${G.border}`, gap:10, flexShrink:0 },
    topTitle: { fontFamily:"'Cinzel',serif", fontSize:"1.05rem", fontWeight:900, color:G.accent, letterSpacing:".06em", flex:1 },
    backBtn: { background:G.surface2, border:`1px solid ${G.border}`, borderRadius:8, padding:"5px 12px",
      fontSize:".75rem", color:G.sub, cursor:"pointer", fontFamily:"inherit", whiteSpace:"nowrap" },
    scroll: { flex:1, overflowY:"auto", padding:"10px 12px" },
    sLabel: { fontSize:".6rem", letterSpacing:".18em", textTransform:"uppercase", color:G.sub, marginBottom:8, marginTop:4 },
    footer: { flexShrink:0, padding:"8px 12px", borderTop:`1px solid ${G.border}`, display:"flex", gap:8 },
    iconBtn: { background:G.surface2, border:`1px solid ${G.border}`, borderRadius:8, width:34, height:34,
      display:"flex", alignItems:"center", justifyContent:"center", fontSize:".9rem", cursor:"pointer", flexShrink:0 },
  };

  function getGroupLimit(grp) {
    return grp.limits?.[gameId] ?? G.defaultLimit;
  }

  function startGroupGame(groupId) {
    if (data.activeGame?.groupId===groupId) {
      if (window.confirm("Une partie est en cours. La reprendre ?")) { setScreen("game"); return; }
    }
    const grp = data.groups.find(x=>x.id===groupId);
    const limit = getGroupLimit(grp);
    update(a => {
      a.activeGame = { groupId, players:[...grp.players], limit,
        tour:1, manche:1, totals:grp.players.map(()=>0),
        current:grp.players.map(()=>0),
        ...(gameId==="flip7" ? {flip7:grp.players.map(()=>false)} : {}),
        ...(gameId==="skyjo" ? {doubled:grp.players.map(()=>false)} : {}),
        history:[], startedAt:new Date().toISOString() };
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
      a.activeGame={groupId:null,players,limit:quickState.limit,
        tour:1,manche:1,totals:players.map(()=>0),current:players.map(()=>0),
        ...(gameId==="flip7"?{flip7:players.map(()=>false)}:{}),
        ...(gameId==="skyjo"?{doubled:players.map(()=>false)}:{}),
        history:[],startedAt:new Date().toISOString()};
      return a;
    });
    setScreen("game");
  }

  function adjustScore(i,d){
    update(a=>{
      const minVal = gameId==="skyjo" ? -99 : 0;
      a.activeGame.current[i]=Math.max(minVal,a.activeGame.current[i]+d);
      return a;
    });
  }
  function toggleFlip7(i){ update(a=>{a.activeGame.flip7[i]=!a.activeGame.flip7[i];return a;}); }
  function toggleDouble(i){ update(a=>{a.activeGame.doubled[i]=!a.activeGame.doubled[i];return a;}); }

  function getRankIcon(idx){
    if(!g) return "";
    const sorted=[...g.totals].sort((a,b)=>G.winMode==="lowest"?a-b:b-a);
    return["🥇","🥈","🥉","","",""][sorted.indexOf(g.totals[idx])]||"";
  }

  function validerRound(){
    update(a=>{
      const g=a.activeGame;
      let tourScores;
      if(gameId==="flip7"){
        tourScores=g.current.map((pts,i)=>pts+(g.flip7[i]?15:0));
        g.history.push({scores:[...tourScores],flip7:[...g.flip7]});
      } else if(gameId==="skyjo"){
        tourScores=g.current.map((pts,i)=>g.doubled[i]&&pts>0?pts*2:pts);
        g.history.push({scores:[...tourScores],doubled:[...g.doubled]});
      } else {
        tourScores=[...g.current];
        g.history.push([...g.current]);
      }
      tourScores.forEach((pts,i)=>{g.totals[i]+=pts;});

      const won = Math.max(...g.totals)>=g.limit;

      if(won){
        if(g.groupId){
          const grp=a.groups.find(x=>x.id===g.groupId);
          if(grp){
            if(!grp.pastGames)grp.pastGames=[];
            const winnerIdx = G.winMode==="lowest"
              ? g.totals.indexOf(Math.min(...g.totals))
              : g.totals.indexOf(Math.max(...g.totals));
            grp.pastGames.unshift({
              gameId,
              date:g.startedAt, rounds:g.tour||g.manche,
              winner:g.players[winnerIdx],
              scores:g.players.map((name,i)=>({name,score:g.totals[i]}))
            });
            if(grp.pastGames.length>20)grp.pastGames=grp.pastGames.slice(0,20);
          }
        }
        setShowWin(true);
      } else {
        g.tour=(g.tour||1)+1; g.manche=(g.manche||1)+1;
        g.current=g.players.map(()=>0);
        if(gameId==="flip7")g.flip7=g.players.map(()=>false);
        if(gameId==="skyjo")g.doubled=g.players.map(()=>false);
      }
      return a;
    });
  }

  function rejouer(){
    if(!g)return;
    const{groupId,players,limit}=g;
    setShowWin(false);
    update(a=>{
      a.activeGame={groupId,players:[...players],limit,tour:1,manche:1,
        totals:players.map(()=>0),current:players.map(()=>0),
        ...(gameId==="flip7"?{flip7:players.map(()=>false)}:{}),
        ...(gameId==="skyjo"?{doubled:players.map(()=>false)}:{}),
        history:[],startedAt:new Date().toISOString()};
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
      navigator.share({ title:`${G.label} — Score Keeper`, text });
    } else {
      navigator.clipboard?.writeText(text)
        .then(()=>{setToast(true);setTimeout(()=>setToast(false),1600);})
        .catch(()=>{});
    }
  }

  const roundNum = g ? (g.tour||g.manche||1) : 1;
  const roundLabel = gameId==="flip7" ? "Tour" : "Manche";

  return (
    <div style={S.root}>
      {toast && <div style={{position:"fixed",top:"calc(env(safe-area-inset-top, 0px) + 8px)",left:"50%",transform:"translateX(-50%)",
        background:G.btnBg,color:G.btnColor,fontSize:".68rem",letterSpacing:".08em",
        padding:"5px 16px",borderRadius:20,zIndex:99,whiteSpace:"nowrap",pointerEvents:"none",opacity:.92}}>✓ Sauvegardé</div>}

      {/* ── HOME ── */}
      {screen==="home" && <>
        {/* Back button — fixed bottom-left */}
        <div onClick={onBack} style={{position:"fixed",
          bottom:"calc(env(safe-area-inset-bottom, 0px) + 20px)",left:20,
          background:G.surface2,border:`1px solid ${G.border}`,borderRadius:28,
          padding:"11px 20px",fontSize:".75rem",color:G.sub,cursor:"pointer",
          display:"flex",alignItems:"center",gap:7,zIndex:10,
          boxShadow:"0 4px 24px rgba(0,0,0,.45)",backdropFilter:"blur(8px)"}}>
          ← Changer de jeu
        </div>
        <div style={{textAlign:"center",paddingTop:"max(20px, env(safe-area-inset-top, 0px))",paddingLeft:16,paddingRight:16,paddingBottom:10,flexShrink:0}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"2rem",fontWeight:900,color:G.accent,letterSpacing:".1em"}}>{G.emoji} {G.label.toUpperCase()}</div>
          <div style={{color:G.sub,fontSize:".62rem",letterSpacing:".2em",textTransform:"uppercase",marginTop:2}}>Score Keeper</div>
        </div>
        <div style={{...S.scroll,paddingBottom:"calc(env(safe-area-inset-bottom, 0px) + 80px)"}}>
          <div style={S.sLabel}>Mes groupes</div>
          {data.groups.length===0 && <div style={{color:G.sub,fontSize:".8rem",textAlign:"center",padding:"14px 0"}}>Aucun groupe — crée-en un !</div>}
          {data.groups.map((grp,gi)=>(
            <div key={grp.id} onClick={()=>startGroupGame(grp.id)}
              style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:14,padding:"12px 14px",
              display:"flex",alignItems:"center",gap:10,cursor:"pointer",marginBottom:8}}>
              <div style={{width:3,borderRadius:3,alignSelf:"stretch",flexShrink:0,background:COLORS[gi%COLORS.length]}}/>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:"1rem",fontWeight:700,whiteSpace:"nowrap",overflow:"hidden",textOverflow:"ellipsis"}}>{grp.name}</div>
                <div style={{fontSize:".68rem",color:G.sub,marginTop:2}}>
                  {grp.players.length} joueurs · {G.limitLabel.toLowerCase()} {getGroupLimit(grp)} pts
                  {grp.pastGames?.length?` · ${grp.pastGames.length} partie${grp.pastGames.length>1?"s":""} jouée${grp.pastGames.length>1?"s":""}`:""}</div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                {grp.pastGames?.length>0 && <div style={S.iconBtn} onClick={()=>{setPastGroupId(grp.id);setSheet("past");}}>🏆</div>}
                <div style={S.iconBtn} onClick={()=>{setStatsGrpId(grp.id);setSheet("stats");}}>📊</div>
                <div style={S.iconBtn} onClick={()=>openEditGroup(grp.id)}>✏️</div>
              </div>
            </div>
          ))}
          <Btn ghost full G={G} onClick={()=>openEditGroup(null)}>＋ Nouveau groupe</Btn>
          <div style={{...S.sLabel,marginTop:18}}>Partie rapide</div>
          <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:14,padding:"12px 14px",marginBottom:10,cursor:"pointer"}} onClick={openQuickSetup}>
            <div style={{display:"flex",alignItems:"center",gap:10}}>
              <span style={{fontSize:"1.4rem"}}>⚡</span>
              <div>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:".95rem",fontWeight:700}}>Partie rapide</div>
                <div style={{fontSize:".68rem",color:G.sub,marginTop:2}}>Noms à la volée, sans sauvegarder</div>
              </div>
            </div>
          </div>
        </div>
      </>}

      {/* ── EDIT GROUP ── */}
      {screen==="editGroup" && editState && <>
        <div style={S.topBar}>
          <div style={S.topTitle}>{editState.id?"Modifier":"Nouveau groupe"}</div>
        </div>
        <div style={S.scroll}>
          <div style={S.sLabel}>Nom du groupe</div>
          <input placeholder="Ex: Weekend, Boulot…" maxLength={24} value={editState.name}
            onChange={e=>setEditState(s=>({...s,name:e.target.value}))}
            style={{background:G.surface2,border:`1px solid ${G.border}`,borderRadius:10,padding:"10px 14px",
            width:"100%",color:G.text,fontFamily:"'Cinzel',serif",fontSize:"1rem",outline:"none",marginBottom:14}}/>

          <div style={S.sLabel}>Limites par jeu</div>
          {Object.entries(GAMES).map(([gid, Gx])=>(
            <div key={gid} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              background:G.surface2,border:`1px solid ${G.border}`,borderRadius:10,padding:"10px 14px",marginBottom:8}}>
              <span style={{fontSize:".85rem",color:G.text}}>{Gx.emoji} {Gx.label} <span style={{fontSize:".7rem",color:G.sub}}>— {Gx.limitLabel}</span></span>
              <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div onClick={()=>setEditState(s=>({...s,limits:{...s.limits,[gid]:Math.max(Gx.limitMin,(s.limits[gid]??Gx.defaultLimit)-Gx.limitStep)}}))}
                  style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:6,width:28,height:28,
                  display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",userSelect:"none"}}>−</div>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:"1rem",color:Gx.accent,minWidth:"3.5ch",textAlign:"center"}}>
                  {editState.limits[gid]??Gx.defaultLimit}
                </span>
                <div onClick={()=>setEditState(s=>({...s,limits:{...s.limits,[gid]:Math.min(Gx.limitMax,(s.limits[gid]??Gx.defaultLimit)+Gx.limitStep)}}))}
                  style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:6,width:28,height:28,
                  display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",userSelect:"none"}}>＋</div>
              </div>
            </div>
          ))}

          <div style={{...S.sLabel,marginTop:10}}>Joueurs <span style={{color:G.sub}}>(2 à 6)</span></div>
          {editState.players.map((name,i)=>(
            <PlayerEditRow key={i} name={name} index={i}
              onChange={v=>setEditState(s=>{const p=[...s.players];p[i]=v;return{...s,players:p};})}
              onRemove={()=>setEditState(s=>({...s,players:s.players.filter((_,j)=>j!==i)}))}
              canRemove={editState.players.length>2}/>
          ))}
          {editState.players.length<6 && <Btn ghost full G={G} onClick={()=>setEditState(s=>({...s,players:[...s.players,""]}))}>＋ Ajouter un joueur</Btn>}
        </div>
        <div style={S.footer}>
          <Btn ghost G={G} onClick={()=>setScreen("home")}>← Retour</Btn>
          {editState.id && <Btn ghost G={G} onClick={deleteGroup}>🗑</Btn>}
          <Btn primary G={G} style={{flex:1}} onClick={saveGroup}>Enregistrer</Btn>
        </div>
      </>}

      {/* ── QUICK SETUP ── */}
      {screen==="quickSetup" && quickState && <>
        <div style={S.topBar}>
          <div style={S.topTitle}>Partie rapide</div>
        </div>
        <div style={S.scroll}>
          <div style={S.sLabel}>{G.limitLabel}</div>
          <LimitCtrl G={G} value={quickState.limit} label={G.limitLabel}
            onChange={v=>setQuickState(s=>({...s,limit:v}))}
            min={G.limitMin} max={G.limitMax} step={G.limitStep}/>
          <div style={S.sLabel}>Joueurs <span style={{color:G.sub}}>(2 à 6)</span></div>
          {quickState.players.map((name,i)=>(
            <PlayerEditRow key={i} name={name} index={i}
              onChange={v=>setQuickState(s=>{const p=[...s.players];p[i]=v;return{...s,players:p};})}
              onRemove={()=>setQuickState(s=>({...s,players:s.players.filter((_,j)=>j!==i)}))}
              canRemove={quickState.players.length>2}/>
          ))}
          {quickState.players.length<6 && <Btn ghost full G={G} onClick={()=>setQuickState(s=>({...s,players:[...s.players,""]}))}>＋ Ajouter un joueur</Btn>}
        </div>
        <div style={S.footer}>
          <Btn ghost G={G} onClick={()=>setScreen("home")}>← Retour</Btn>
          <Btn primary G={G} style={{flex:1}} onClick={startQuickGame}>{G.emoji} Commencer</Btn>
        </div>
      </>}

      {/* ── GAME ── */}
      {screen==="game" && g && <>
        <div style={S.topBar}>
          <div style={S.topTitle}>{G.emoji} {gameGroupName}</div>
          <div style={{display:"flex",gap:6,alignItems:"center"}}>
            <div style={{background:G.surface2,border:`1px solid ${G.border}`,borderRadius:8,padding:"4px 10px",
              textAlign:"center",fontSize:".58rem",letterSpacing:".12em",textTransform:"uppercase",color:G.sub}}>
              {roundLabel}<strong style={{color:G.accent,fontSize:".95rem",display:"block",lineHeight:1.1,letterSpacing:0}}>{roundNum}</strong>
            </div>
            <div style={S.iconBtn} onClick={()=>setSheet("history")}>📜</div>
          </div>
        </div>

        <div style={{display:"flex",flexDirection:"column",gap:5,flex:1,padding:"6px 10px",minHeight:0,overflowY:"auto"}}>
          {g.players.map((name,i)=>{
            const total=g.totals[i], cur=g.current[i];
            const f7 = gameId==="flip7" ? g.flip7[i] : false;
            const doubled = gameId==="skyjo" ? g.doubled[i] : false;
            const tourTotal = cur + (f7?15:0);
            const pct = Math.min(100,Math.round((Math.max(0,total)/g.limit)*100));
            const danger = gameId==="odin" ? total>=g.limit-3 : gameId==="skyjo" ? total>=g.limit*0.75 : total>=g.limit*0.8;
            const isOut = gameId==="odin" && total>=g.limit;

            return (
              <div key={i} style={{background:G.surface,border:`1px solid ${danger?G.color:G.border}`,
                borderRadius:14,padding:"8px 10px 8px 12px",position:"relative",flexShrink:0,
                opacity:isOut?.5:1}}>
                <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,
                  borderRadius:"14px 0 0 14px",background:COLORS[i%COLORS.length]}}/>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:5}}>
                  <div style={{display:"flex",alignItems:"center",gap:5}}>
                    <span style={{fontFamily:"'Cinzel',serif",fontSize:".9rem",fontWeight:700}}>{name}</span>
                    <span style={{fontSize:".8rem"}}>{roundNum>1?getRankIcon(i):""}</span>
                  </div>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:"1.5rem",fontWeight:900,
                    color:danger?G.accent:G.text,lineHeight:1}}>{total}</span>
                </div>
                <div style={{width:"100%",height:4,background:G.surface2,borderRadius:2,overflow:"hidden",marginBottom:8}}>
                  <div style={{height:"100%",borderRadius:2,width:`${pct}%`,transition:"width .35s",
                    background:danger?G.color:`${G.color}66`}}/>
                </div>
                <div style={{display:"flex",alignItems:"center",gap:6}}>
                  <div style={{display:"flex",flexDirection:"column",gap:4,flex:1}}>
                    <div style={{display:"flex",alignItems:"center",gap:4}}>
                      <div onClick={()=>adjustScore(i,-1)} style={{width:32,height:32,borderRadius:8,
                        border:"1px solid rgba(196,74,58,.3)",background:"rgba(196,74,58,.15)",color:"#ff8070",
                        fontSize:"1.2rem",display:"flex",alignItems:"center",justifyContent:"center",
                        cursor:"pointer",userSelect:"none",flexShrink:0}}>−</div>
                      <div style={{flex:1,textAlign:"center"}} onClick={()=>{if(directEdit===null){setDirectEdit(i);setDirectVal(String(cur));}}}>
                        {directEdit===i
                          ? <input type="number" autoFocus value={directVal}
                              onChange={e=>setDirectVal(e.target.value)}
                              onBlur={()=>applyDirect(i)}
                              onKeyDown={e=>{if(e.key==="Enter")applyDirect(i);if(e.key==="Escape"){setDirectEdit(null);setDirectVal("");}}}
                              style={{width:"100%",background:"transparent",border:"none",
                                borderBottom:`2px solid ${G.accent}`,outline:"none",
                                fontFamily:"'Cinzel',serif",fontSize:"1.4rem",fontWeight:700,
                                lineHeight:1,color:G.accent,textAlign:"center",padding:"2px 0"}}/>
                          : <>
                              <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.4rem",fontWeight:700,
                                lineHeight:1,cursor:"text",borderBottom:`1px dashed ${G.border}`}}>{cur}</div>
                              <div style={{fontSize:".5rem",color:G.sub,letterSpacing:".08em",textTransform:"uppercase"}}>
                                {gameId==="flip7"?"ce tour":"cette manche"}</div>
                            </>
                        }
                      </div>
                      <div onClick={()=>adjustScore(i,+1)} style={{width:32,height:32,borderRadius:8,
                        border:"1px solid rgba(74,154,106,.3)",background:"rgba(74,154,106,.15)",color:"#6dcc90",
                        fontSize:"1.2rem",display:"flex",alignItems:"center",justifyContent:"center",
                        cursor:"pointer",userSelect:"none",flexShrink:0}}>＋</div>
                    </div>
                    <div style={{display:"flex",gap:3}}>
                      {[[-10,"#ff8070","rgba(196,74,58,.12)","rgba(196,74,58,.3)"],
                        [-5,"#ff8070","rgba(196,74,58,.12)","rgba(196,74,58,.3)"],
                        [5,"#6dcc90","rgba(74,154,106,.12)","rgba(74,154,106,.3)"],
                        [10,"#6dcc90","rgba(74,154,106,.12)","rgba(74,154,106,.3)"]].map(([val,color,bg,border])=>(
                        <div key={val} onClick={()=>adjustScore(i,val)}
                          style={{flex:1,height:24,borderRadius:6,border:`1px solid ${border}`,background:bg,
                          color,fontSize:".65rem",fontWeight:700,display:"flex",alignItems:"center",
                          justifyContent:"center",cursor:"pointer",userSelect:"none"}}>
                          {val>0?`+${val}`:val}
                        </div>
                      ))}
                    </div>
                  </div>
                  {gameId==="flip7" && (
                    <div onClick={()=>toggleFlip7(i)}
                      style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                      background:f7?"rgba(246,201,14,.15)":G.surface2,
                      border:`1px solid ${f7?"rgba(246,201,14,.5)":G.border}`,
                      borderRadius:10,padding:"5px 10px",cursor:"pointer",flexShrink:0,minWidth:62}}>
                      <span style={{fontSize:"1rem"}}>🃏</span>
                      <span style={{fontSize:".5rem",letterSpacing:".06em",textTransform:"uppercase",
                        color:f7?"#f6c90e":G.sub,fontWeight:f7?700:400}}>Flip7{f7?" +15":""}</span>
                    </div>
                  )}
                  {gameId==="skyjo" && (
                    <div onClick={()=>toggleDouble(i)}
                      style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                      background:doubled?"rgba(239,68,68,.18)":G.surface2,
                      border:`1px solid ${doubled?"rgba(239,68,68,.6)":G.border}`,
                      borderRadius:10,padding:"5px 8px",cursor:"pointer",flexShrink:0,minWidth:58}}>
                      <span style={{fontSize:"1rem"}}>✕2</span>
                      <span style={{fontSize:".5rem",letterSpacing:".06em",textTransform:"uppercase",
                        color:doubled?"#f87171":G.sub,fontWeight:doubled?700:400}}>
                        {doubled?"Doublé":"Double"}
                      </span>
                    </div>
                  )}
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,minWidth:44}}>
                    <div style={{fontFamily:"'Cinzel',serif",fontSize:"1rem",fontWeight:700,lineHeight:1,
                      color:doubled?"#f87171":f7?"#f6c90e":G.accent}}>
                      {gameId==="skyjo"
                        ? (doubled&&cur>0?`×2 = ${cur*2}`:cur!==0?`${cur>0?"+":""}${cur}`:"-")
                        : tourTotal>0?`+${tourTotal}`:"-"}
                    </div>
                    <div style={{fontSize:".5rem",color:G.sub,letterSpacing:".06em",textTransform:"uppercase"}}>total</div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        <div style={S.footer}>
          <Btn ghost G={G} onClick={()=>{if(window.confirm("Quitter la partie ?"))goHome();}}>← Quitter</Btn>
          <Btn primary G={G} style={{flex:1}} onClick={validerRound}>{G.emoji} Valider {roundLabel.toLowerCase()}</Btn>
        </div>
      </>}

      {/* ── SHEET: HISTORY ── */}
      {sheet==="history" && g && (
        <div onClick={e=>{if(e.target===e.currentTarget)setSheet(null);}}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",display:"flex",
          flexDirection:"column",alignItems:"center",justifyContent:"flex-end",zIndex:10}}>
          <div style={{background:G.surface,borderRadius:"20px 20px 0 0",border:`1px solid ${G.border}`,
            width:"100%",maxHeight:"78%",display:"flex",flexDirection:"column"}}>
            <div style={{width:36,height:4,background:G.border,borderRadius:2,margin:"10px auto 8px",flexShrink:0}}/>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"0 16px 10px",flexShrink:0,borderBottom:`1px solid ${G.border}`}}>
              <span style={{fontFamily:"'Cinzel',serif",fontSize:".95rem",color:G.accent}}>📜 Historique</span>
              <div style={S.iconBtn} onClick={()=>setSheet(null)}>✕</div>
            </div>
            <div style={{overflowY:"auto",flex:1,padding:"10px 14px"}}>
              {g.history.length===0
                ? <div style={{color:G.sub,textAlign:"center",padding:20}}>Aucun tour encore</div>
                : <table style={{width:"100%",borderCollapse:"collapse",fontSize:".75rem"}}>
                    <thead><tr>
                      <th style={{color:G.sub,fontWeight:400,padding:"4px 5px",borderBottom:`1px solid ${G.border}`,fontSize:".6rem"}}>{roundLabel}</th>
                      {g.players.map((n,i)=><th key={i} style={{color:G.sub,fontWeight:400,padding:"4px 5px",borderBottom:`1px solid ${G.border}`,fontSize:".6rem"}}>{n.length>5?n.slice(0,4)+".":n}</th>)}
                    </tr></thead>
                    <tbody>
                      {g.history.map((h,hi)=>{
                        const scores = Array.isArray(h) ? h : h.scores;
                        const isF7 = h.flip7||[];
                        return <tr key={hi}>
                          <td style={{padding:"5px",textAlign:"center",borderBottom:`1px solid ${G.surface2}`,color:G.sub,fontSize:".62rem"}}>{hi+1}</td>
                          {scores.map((s,i)=>{
                            const isDoubled=h.doubled&&h.doubled[i];
                            return <td key={i} style={{padding:"5px",textAlign:"center",borderBottom:`1px solid ${G.surface2}`,
                              color:isF7[i]?"#f6c90e":isDoubled?"#f87171":G.text}}>
                              {s}{isF7[i]?" 🃏":""}{isDoubled?" ×2":""}
                            </td>;
                          })}
                        </tr>;
                      })}
                      <tr>
                        <td style={{padding:"5px",textAlign:"center",color:G.accent,fontWeight:700,borderTop:`1px solid ${G.border}`,fontSize:".62rem"}}>Tot.</td>
                        {g.totals.map((s,i)=><td key={i} style={{padding:"5px",textAlign:"center",color:G.accent,fontWeight:700,borderTop:`1px solid ${G.border}`}}>{s}</td>)}
                      </tr>
                    </tbody>
                  </table>
              }
            </div>
          </div>
        </div>
      )}

      {/* ── SHEET: PAST GAMES ── */}
      {sheet==="past" && pastGroupId && (()=>{
        const grp=data.groups.find(x=>x.id===pastGroupId);
        return (
          <div onClick={e=>{if(e.target===e.currentTarget)setSheet(null);}}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",display:"flex",
            flexDirection:"column",alignItems:"center",justifyContent:"flex-end",zIndex:10}}>
            <div style={{background:G.surface,borderRadius:"20px 20px 0 0",border:`1px solid ${G.border}`,
              width:"100%",maxHeight:"78%",display:"flex",flexDirection:"column"}}>
              <div style={{width:36,height:4,background:G.border,borderRadius:2,margin:"10px auto 8px",flexShrink:0}}/>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"0 16px 10px",flexShrink:0,borderBottom:`1px solid ${G.border}`}}>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:".95rem",color:G.accent}}>🏆 Parties passées</span>
                <div style={S.iconBtn} onClick={()=>setSheet(null)}>✕</div>
              </div>
              <div style={{overflowY:"auto",flex:1,padding:"10px 14px"}}>
                {!grp?.pastGames?.length
                  ? <div style={{color:G.sub,textAlign:"center",padding:20}}>Aucune partie enregistrée</div>
                  : grp.pastGames.map((pg,pi)=>{
                      const pgGame = GAMES[pg.gameId] || G;
                      const ds=new Date(pg.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
                      const sorted=[...pg.scores].sort((a,b)=>pgGame.winMode==="lowest"?a.score-b.score:b.score-a.score);
                      const sc=sorted.map((s,i)=>`${MEDALS[i]} ${s.name} ${s.score}pts`).join(" · ");
                      return (
                        <div key={pi} style={{display:"flex",alignItems:"flex-start",justifyContent:"space-between",
                          padding:"8px 0",borderBottom:`1px solid ${G.surface2}`,gap:8}}>
                          <div>
                            <div style={{fontFamily:"'Cinzel',serif",fontSize:".82rem",color:pgGame.accent}}>
                              {pgGame.emoji} {pg.winner}
                            </div>
                            <div style={{fontSize:".63rem",color:G.sub,marginTop:2,lineHeight:1.5}}>{sc}</div>
                          </div>
                          <div style={{flexShrink:0,textAlign:"right"}}>
                            <div style={{fontSize:".65rem",color:G.sub}}>{ds}</div>
                            <div style={{fontSize:".63rem",color:G.sub}}>{pg.rounds} tour{pg.rounds>1?"s":""}</div>
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── SHEET: STATS ── */}
      {sheet==="stats" && statsGrpId && (()=>{
        const grp = data.groups.find(x=>x.id===statsGrpId);
        if (!grp) return null;
        const overall = {};
        (grp.pastGames||[]).forEach(pg=>{
          (pg.scores||[]).forEach(s=>{
            if(!overall[s.name]) overall[s.name]={games:0,wins:0};
            overall[s.name].games++;
            if(s.name===pg.winner) overall[s.name].wins++;
          });
        });
        const players = Object.entries(overall).sort((a,b)=>b[1].wins-a[1].wins);
        return (
          <div onClick={e=>{if(e.target===e.currentTarget){setSheet(null);setStatsGrpId(null);}}}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,.82)",display:"flex",
            flexDirection:"column",alignItems:"center",justifyContent:"flex-end",zIndex:10}}>
            <div style={{background:G.surface,borderRadius:"20px 20px 0 0",border:`1px solid ${G.border}`,
              width:"100%",maxHeight:"82%",display:"flex",flexDirection:"column"}}>
              <div style={{width:36,height:4,background:G.border,borderRadius:2,margin:"10px auto 8px",flexShrink:0}}/>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"0 16px 10px",flexShrink:0,borderBottom:`1px solid ${G.border}`}}>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:".95rem",color:G.accent}}>📊 Stats — {grp.name}</span>
                <div style={S.iconBtn} onClick={()=>{setSheet(null);setStatsGrpId(null);}}>✕</div>
              </div>
              <div style={{overflowY:"auto",flex:1,padding:"10px 14px 24px"}}>
                {players.length===0
                  ? <div style={{color:G.sub,textAlign:"center",padding:20}}>Aucune partie enregistrée</div>
                  : <>
                      <table style={{width:"100%",borderCollapse:"collapse",fontSize:".78rem",marginBottom:18}}>
                        <thead><tr>
                          <th style={{color:G.sub,fontWeight:400,textAlign:"left",padding:"5px 6px",
                            borderBottom:`1px solid ${G.border}`,fontSize:".58rem",letterSpacing:".1em"}}>JOUEUR</th>
                          <th style={{color:G.sub,fontWeight:400,padding:"5px 6px",
                            borderBottom:`1px solid ${G.border}`,fontSize:".58rem",letterSpacing:".1em"}}>PARTIES</th>
                          <th style={{color:G.sub,fontWeight:400,padding:"5px 6px",
                            borderBottom:`1px solid ${G.border}`,fontSize:".58rem",letterSpacing:".1em"}}>🏆</th>
                          <th style={{color:G.sub,fontWeight:400,padding:"5px 6px",
                            borderBottom:`1px solid ${G.border}`,fontSize:".58rem",letterSpacing:".1em"}}>VICTOIRES</th>
                        </tr></thead>
                        <tbody>
                          {players.map(([name,st])=>{
                            const pct = Math.round(st.wins/st.games*100);
                            const ci = grp.players.indexOf(name);
                            return (
                              <tr key={name}>
                                <td style={{padding:"7px 6px",borderBottom:`1px solid ${G.surface2}`}}>
                                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                                    <div style={{width:8,height:8,borderRadius:"50%",
                                      background:COLORS[(ci>=0?ci:0)%COLORS.length],flexShrink:0}}/>
                                    <span style={{fontFamily:"'Cinzel',serif",fontSize:".82rem",fontWeight:700}}>{name}</span>
                                  </div>
                                </td>
                                <td style={{padding:"7px 6px",borderBottom:`1px solid ${G.surface2}`,textAlign:"center",color:G.sub}}>{st.games}</td>
                                <td style={{padding:"7px 6px",borderBottom:`1px solid ${G.surface2}`,textAlign:"center",
                                  color:G.accent,fontWeight:700,fontFamily:"'Cinzel',serif"}}>{st.wins}</td>
                                <td style={{padding:"7px 6px",borderBottom:`1px solid ${G.surface2}`}}>
                                  <div style={{display:"flex",alignItems:"center",gap:6}}>
                                    <div style={{flex:1,height:4,background:G.surface2,borderRadius:2,overflow:"hidden"}}>
                                      <div style={{height:"100%",borderRadius:2,width:`${pct}%`,background:G.color,transition:"width .3s"}}/>
                                    </div>
                                    <span style={{color:G.text,fontSize:".7rem",minWidth:"3.5ch",textAlign:"right"}}>{pct}%</span>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                      {Object.entries(GAMES).map(([gid,Gx])=>{
                        const gh=(grp.pastGames||[]).filter(pg=>pg.gameId===gid);
                        if(!gh.length) return null;
                        const pp={};
                        gh.forEach(pg=>{
                          (pg.scores||[]).forEach(s=>{
                            if(!pp[s.name]) pp[s.name]={games:0,wins:0,scores:[]};
                            pp[s.name].games++; pp[s.name].scores.push(s.score);
                            if(s.name===pg.winner) pp[s.name].wins++;
                          });
                        });
                        const sorted=Object.entries(pp).sort((a,b)=>b[1].wins-a[1].wins);
                        return (
                          <div key={gid} style={{marginBottom:14}}>
                            <div style={{fontSize:".6rem",letterSpacing:".15em",textTransform:"uppercase",
                              color:G.sub,marginBottom:6,display:"flex",alignItems:"center",gap:5}}>
                              <span>{Gx.emoji}</span><span>{Gx.label}</span>
                              <span style={{opacity:.5}}>({gh.length} partie{gh.length>1?"s":""})</span>
                            </div>
                            {sorted.map(([name,st])=>{
                              const avg=Math.round(st.scores.reduce((a,b)=>a+b,0)/st.scores.length);
                              return (
                                <div key={name} style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                                  padding:"5px 2px",borderBottom:`1px solid ${G.surface2}`}}>
                                  <span style={{fontSize:".78rem",fontWeight:600}}>{name}</span>
                                  <div style={{display:"flex",gap:14,fontSize:".7rem",color:G.sub}}>
                                    <span><strong style={{color:G.accent}}>{st.wins}</strong> 🏆</span>
                                    <span>moy. <strong style={{color:G.text}}>{avg}</strong> pts</span>
                                  </div>
                                </div>
                              );
                            })}
                          </div>
                        );
                      })}
                    </>
                }
              </div>
            </div>
          </div>
        );
      })()}

      {/* ── WIN SCREEN ── */}
      {showWin && g && (()=>{
        const ranked=[...g.players.map((name,i)=>({name,score:g.totals[i]}))];
        ranked.sort((a,b)=>G.winMode==="lowest"?a.score-b.score:b.score-a.score);
        return (
          <div style={{position:"fixed",inset:0,background:G.bg,display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",textAlign:"center",padding:"20px 30px",zIndex:50,overflowY:"auto"}}>
            <div style={{fontSize:"3rem",marginBottom:8}}>🏆</div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.6rem",color:G.accent,fontWeight:900,marginBottom:4}}>{ranked[0].name} gagne !</div>
            <div style={{color:G.sub,fontSize:".82rem",marginBottom:18}}>Partie terminée en {roundNum} {roundLabel.toLowerCase()}{roundNum>1?"s":""}</div>
            <div style={{display:"flex",flexDirection:"column",gap:7,width:"100%",maxWidth:300,marginBottom:28}}>
              {ranked.map((r,idx)=>(
                <div key={idx} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                  background:G.surface,borderRadius:10,padding:"10px 16px",
                  border:`1px solid ${idx===0?G.color:G.border}`}}>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:".9rem"}}>{MEDALS[idx]} {r.name}</span>
                  <span style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:G.accent}}>{r.score} pts</span>
                </div>
              ))}
            </div>
            <Btn ghost G={G} style={{padding:"10px 22px",fontSize:".9rem",marginBottom:12}} onClick={shareResult}>📤 Partager les résultats</Btn>
            <div style={{display:"flex",gap:12}}>
              <Btn ghost G={G} style={{padding:"12px 22px",fontSize:".9rem"}} onClick={()=>{update(a=>{a.activeGame=null;return a;});goHome();}}>🏠 Accueil</Btn>
              <Btn primary G={G} style={{padding:"12px 22px",fontSize:".9rem"}} onClick={rejouer}>🔄 Rejouer</Btn>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── WHO STARTS ───────────────────────────────────────────────────────
const KEY_WHEEL = "who-wheel-v1";
const DOT_COLORS   = ["#ff3f6c","#3f9eff","#3fffb0","#ff9f3f","#bf3fff"];
const WHEEL_COLORS = ["#e63946","#457b9d","#2a9d8f","#e9c46a","#f4a261","#a8dadc","#6d6875","#b5838d","#52b788","#ff6b6b"];

const WHO_CSS = `
  @import url('https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Syne:wght@700;800&display=swap');
  @keyframes wdot-in {from{transform:translate(-50%,-50%) scale(0);opacity:0}to{transform:translate(-50%,-50%) scale(1);opacity:1}}
  @keyframes wring   {0%,100%{transform:scale(1);opacity:.4}50%{transform:scale(1.08);opacity:.7}}
  @keyframes wpulse  {0%{transform:scale(.9);opacity:.6}100%{transform:scale(1.6);opacity:0}}
  @keyframes wlose   {to{transform:translate(-50%,-50%) scale(.15);opacity:0}}
  @keyframes wwin    {0%{transform:translate(-50%,-50%) scale(1)}40%{transform:translate(-50%,-50%) scale(1.5)}70%{transform:translate(-50%,-50%) scale(1.3)}100%{transform:translate(-50%,-50%) scale(1.4)}}
  @keyframes wpulse-w{0%{transform:scale(.9);opacity:.9}100%{transform:scale(2.2);opacity:0}}
  @keyframes wring-w {0%,100%{transform:scale(1);opacity:1}50%{transform:scale(1.15);opacity:.6}}
  @keyframes wcrown  {from{transform:translateX(-50%) scale(0) rotate(-30deg);opacity:0}to{transform:translateX(-50%) scale(1) rotate(0);opacity:1}}
  @keyframes wbounce {0%,100%{transform:translateY(0)}50%{transform:translateY(-10px)}}
  @keyframes wblink  {0%,100%{opacity:.25}50%{opacity:.6}}
  @keyframes wpop    {0%{transform:scale(1)}50%{transform:scale(1.15)}100%{transform:scale(1)}}
  @keyframes wcdpop  {0%{transform:scale(.3);opacity:0}60%{transform:scale(1.1);opacity:1}100%{transform:scale(1)}}
  @keyframes wrfup   {from{opacity:0;transform:translateY(18px)}to{opacity:1;transform:translateY(0)}}
  @keyframes wrname  {from{opacity:0;transform:scale(.5)}to{opacity:1;transform:scale(1)}}
  @keyframes wslidein{from{opacity:0;transform:translateX(-14px)}to{opacity:1;transform:translateX(0)}}
  .wdot{position:fixed;width:120px;height:120px;border-radius:50%;transform:translate(-50%,-50%) scale(0);pointer-events:none;z-index:200;animation:wdot-in .25s cubic-bezier(.34,1.56,.64,1) forwards}
  .wdot .dring{position:absolute;inset:0;border-radius:50%;border:3px solid var(--c);opacity:.5;animation:wring 1.8s ease-in-out infinite}
  .wdot .dpulse{position:absolute;inset:-20px;border-radius:50%;border:2px solid var(--c);opacity:0;animation:wpulse 1.8s ease-out infinite}
  .wdot .dpulse2{position:absolute;inset:-20px;border-radius:50%;border:2px solid var(--c);opacity:0;animation:wpulse 1.8s ease-out .6s infinite}
  .wdot .dcore{position:absolute;width:80px;height:80px;top:50%;left:50%;transform:translate(-50%,-50%);border-radius:50%;background:radial-gradient(circle at 35% 35%,var(--c),#000c);box-shadow:0 0 30px var(--c)}
  .wdot.loser{animation:wlose .5s ease forwards!important}
  .wdot.winner{z-index:210;animation:wwin .6s cubic-bezier(.34,1.56,.64,1) forwards!important}
  .wdot.winner .dcore{width:92px;height:92px}
  .wdot.winner .dring{border-width:4px;opacity:1;animation:wring-w 1s ease-in-out infinite!important}
  .wdot.winner .dpulse{animation:wpulse-w 1s ease-out infinite!important}
  .wdot.winner .dpulse2{animation:wpulse-w 1s ease-out .4s infinite!important}
  .wdot.winner::after{content:'👑';position:absolute;top:-52px;left:50%;transform:translateX(-50%);font-size:36px;animation:wcrown .5s cubic-bezier(.34,1.56,.64,1) .2s both;filter:drop-shadow(0 0 12px gold)}
`;

function loadWheelPlayers() {
  try { const r = localStorage.getItem(KEY_WHEEL); if (r) return JSON.parse(r); } catch { /* ignore */ }
  return [];
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

  const groups = loadGroups();

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
  const wRemove = (i) => saveAndSet(
    wPlayers.filter((_,j)=>j!==i).map((p,j)=>({...p,color:WHEEL_COLORS[j%WHEEL_COLORS.length]}))
  );
  const wLoadGroup = (grp) => saveAndSet(
    grp.players.map((name,i)=>({ name, color:WHEEL_COLORS[i%WHEEL_COLORS.length] }))
  );

  const wDraw = useCallback((angle) => {
    const cv = canvasRef.current; if (!cv || wPlayers.length===0) return;
    const c=cv.getContext("2d"), W=cv.width, cx=W/2, cy=W/2, r=W/2-4;
    const n=wPlayers.length, sl=(Math.PI*2)/n;
    c.clearRect(0,0,W,W);
    wPlayers.forEach((p,i)=>{
      const s=angle+i*sl, e2=s+sl;
      c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,r,s,e2);c.closePath();c.fillStyle=p.color;c.fill();
      c.beginPath();c.moveTo(cx,cy);c.arc(cx,cy,r,s,e2);c.closePath();c.strokeStyle="rgba(26,26,46,.14)";c.lineWidth=2;c.stroke();
      const mid=s+sl/2,lr=r*.62,lx=cx+Math.cos(mid)*lr,ly=cy+Math.sin(mid)*lr;
      c.save();c.translate(lx,ly);c.rotate(mid+Math.PI/2);
      c.fillStyle="rgba(255,255,255,.92)";c.font="bold "+Math.min(36,Math.floor(360/n))+"px Syne,sans-serif";
      c.textAlign="center";c.textBaseline="middle";c.shadowColor="rgba(0,0,0,.3)";c.shadowBlur=6;
      c.fillText(p.name.length>8?p.name.slice(0,7)+"…":p.name,0,0);c.restore();
    });
    c.beginPath();c.arc(cx,cy,26,0,Math.PI*2);c.fillStyle="#1a1a2e";c.fill();
    c.beginPath();c.arc(cx,cy,16,0,Math.PI*2);c.fillStyle="#f5f0e8";c.fill();
  }, [wPlayers]);

  useEffect(() => {
    if (mode==="wheel" && wSub==="spin") requestAnimationFrame(()=>wDraw(wAngleRef.current));
  }, [mode, wSub, wDraw]);

  const wSpin = () => {
    if (wSpinRef.current) return;
    wSpinRef.current=true; setWSpinning(true);
    const extra=6+Math.random()*6, target=wAngleRef.current-Math.PI*2*extra;
    const dur=3500+Math.random()*1200, start=wAngleRef.current, t0=performance.now();
    const ease=t=>1-Math.pow(1-t,4);
    const n=wPlayers.length, sl=(Math.PI*2)/n;
    (function step(now){
      const t=Math.min((now-t0)/dur,1);
      wAngleRef.current=start+(target-start)*ease(t); wDraw(wAngleRef.current);
      if(t<1){ requestAnimationFrame(step); }
      else {
        wAngleRef.current=target; wSpinRef.current=false; setWSpinning(false);
        let norm=((-wAngleRef.current-Math.PI/2)%(Math.PI*2)+Math.PI*2)%(Math.PI*2);
        const w=wPlayers[Math.floor(norm/sl)%n];
        setTimeout(()=>{ setWResult(w); setWSub("result"); },400);
      }
    })(performance.now());
  };

  // ── Fingers touch handlers ──
  useEffect(()=>{
    if (mode!=="fingers") return;
    const MIN_T=2;
    const touchMap = fTouchesRef.current;

    const makeDot=(x,y,idx)=>{
      const d=document.createElement("div"); d.className="wdot";
      d.style.cssText=`left:${x}px;top:${y}px;--c:${DOT_COLORS[idx]}`;
      d.innerHTML=`<div class="dpulse"></div><div class="dpulse2"></div><div class="dring"></div><div class="dcore"></div>`;
      document.body.appendChild(d); return d;
    };
    const cancelCD=()=>{
      if(fTimerRef.current){clearInterval(fTimerRef.current);fTimerRef.current=null;}
      if(fStateRef.current==="countdown") fStateRef.current="waiting";
      setFCdNum(3);
    };
    const reset=()=>{
      cancelCD();
      fTouchesRef.current.forEach(t=>t.el.remove()); fTouchesRef.current.clear();
      fFreeRef.current=[0,1,2,3,4]; fStateRef.current="idle";
      setFPhase("idle"); setFCount(0); setFReplay(false);
    };
    const startCD=()=>{
      if(fStateRef.current==="countdown") return;
      fStateRef.current="countdown"; setFPhase("countdown");
      let val=3; setFCdNum(val);
      fTimerRef.current=setInterval(()=>{
        val--;
        if(val>0){ setFCdNum(val); }
        else {
          clearInterval(fTimerRef.current); fTimerRef.current=null;
          fStateRef.current="result"; setFPhase("result");
          const keys=[...fTouchesRef.current.keys()];
          const wKey=keys[Math.floor(Math.random()*keys.length)];
          fTouchesRef.current.forEach((t,k)=>t.el.classList.add(k===wKey?"winner":"loser"));
          setTimeout(()=>setFReplay(true),800);
        }
      },900);
    };
    const onStart=(e)=>{
      if (e.target.closest && e.target.closest('[data-back]')) return;
      e.preventDefault();
      if(fStateRef.current==="result"){reset();return;}
      for(const t of e.changedTouches){
        if(fTouchesRef.current.size>=5) break;
        const idx=fFreeRef.current.shift(); if(idx===undefined) break;
        fTouchesRef.current.set(t.identifier,{el:makeDot(t.clientX,t.clientY,idx),idx});
      }
      fStateRef.current="waiting";
      const n=fTouchesRef.current.size; setFCount(n); setFPhase(n>0?"waiting":"idle");
      if(n>=MIN_T) startCD();
    };
    const onMove=(e)=>{
      e.preventDefault();
      for(const t of e.changedTouches){
        const d=fTouchesRef.current.get(t.identifier);
        if(d){d.el.style.left=t.clientX+"px";d.el.style.top=t.clientY+"px";}
      }
    };
    const onEnd=(e)=>{
      e.preventDefault();
      if(fStateRef.current==="result") return;
      for(const t of e.changedTouches){
        const d=fTouchesRef.current.get(t.identifier);
        if(d){d.el.remove();fFreeRef.current.push(d.idx);fFreeRef.current.sort((a,b)=>a-b);fTouchesRef.current.delete(t.identifier);}
      }
      const n=fTouchesRef.current.size;
      if(n<MIN_T){cancelCD();fStateRef.current=n>0?"waiting":"idle";}
      setFCount(n); setFPhase(fStateRef.current);
    };
    document.addEventListener("touchstart",  onStart, {passive:false});
    document.addEventListener("touchmove",   onMove,  {passive:false});
    document.addEventListener("touchend",    onEnd,   {passive:false});
    document.addEventListener("touchcancel", onEnd,   {passive:false});
    return ()=>{
      document.removeEventListener("touchstart",  onStart);
      document.removeEventListener("touchmove",   onMove);
      document.removeEventListener("touchend",    onEnd);
      document.removeEventListener("touchcancel", onEnd);
      if(fTimerRef.current) clearInterval(fTimerRef.current);
      touchMap.forEach(t=>t.el.remove());
      touchMap.clear(); fFreeRef.current=[0,1,2,3,4]; fStateRef.current="idle";
    };
  }, [mode]);

  const backBtn = (dark) => (
    <div data-back="true"
      onTouchEnd={e=>{e.stopPropagation();e.preventDefault();if(mode==="hub")onBack();else setMode("hub");}}
      onClick={()=>{ if(mode==="hub") onBack(); else setMode("hub"); }}
      style={{position:"fixed",top:"calc(env(safe-area-inset-top, 0px) + 14px)",left:16,
      background:dark?"rgba(26,26,46,.1)":"rgba(255,255,255,.13)",
      backdropFilter:"blur(8px)",borderRadius:100,padding:"9px 16px",fontSize:13,fontWeight:700,
      color:dark?"#1a1a2e":"white",cursor:"pointer",letterSpacing:1,zIndex:999,userSelect:"none"}}>← Retour</div>
  );

  // ── HUB ──
  if (mode==="hub") return (
    <div style={{fontFamily:"'DM Sans',sans-serif",background:"#1a1a2e",color:"#f5f0e8",width:"100%",minHeight:"100vh",
      display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"40px 28px 60px",
      backgroundImage:"radial-gradient(ellipse 70% 50% at 20% 110%,rgba(230,57,70,.13) 0%,transparent 60%),radial-gradient(ellipse 60% 50% at 80% -10%,rgba(69,123,157,.10) 0%,transparent 60%)"}}>
      <style>{WHO_CSS}</style>
      {backBtn(false)}
      <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(56px,17vw,80px)",letterSpacing:2,lineHeight:1,textAlign:"center",marginBottom:6}}>
        Qui <span style={{color:"#e63946"}}>commence</span> ?
      </div>
      <div style={{fontSize:11,letterSpacing:4,textTransform:"uppercase",color:"rgba(245,240,232,.3)",marginBottom:48}}>Choisissez un mode</div>
      <div style={{display:"flex",flexDirection:"column",gap:16,width:"100%",maxWidth:360}}>
        <div onClick={()=>setMode("fingers")} style={{background:"#f5f0e8",color:"#1a1a2e",borderRadius:20,padding:"26px 26px 52px",cursor:"pointer",position:"relative",overflow:"hidden",userSelect:"none"}}>
          <div style={{fontSize:11,letterSpacing:2,textTransform:"uppercase",opacity:.4,marginBottom:10,fontWeight:700}}>2 – 5 joueurs</div>
          <div style={{fontSize:44,marginBottom:10}}>☝️</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,letterSpacing:1,marginBottom:4}}>Doigts sur l'écran</div>
          <div style={{fontSize:13,opacity:.5,lineHeight:1.5}}>Posez tous vos doigts simultanément. Le hasard désigne le gagnant.</div>
          <div style={{position:"absolute",bottom:22,right:22,width:34,height:34,borderRadius:"50%",background:"#1a1a2e",color:"#f5f0e8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>→</div>
        </div>
        <div onClick={()=>{ setMode("wheel"); setWSub(wPlayers.length>=2?"spin":"setup"); }} style={{background:"#e63946",color:"#f5f0e8",borderRadius:20,padding:"26px 26px 52px",cursor:"pointer",position:"relative",overflow:"hidden",userSelect:"none"}}>
          <div style={{fontSize:11,letterSpacing:2,textTransform:"uppercase",opacity:.4,marginBottom:10,fontWeight:700}}>2 – 10 joueurs</div>
          <div style={{fontSize:44,marginBottom:10}}>🎡</div>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:30,letterSpacing:1,marginBottom:4}}>Roulette de prénoms</div>
          <div style={{fontSize:13,opacity:.5,lineHeight:1.5}}>Choisissez un groupe ou entrez des noms, faites tourner la roue.</div>
          <div style={{position:"absolute",bottom:22,right:22,width:34,height:34,borderRadius:"50%",background:"rgba(255,255,255,.2)",color:"#f5f0e8",display:"flex",alignItems:"center",justifyContent:"center",fontSize:16}}>→</div>
        </div>
      </div>
    </div>
  );

  // ── FINGERS ──
  if (mode==="fingers") return (
    <div style={{position:"fixed",inset:0,background:"#0a0a0f",color:"#f0eee8",touchAction:"none",display:"flex",
      flexDirection:"column",alignItems:"center",justifyContent:"center",
      backgroundImage:"radial-gradient(ellipse 60% 40% at 20% 80%,rgba(255,63,108,.08) 0%,transparent 60%),radial-gradient(ellipse 50% 50% at 80% 20%,rgba(99,102,241,.07) 0%,transparent 60%)"}}>
      <style>{WHO_CSS}</style>
      {backBtn(false)}
      {fPhase==="idle" && (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",padding:"80px 20px 40px",gap:14,pointerEvents:"none"}}>
          <div style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(48px,14vw,76px)",letterSpacing:4,lineHeight:1}}>
            Posez vos <span style={{color:"#ff3f6c"}}>doigts</span>
          </div>
          <div style={{fontSize:15,color:"#555566",maxWidth:240,lineHeight:1.6}}>Posez tous vos doigts en même temps sur l'écran</div>
          <div style={{marginTop:20,display:"flex",flexDirection:"column",alignItems:"center",gap:10}}>
            <div style={{fontSize:48,animation:"wbounce 2s ease-in-out infinite"}}>☝️</div>
            <div style={{fontSize:12,color:"#555566",letterSpacing:2,textTransform:"uppercase"}}>Jusqu'à 5 doigts</div>
          </div>
        </div>
      )}
      {(fPhase==="waiting"||fPhase==="countdown") && (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",textAlign:"center",pointerEvents:"none"}}>
          <div style={{fontSize:13,letterSpacing:3,textTransform:"uppercase",color:"#555566"}}>Doigts posés</div>
          <div key={fCount} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(80px,28vw,130px)",lineHeight:1,animation:"wpop .2s cubic-bezier(.34,1.56,.64,1)"}}>{fCount}</div>
          <div style={{fontSize:14,color:"#555566"}}>
            {fCount<2?<span>Encore <span style={{color:"#ff3f6c",fontWeight:600}}>{2-fCount}</span> doigt{2-fCount>1?"s":""} pour lancer</span>:<span>Prêt ! Ne bougez plus…</span>}
          </div>
        </div>
      )}
      {fPhase==="countdown" && (
        <div style={{position:"fixed",inset:0,background:"rgba(10,10,15,.85)",backdropFilter:"blur(8px)",
          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:10,zIndex:50,pointerEvents:"none"}}>
          <div key={fCdNum} style={{fontFamily:"'Bebas Neue',sans-serif",fontSize:"clamp(120px,38vw,190px)",color:"#f0eee8",lineHeight:1,animation:"wcdpop .8s cubic-bezier(.34,1.56,.64,1)"}}>{fCdNum}</div>
          <div style={{fontSize:13,letterSpacing:4,textTransform:"uppercase",color:"#555566"}}>Ne bougez pas !</div>
        </div>
      )}
      {fReplay && (
        <div style={{position:"fixed",bottom:56,left:"50%",transform:"translateX(-50%)",fontSize:12,letterSpacing:3,
          textTransform:"uppercase",color:"rgba(255,255,255,.25)",animation:"wblink 2s ease-in-out infinite",
          whiteSpace:"nowrap",pointerEvents:"none",zIndex:51}}>Touchez pour rejouer</div>
      )}
    </div>
  );

  // ── WHEEL ──
  if (mode==="wheel") return (
    <div style={{position:"fixed",inset:0,background:wSub==="setup"?"#f5f0e8":"#1a1a2e",overflow:"hidden",display:"flex",flexDirection:"column"}}>
      <style>{WHO_CSS}</style>

      {/* Setup */}
      {wSub==="setup" && (
        <div style={{display:"flex",flexDirection:"column",height:"100%",background:"#f5f0e8",color:"#1a1a2e",touchAction:"auto"}}>
          <div style={{paddingTop:"calc(env(safe-area-inset-top, 0px) + 14px)",paddingLeft:28,paddingRight:28,paddingBottom:20,background:"#1a1a2e",flexShrink:0,position:"relative"}}>
            {backBtn(false)}
            <div style={{paddingLeft:80}}>
              <div style={{fontSize:32,fontWeight:800,color:"#f5f0e8",letterSpacing:-1,lineHeight:1}}>Qui <span style={{color:"#e63946"}}>commence ?</span></div>
              <div style={{fontSize:11,color:"rgba(245,240,232,.4)",marginTop:5,letterSpacing:1}}>ROULETTE DE PRÉNOMS</div>
            </div>
            <div style={{position:"absolute",top:52,right:28,background:"#e63946",color:"white",fontSize:20,fontWeight:700,width:44,height:44,borderRadius:"50%",display:"flex",alignItems:"center",justifyContent:"center"}}>{wPlayers.length}</div>
          </div>
          {groups.length>0 && (
            <div style={{padding:"10px 16px 8px",borderBottom:"1px solid rgba(26,26,46,.08)",flexShrink:0}}>
              <div style={{fontSize:10,letterSpacing:3,textTransform:"uppercase",color:"rgba(26,26,46,.35)",marginBottom:6}}>Charger un groupe</div>
              <div style={{display:"flex",flexWrap:"wrap",gap:6}}>
                {groups.map(grp=>(
                  <div key={grp.id} onClick={()=>wLoadGroup(grp)} style={{background:"#1a1a2e",color:"#f5f0e8",borderRadius:100,padding:"6px 14px",fontSize:12,fontWeight:700,cursor:"pointer",userSelect:"none"}}>{grp.name}</div>
                ))}
              </div>
            </div>
          )}
          <div style={{padding:"14px 24px",display:"flex",gap:10,flexShrink:0,borderBottom:"1px solid rgba(26,26,46,.1)"}}>
            <input type="text" placeholder="Ajouter un joueur…" maxLength={20} value={wInput}
              onChange={e=>setWInput(e.target.value)} onKeyDown={e=>{if(e.key==="Enter")wAdd();}}
              style={{flex:1,fontFamily:"'DM Sans',sans-serif",fontSize:16,fontWeight:700,color:"#1a1a2e",background:"transparent",border:"none",borderBottom:"2px solid #1a1a2e",padding:"8px 4px",outline:"none"}}/>
            <button onClick={wAdd} style={{width:42,height:42,borderRadius:"50%",background:"#1a1a2e",color:"#f5f0e8",border:"none",fontSize:24,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",userSelect:"none"}}>+</button>
          </div>
          <div style={{flex:1,overflowY:"auto",WebkitOverflowScrolling:"touch",paddingBottom:100}}>
            {wPlayers.map((p,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",padding:"13px 24px",borderBottom:"1px solid rgba(26,26,46,.08)",gap:12,animation:"wslidein .2s ease"}}>
                <div style={{width:13,height:13,borderRadius:"50%",background:p.color,flexShrink:0}}/>
                <div style={{fontSize:17,fontWeight:700,flex:1}}>{p.name}</div>
                <button onClick={()=>wRemove(i)} style={{width:28,height:28,borderRadius:"50%",background:"transparent",border:"1.5px solid rgba(26,26,46,.12)",color:"#9a9a8a",fontSize:16,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",userSelect:"none"}}>×</button>
              </div>
            ))}
          </div>
          <div style={{position:"absolute",bottom:0,left:0,right:0,padding:"20px 28px 40px",background:"linear-gradient(transparent,#f5f0e8 40%)",display:"flex",justifyContent:"center"}}>
            <button onClick={()=>{if(wPlayers.length>=2)setWSub("spin");}}
              style={{background:wPlayers.length>=2?"#e63946":"#9a9a8a",color:"#f5f0e8",fontFamily:"'DM Sans',sans-serif",fontSize:15,fontWeight:800,letterSpacing:2,textTransform:"uppercase",border:"none",padding:"17px 44px",borderRadius:100,cursor:"pointer",width:"100%",maxWidth:320,opacity:wPlayers.length>=2?1:.5,userSelect:"none"}}>
              Lancer la roulette
            </button>
          </div>
        </div>
      )}

      {/* Spin */}
      {wSub==="spin" && (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,position:"relative",
          backgroundImage:"radial-gradient(ellipse 80% 60% at 50% 60%,rgba(230,57,70,.14) 0%,transparent 70%)"}}>
          {backBtn(false)}
          <div style={{fontSize:11,letterSpacing:4,textTransform:"uppercase",color:"rgba(245,240,232,.28)",marginBottom:28,zIndex:1}}>Roulette</div>
          <div style={{position:"relative",width:"min(80vw,340px)",aspectRatio:"1",zIndex:1}}>
            <div style={{position:"absolute",top:-17,left:"50%",transform:"translateX(-50%)",width:0,height:0,borderLeft:"11px solid transparent",borderRight:"11px solid transparent",borderTop:"24px solid #e63946",filter:"drop-shadow(0 3px 6px rgba(230,57,70,.5))",zIndex:2}}/>
            <canvas ref={canvasRef} width={600} height={600} style={{width:"100%",height:"100%",borderRadius:"50%",filter:"drop-shadow(0 0 36px rgba(230,57,70,.28))"}}/>
          </div>
          <button onClick={wSpin} disabled={wSpinning}
            style={{marginTop:30,background:"#e63946",color:"white",fontFamily:"'DM Sans',sans-serif",fontSize:16,fontWeight:800,letterSpacing:3,textTransform:"uppercase",border:"none",padding:"18px 50px",borderRadius:100,cursor:"pointer",zIndex:1,boxShadow:"0 8px 28px rgba(230,57,70,.4)",userSelect:"none",opacity:wSpinning?.5:1}}>
            Tourner !
          </button>
          <button onClick={()=>setWSub("setup")} style={{marginTop:14,fontSize:11,letterSpacing:2,textTransform:"uppercase",color:"rgba(245,240,232,.22)",background:"transparent",border:"none",cursor:"pointer",zIndex:1,padding:"8px 16px",fontFamily:"'DM Sans',sans-serif"}}>← Modifier les joueurs</button>
        </div>
      )}

      {/* Result */}
      {wSub==="result" && wResult && (
        <div style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",flex:1,textAlign:"center",position:"relative",overflow:"hidden"}}>
          <div style={{position:"absolute",width:"120vw",height:"120vw",borderRadius:"50%",top:"50%",left:"50%",transform:"translate(-50%,-50%)",background:wResult.color,opacity:.18,zIndex:0}}/>
          <div style={{fontSize:11,letterSpacing:5,textTransform:"uppercase",color:"rgba(245,240,232,.38)",zIndex:1,marginBottom:10,animation:"wrfup .5s ease .3s both"}}>Le sort a parlé</div>
          <div style={{fontSize:"clamp(52px,15vw,84px)",fontWeight:800,color:"#f5f0e8",zIndex:1,letterSpacing:-2,lineHeight:1,textAlign:"center",padding:"0 20px",animation:"wrname .7s cubic-bezier(.34,1.56,.64,1) .15s both"}}>{wResult.name}</div>
          <div style={{fontSize:13,color:"rgba(245,240,232,.32)",zIndex:1,marginTop:10,letterSpacing:1,animation:"wrfup .5s ease .5s both"}}>commence en premier !</div>
          <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:10,marginTop:44,zIndex:1,animation:"wrfup .5s ease .7s both"}}>
            <button onClick={()=>{ setWSub("spin"); setTimeout(()=>wDraw(wAngleRef.current),100); }}
              style={{background:"#f5f0e8",color:"#1a1a2e",fontFamily:"'DM Sans',sans-serif",fontSize:14,fontWeight:800,letterSpacing:2,textTransform:"uppercase",border:"none",padding:"17px 40px",borderRadius:100,cursor:"pointer",userSelect:"none"}}>Retourner</button>
            <button onClick={()=>setWSub("setup")} style={{fontFamily:"'DM Sans',sans-serif",fontSize:11,letterSpacing:2,textTransform:"uppercase",color:"rgba(245,240,232,.22)",background:"transparent",border:"none",cursor:"pointer",padding:"8px 14px"}}>Modifier les joueurs</button>
          </div>
        </div>
      )}
    </div>
  );

  return null;
}

// ── SELECTOR SCREEN ───────────────────────────────────────────────────
function GameSelector({ onSelect }) {
  const [showHistory,  setShowHistory]  = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [importMsg,    setImportMsg]    = useState(null);
  const [updateMsg,    setUpdateMsg]    = useState(null);
  const [updating,     setUpdating]     = useState(false);

  const allHistory = () => {
    const groups = loadGroups();
    const entries = [];
    groups.forEach(grp => {
      (grp.pastGames||[]).forEach(pg => entries.push({ ...pg, groupName: grp.name }));
    });
    return entries.sort((a,b) => new Date(b.date) - new Date(a.date));
  };

  async function checkUpdate() {
    setUpdating(true); setUpdateMsg(null);
    try {
      if (!('serviceWorker' in navigator)) {
        setUpdateMsg('⚠️ Service Worker non supporté ici — recharge manuellement.');
        setUpdating(false); return;
      }
      const reg = await navigator.serviceWorker.getRegistration();
      if (!reg) { window.location.reload(); return; }

      // controllerchange = nouveau SW actif → recharge
      const reload = () => window.location.reload();
      navigator.serviceWorker.addEventListener('controllerchange', reload);

      await reg.update(); // fetch latest SW from server

      if (reg.waiting) {
        reg.waiting.postMessage({ type: 'SKIP_WAITING' });
        // Fallback : iOS ne déclenche pas toujours controllerchange
        setTimeout(reload, 1500);
      } else if (reg.installing) {
        reg.installing.addEventListener('statechange', e => {
          if (e.target.state === 'installed') {
            e.target.postMessage({ type: 'SKIP_WAITING' });
            setTimeout(reload, 1500);
          }
        });
      } else {
        navigator.serviceWorker.removeEventListener('controllerchange', reload);
        setUpdateMsg('✓ Vous avez déjà la dernière version !');
        setUpdating(false);
      }
    } catch {
      setUpdateMsg('⚠️ Impossible de vérifier — vérifie ta connexion.');
      setUpdating(false);
    }
  }

  function exportGroups() {
    const json = localStorage.getItem(KEY_GROUPS) || '[]';
    const file = new File([json], 'score-keeper-groupes.json', { type: 'application/json' });
    if (navigator.canShare?.({ files: [file] })) {
      navigator.share({ files: [file], title: 'Score Keeper — Groupes' }).catch(()=>{});
    } else {
      navigator.clipboard?.writeText(json)
        .then(()=>setImportMsg('✓ Données copiées dans le presse-papiers'))
        .catch(()=>setImportMsg('Copie impossible — ouvre la console et copie manuellement'));
    }
  }

  function importGroups(file) {
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const groups = JSON.parse(e.target.result);
        if (!Array.isArray(groups)) throw new Error();
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
      paddingBottom:"max(100px, calc(env(safe-area-inset-bottom, 0px) + 90px))",
      backgroundImage:"radial-gradient(ellipse at 50% 30%,rgba(120,80,200,.15) 0%,transparent 60%)"}}>
      <style>{`@import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@700;900&family=DM+Sans:wght@400;500;600&display=swap'); *{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}`}</style>

      {/* Bottom bar — history (right) + settings (left) */}
      <div style={{position:"fixed",bottom:"calc(env(safe-area-inset-bottom, 0px) + 20px)",
        left:0,right:0,display:"flex",justifyContent:"space-between",padding:"0 20px",
        pointerEvents:"none",zIndex:10}}>
        <div onClick={()=>setShowSettings(true)} style={{pointerEvents:"auto",
          background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.14)",
          borderRadius:28,padding:"11px 20px",fontSize:".75rem",color:"rgba(255,255,255,.65)",
          cursor:"pointer",display:"flex",alignItems:"center",gap:7,letterSpacing:".05em",
          boxShadow:"0 4px 24px rgba(0,0,0,.45)",backdropFilter:"blur(8px)"}}>
          ⚙️ Données
        </div>
        <div onClick={()=>setShowHistory(true)} style={{pointerEvents:"auto",
          background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.14)",
          borderRadius:28,padding:"11px 20px",fontSize:".75rem",color:"rgba(255,255,255,.65)",
          cursor:"pointer",display:"flex",alignItems:"center",gap:7,letterSpacing:".05em",
          boxShadow:"0 4px 24px rgba(0,0,0,.45)",backdropFilter:"blur(8px)"}}>
          📋 Historique
        </div>
      </div>

      <div style={{fontFamily:"'Cinzel',serif",fontSize:"1rem",fontWeight:700,color:"rgba(255,255,255,.25)",
        letterSpacing:".3em",textTransform:"uppercase",marginBottom:8}}>Score Keeper</div>
      <div style={{fontFamily:"'Cinzel',serif",fontSize:"2rem",fontWeight:900,color:"#fff",
        letterSpacing:".1em",marginBottom:6}}>Quel jeu ?</div>
      <div style={{color:"rgba(255,255,255,.35)",fontSize:".75rem",marginBottom:32}}>Choisis ton jeu pour commencer</div>

      <div style={{display:"flex",flexDirection:"column",gap:14,width:"100%",maxWidth:320}}>
        {/* Qui commence — premier */}
        <div onClick={()=>onSelect("whoStarts")}
          style={{background:"linear-gradient(135deg,#1a1a2e 0%,#0d0d1a 100%)",border:"1px solid #e6394644",
          borderRadius:20,padding:"20px 24px",cursor:"pointer",display:"flex",alignItems:"center",gap:16,
          boxShadow:"0 4px 24px rgba(230,57,70,.1)"}}>
          <div style={{fontSize:"2.8rem",flexShrink:0,lineHeight:1}}>🎲</div>
          <div style={{flex:1}}>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.3rem",fontWeight:900,color:"#e63946",letterSpacing:".06em"}}>QUI COMMENCE ?</div>
            <div style={{fontSize:".7rem",color:"rgba(255,255,255,.4)",marginTop:4}}>Doigts sur l'écran ou roulette de noms</div>
          </div>
          <div style={{color:"#e63946",fontSize:"1.2rem",flexShrink:0,opacity:.6}}>›</div>
        </div>

        {/* Games */}
        {Object.entries(GAMES).map(([id,G])=>(
          <div key={id} onClick={()=>onSelect(id)}
            style={{background:`linear-gradient(135deg,${G.surface} 0%,${G.bg} 100%)`,
            border:`1px solid ${G.color}44`,borderRadius:20,padding:"20px 24px",cursor:"pointer",
            display:"flex",alignItems:"center",gap:16,boxShadow:`0 4px 24px ${G.colorDim}`}}>
            <div style={{fontSize:"2.8rem",flexShrink:0,lineHeight:1}}>{G.emoji}</div>
            <div style={{flex:1}}>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.3rem",fontWeight:900,
                color:G.accent,letterSpacing:".06em"}}>{G.label.toUpperCase()}</div>
              {G.desc.split("\n").map((line,i)=>(
                <div key={i} style={{fontSize:".7rem",color:"rgba(255,255,255,.4)",marginTop:i===0?4:1,letterSpacing:".04em"}}>{line}</div>
              ))}
            </div>
            <div style={{color:G.accent,fontSize:"1.2rem",flexShrink:0,opacity:.6}}>›</div>
          </div>
        ))}
      </div>

      {/* ── SETTINGS SHEET ── */}
      {showSettings && (
        <div onClick={e=>{if(e.target===e.currentTarget){setShowSettings(false);setImportMsg(null);setUpdateMsg(null);}}}
          style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",
          flexDirection:"column",alignItems:"center",justifyContent:"flex-end",zIndex:50}}>
          <div style={{background:"#13121a",borderRadius:"20px 20px 0 0",border:"1px solid rgba(255,255,255,.08)",
            width:"100%",display:"flex",flexDirection:"column"}}>
            <div style={{width:36,height:4,background:"rgba(255,255,255,.15)",borderRadius:2,margin:"10px auto 8px"}}/>
            <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
              padding:"0 16px 12px",borderBottom:"1px solid rgba(255,255,255,.07)"}}>
              <span style={{fontFamily:"'Cinzel',serif",fontSize:".95rem",color:"#fff"}}>⚙️ Données & sauvegarde</span>
              <div style={{fontSize:".62rem",color:"rgba(255,255,255,.2)",letterSpacing:".08em"}}>
                Version {__APP_VERSION__} — {__BUILD_DATE__}
              </div>
              <div onClick={()=>{setShowSettings(false);setImportMsg(null);setUpdateMsg(null);}}
                style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.1)",
                borderRadius:8,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>✕</div>
            </div>
            <div style={{padding:"16px 18px 32px",display:"flex",flexDirection:"column",gap:10}}>

              {/* Update */}
              <div onClick={updating ? undefined : checkUpdate}
                style={{background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.12)",
                borderRadius:14,padding:"16px 18px",cursor:updating?"default":"pointer",
                display:"flex",alignItems:"center",gap:14,opacity:updating?.6:1}}>
                <span style={{fontSize:"1.6rem"}}>{updating?"⏳":"🔄"}</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:".9rem",marginBottom:3}}>
                    {updating?"Vérification en cours…":"Charger la dernière version"}
                  </div>
                  <div style={{fontSize:".72rem",color:"rgba(255,255,255,.4)"}}>
                    Vérifie et installe la mise à jour, puis recharge l'app
                  </div>
                </div>
              </div>
              {updateMsg && (
                <div style={{textAlign:"center",fontSize:".8rem",padding:"4px 10px",
                  color:updateMsg.startsWith('✓')?"#4ade80":"#f87171"}}>
                  {updateMsg}
                </div>
              )}

              {/* Export */}
              <div onClick={exportGroups}
                style={{background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.12)",
                borderRadius:14,padding:"16px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
                <span style={{fontSize:"1.6rem"}}>📤</span>
                <div>
                  <div style={{fontWeight:700,fontSize:".9rem",marginBottom:3}}>Exporter mes groupes</div>
                  <div style={{fontSize:".72rem",color:"rgba(255,255,255,.4)"}}>Partage un fichier .json vers Fichiers, AirDrop, Messages…</div>
                </div>
              </div>

              {/* Import */}
              <label style={{background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.12)",
                borderRadius:14,padding:"16px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
                <span style={{fontSize:"1.6rem"}}>📥</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:".9rem",marginBottom:3}}>Importer des groupes</div>
                  <div style={{fontSize:".72rem",color:"rgba(255,255,255,.4)"}}>Sélectionne le fichier .json précédemment exporté</div>
                </div>
                <input type="file" accept=".json,application/json" style={{display:"none"}}
                  onChange={e=>{if(e.target.files?.[0]) importGroups(e.target.files[0]);}}/>
              </label>

              {/* Feedback message */}
              {importMsg && (
                <div style={{textAlign:"center",fontSize:".8rem",padding:"10px",
                  color: importMsg.startsWith('✓') ? "#4ade80" : "#f87171"}}>
                  {importMsg}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ── HISTORY OVERLAY ── */}
      {showHistory && (()=>{
        const history = allHistory();
        return (
          <div onClick={e=>{if(e.target===e.currentTarget)setShowHistory(false);}}
            style={{position:"fixed",inset:0,background:"rgba(0,0,0,.85)",display:"flex",
            flexDirection:"column",alignItems:"center",justifyContent:"flex-end",zIndex:50}}>
            <div style={{background:"#13121a",borderRadius:"20px 20px 0 0",border:"1px solid rgba(255,255,255,.08)",
              width:"100%",maxHeight:"82%",display:"flex",flexDirection:"column"}}>
              <div style={{width:36,height:4,background:"rgba(255,255,255,.15)",borderRadius:2,margin:"10px auto 8px",flexShrink:0}}/>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",
                padding:"0 16px 12px",flexShrink:0,borderBottom:"1px solid rgba(255,255,255,.07)"}}>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:".95rem",color:"#fff"}}>📋 Toutes les parties</span>
                <div onClick={()=>setShowHistory(false)} style={{background:"rgba(255,255,255,.08)",border:"1px solid rgba(255,255,255,.1)",
                  borderRadius:8,width:34,height:34,display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer"}}>✕</div>
              </div>
              <div style={{overflowY:"auto",flex:1,padding:"8px 14px 24px"}}>
                {history.length===0
                  ? <div style={{color:"rgba(255,255,255,.3)",textAlign:"center",padding:30,fontSize:".85rem"}}>Aucune partie enregistrée</div>
                  : history.map((pg,i)=>{
                      const pgGame = GAMES[pg.gameId];
                      const ds = new Date(pg.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
                      const sorted = [...pg.scores].sort((a,b)=> pgGame?.winMode==="lowest" ? a.score-b.score : b.score-a.score);
                      return (
                        <div key={i} style={{padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.05)",display:"flex",alignItems:"flex-start",gap:10}}>
                          <div style={{fontSize:"1.3rem",flexShrink:0,marginTop:2}}>{pgGame?.emoji||"🎮"}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                              <span style={{fontFamily:"'Cinzel',serif",fontSize:".82rem",color:pgGame?.accent||"#fff",fontWeight:700}}>🏆 {pg.winner}</span>
                              <span style={{fontSize:".62rem",color:"rgba(255,255,255,.25)",background:"rgba(255,255,255,.06)",borderRadius:4,padding:"2px 6px"}}>{pg.groupName}</span>
                            </div>
                            <div style={{fontSize:".63rem",color:"rgba(255,255,255,.35)",lineHeight:1.6}}>
                              {sorted.map((s,j)=>`${MEDALS[j]} ${s.name} ${s.score}pts`).join(" · ")}
                            </div>
                          </div>
                          <div style={{flexShrink:0,textAlign:"right"}}>
                            <div style={{fontSize:".6rem",color:"rgba(255,255,255,.3)"}}>{ds}</div>
                            <div style={{fontSize:".58rem",color:"rgba(255,255,255,.2)"}}>{pg.rounds} tour{pg.rounds>1?"s":""}</div>
                          </div>
                        </div>
                      );
                    })
                }
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
}

// ── ROOT ─────────────────────────────────────────────────────────────
export default function Root() {
  const [gameId, setGameId] = useState(null);
  if (gameId==="whoStarts") return <WhoStartsApp onBack={()=>setGameId(null)}/>;
  return gameId
    ? <GameApp gameId={gameId} onBack={()=>setGameId(null)}/>
    : <GameSelector onSelect={setGameId}/>;
}
