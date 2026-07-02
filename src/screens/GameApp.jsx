import { useState, useCallback, useMemo } from "react";
import { GAMES, COLORS, MEDALS, genId, DEFAULT_LIMITS } from '../games.config.js';
import { loadData, saveGroups, saveActiveGame } from '../storage.js';
import { makeActiveGame, computeTourScores, isGameOver, recordPastGame, tmGetAllFields, computeTMTotal, reussiteRankRewards, medalRank, makeWinSnapshot } from '../gameLogic.js';
import { Btn, GIcon, MIN_PLAYERS, LimitCtrl, PlayerEditRow, BottomSheet } from '../ui.jsx';
import { ClassicBoard } from './boards/ClassicBoard.jsx';
import { SheetBoard } from './boards/SheetBoard.jsx';
import { ContractsBoard } from './boards/ContractsBoard.jsx';

export function GameApp({ gameId, onBack }) {
  const G = GAMES[gameId];
  const [data, setData] = useState(()=>loadData(gameId));
  const [screen, setScreen] = useState("home");
  const [sheet, setSheet] = useState(null);
  const [showWin, setShowWin] = useState(false);
  const [winSnapshot, setWinSnapshot] = useState(null);
  const [toast, setToast] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const [editState, setEditState] = useState(null);
  const [quickState, setQuickState] = useState(null);
  const [pastGroupId, setPastGroupId] = useState(null);
  const [statsGrpId, setStatsGrpId]   = useState(null);

  const persist = useCallback((next) => {
    try {
      saveGroups(next.groups);
      saveActiveGame(gameId, next.activeGame);
      setSaveError(false);
      setToast(true); setTimeout(()=>setToast(false), 1600);
    } catch(e) { console.error('persist failed', e); setSaveError(true); }
  }, [gameId]);

  const update = useCallback((fn) => {
    setData(prev => { const next=fn(structuredClone(prev)); persist(next); return next; });
  }, [persist]);

  const g = data.activeGame;
  const gameGroupName = g?.groupId ? (data.groups.find(x=>x.id===g.groupId)?.name||G.label) : "Partie rapide";

  const S = useMemo(() => ({
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
    footer: { flexShrink:0, padding:`8px 12px calc(env(safe-area-inset-bottom, 0px) + 8px)`, borderTop:`1px solid ${G.border}`, display:"flex", gap:8 },
    iconBtn: { background:G.surface2, border:`1px solid ${G.border}`, borderRadius:8, width:40, height:40,
      display:"flex", alignItems:"center", justifyContent:"center", fontSize:".95rem", cursor:"pointer", flexShrink:0 },
  }), [G]);

  function getGroupLimit(grp) {
    return grp.limits?.[gameId] ?? G.defaultLimit;
  }

  function initTMGame(ag, exts, players) {
    const fields = tmGetAllFields(G, exts);
    ag.tmScores = players.map(() => Object.fromEntries(fields.map(f => [f.key, f.default ?? 0])));
    ag.tmExtensions = exts;
    ag.totals = ag.tmScores.map(s => computeTMTotal(s, fields));
  }

  function startGroupGame(groupId) {
    if (data.activeGame) {
      if (data.activeGame.groupId===groupId) {
        if (window.confirm("Une partie est en cours. La reprendre ?")) { setScreen("game"); return; }
      } else {
        if (!window.confirm("Une autre partie est en cours. L'abandonner et en commencer une nouvelle ?")) return;
      }
    }
    const grp = data.groups.find(x=>x.id===groupId);
    const limit = getGroupLimit(grp);
    update(a => {
      const ag=makeActiveGame(gameId, groupId, [...grp.players], limit);
      if(G.scoreType==="sheet") initTMGame(ag, grp.tmExtensions||{}, grp.players);
      a.activeGame=ag;
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
      tmExtensions: grp?.tmExtensions
        ? {...grp.tmExtensions}
        : Object.fromEntries((G.extensions||[]).map(e=>[e.key,false])),
    });
    setScreen("editGroup");
  }
  function saveGroup() {
    const {id,name,players,limits,tmExtensions}=editState;
    const n=name.trim(); if(!n){alert("Donne un nom au groupe !");return;}
    const pl=players.map(p=>p.trim()).filter(p=>p.length>0); if(pl.length<MIN_PLAYERS){alert(`Il faut au moins ${MIN_PLAYERS} joueurs !`);return;}
    update(a=>{
      if(id){
        const grp=a.groups.find(x=>x.id===id);
        grp.name=n; grp.players=pl; grp.limits=limits; grp.tmExtensions=tmExtensions;
      } else {
        a.groups.push({id:genId(),name:n,players:pl,limits:{...limits},tmExtensions:{...tmExtensions},pastGames:[]});
      }
      return a;
    });
    setScreen("home");
  }
  function deleteGroup() {
    if(!window.confirm("Supprimer ce groupe ?"))return;
    update(a=>{
      a.groups=a.groups.filter(g=>g.id!==editState.id);
      if(a.activeGame?.groupId===editState.id) a.activeGame=null;
      return a;
    });
    setScreen("home");
  }

  function openQuickSetup(){
    const init={players:["",""],limit:G.defaultLimit};
    if(G.scoreType==="sheet") init.tmExtensions=Object.fromEntries((G.extensions||[]).map(e=>[e.key,false]));
    setQuickState(init);
    setScreen("quickSetup");
  }
  function startQuickGame(){
    const players=quickState.players.map(p=>p.trim()).filter(p=>p.length>0);
    if(players.length<MIN_PLAYERS){alert(`Il faut au moins ${MIN_PLAYERS} joueurs !`);return;}
    update(a=>{
      const ag=makeActiveGame(gameId, null, players, quickState.limit);
      if(G.scoreType==="sheet") initTMGame(ag, quickState.tmExtensions||{}, players);
      a.activeGame=ag;
      return a;
    });
    setScreen("game");
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

  function getRankIcon(idx){
    if(!g) return "";
    return["🥇","🥈","🥉","","",""][medalRank(g.totals[idx], g.totals, G.winMode)]||"";
  }

  function validerRound(){
    if(!g) return;
    let tourScores;
    if(gameId==="flip7"){
      tourScores=computeTourScores(gameId,g.current,g.flip7,[],g.flip7dbl||[]);
    } else if(gameId==="skyjo"){
      tourScores=computeTourScores(gameId,g.current,[],g.doubled);
    } else {
      tourScores=computeTourScores(gameId,g.current);
    }
    const newTotals=g.totals.map((t,i)=>t+tourScores[i]);
    const won=!G.endOnDemand && isGameOver(newTotals, g.limit);
    const winSnap=won ? makeWinSnapshot(g, G, gameId, newTotals) : null;

    update(a=>{
      const ag=a.activeGame;
      if(gameId==="flip7"){
        ag.history.push({scores:[...tourScores],flip7:[...ag.flip7],flip7dbl:[...(ag.flip7dbl||[])]});
      } else if(gameId==="skyjo"){
        ag.history.push({scores:[...tourScores],doubled:[...ag.doubled]});
      } else {
        ag.history.push([...ag.current]);
      }
      tourScores.forEach((pts,i)=>{ ag.totals[i]+=pts; });

      if(won){
        if(ag.groupId){
          const grp=a.groups.find(x=>x.id===ag.groupId);
          if(grp) recordPastGame(grp, gameId, ag, G.winMode);
        }
        a.activeGame=null;
      } else {
        ag.tour=(ag.tour||1)+1; ag.manche=(ag.manche||1)+1;
        ag.current=ag.players.map(()=>0);
        if(gameId==="flip7"){ag.flip7=ag.players.map(()=>false);ag.flip7dbl=ag.players.map(()=>false);}
        if(gameId==="skyjo")ag.doubled=ag.players.map(()=>false);
      }
      return a;
    });
    if(won){ setWinSnapshot(winSnap); setShowWin(true); }
  }

  function rejouer(){
    if(!winSnapshot)return;
    const{groupId,players,limit,tmExtensions}=winSnapshot;
    setShowWin(false);
    setWinSnapshot(null);
    update(a=>{
      const ag=makeActiveGame(gameId, groupId, [...players], limit);
      if(G.scoreType==="sheet") initTMGame(ag, tmExtensions||{}, players);
      a.activeGame=ag;
      return a;
    });
    setScreen("game");
  }

  function goHome(){setShowWin(false);setWinSnapshot(null);setSheet(null);setScreen("home");}

  function finDePartie(){
    if(!window.confirm("Terminer la partie ?"))return;
    const snap=makeWinSnapshot(g, G, gameId);
    update(a=>{
      const ag=a.activeGame;
      if(ag.groupId){
        const grp=a.groups.find(x=>x.id===ag.groupId);
        if(grp) recordPastGame(grp, gameId, ag, G.winMode);
      }
      a.activeGame=null;
      return a;
    });
    setWinSnapshot(snap);
    setShowWin(true);
  }

  function shareResult() {
    if (!winSnapshot) return;
    const { players, totals, winners, roundNum: wRN, roundLabel: wRL } = winSnapshot;
    const ranked = [...players.map((name,i)=>({name,score:totals[i]}))];
    ranked.sort((a,b)=>G.winMode==="lowest"?a.score-b.score:b.score-a.score);
    const winTitle = winners.length > 1 ? `${winners.join(' et ')} gagnent !` : `${ranked[0].name} gagne !`;
    const text = `${G.emoji} ${G.label} — ${winTitle}\n`
      + ranked.map((r)=>`${MEDALS[medalRank(r.score, totals, G.winMode)]} ${r.name}: ${r.score}pts`).join("\n")
      + `\n${wRN} ${wRL.toLowerCase()}${wRN>1?"s":""}`;
    if (navigator.share) {
      navigator.share({ title:`${G.label} — Score Keeper`, text });
    } else {
      navigator.clipboard?.writeText(text)
        .then(()=>{setToast(true);setTimeout(()=>setToast(false),1600);})
        .catch(()=>{});
    }
  }

  const roundNum = g ? (g.tour||g.manche||1) : 1;
  const roundLabel = gameId==="flip7" ? "Tour" : gameId==="barbu" ? "Contrat" : "Manche";

  return (
    <div style={S.root}>
      {toast && !saveError && <div style={{position:"fixed",top:"calc(env(safe-area-inset-top, 0px) + 8px)",left:"50%",transform:"translateX(-50%)",
        background:G.btnBg,color:G.btnColor,fontSize:".68rem",letterSpacing:".08em",
        padding:"5px 16px",borderRadius:20,zIndex:99,whiteSpace:"nowrap",pointerEvents:"none",opacity:.92}}>✓ Sauvegardé</div>}
      {saveError && <div onClick={()=>setSaveError(false)} style={{position:"fixed",top:"calc(env(safe-area-inset-top, 0px) + 8px)",left:"50%",transform:"translateX(-50%)",
        background:"#b91c1c",color:"#fff",fontSize:".7rem",letterSpacing:".02em",maxWidth:"92vw",textAlign:"center",
        padding:"8px 16px",borderRadius:12,zIndex:99,boxShadow:"0 4px 20px rgba(0,0,0,.5)",cursor:"pointer"}}>
        ⚠️ Sauvegarde impossible (mémoire pleine ?). Tes derniers points pourraient être perdus.</div>}

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
          <div style={{display:"flex",alignItems:"center",gap:10,fontFamily:"'Cinzel',serif",fontSize:"2rem",fontWeight:900,color:G.accent,letterSpacing:".1em"}}><GIcon G={G} size={32}/>{G.label.toUpperCase()}</div>
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
                  {grp.players.length} joueurs{!G.endOnDemand && ` · ${G.limitLabel.toLowerCase()} ${getGroupLimit(grp)} pts`}
                  {(grp.pastGames?.length || 0) > 0 && " · " + grp.pastGames.length + " partie" + (grp.pastGames.length > 1 ? "s" : "") + " jouée" + (grp.pastGames.length > 1 ? "s" : "")}</div>
              </div>
              <div style={{display:"flex",gap:6,flexShrink:0}} onClick={e=>e.stopPropagation()}>
                {(grp.pastGames?.length ?? 0) > 0 && <div role="button" tabIndex={0} aria-label="Voir l'historique" style={S.iconBtn} onClick={()=>{setPastGroupId(grp.id);setSheet("past");}} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setPastGroupId(grp.id);setSheet("past");}}}>🏆</div>}
                <div role="button" tabIndex={0} aria-label="Statistiques" style={S.iconBtn} onClick={()=>{setStatsGrpId(grp.id);setSheet("stats");}} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();setStatsGrpId(grp.id);setSheet("stats");}}}>📊</div>
                <div role="button" tabIndex={0} aria-label="Modifier le groupe" style={S.iconBtn} onClick={()=>openEditGroup(grp.id)} onKeyDown={e=>{if(e.key==="Enter"||e.key===" "){e.preventDefault();openEditGroup(grp.id);}}}>✏️</div>
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
              <span style={{fontSize:".85rem",color:G.text,display:"flex",alignItems:"center",gap:6}}><GIcon G={Gx} size={16}/>{Gx.label}{!Gx.endOnDemand && <span style={{fontSize:".7rem",color:G.sub}}> — {Gx.limitLabel}</span>}</span>
              {!Gx.endOnDemand && <div style={{display:"flex",alignItems:"center",gap:8}}>
                <div onClick={()=>setEditState(s=>({...s,limits:{...s.limits,[gid]:Math.max(Gx.limitMin,(s.limits[gid]??Gx.defaultLimit)-Gx.limitStep)}}))}
                  style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:6,width:28,height:28,
                  display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",userSelect:"none"}}>−</div>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:"1rem",color:Gx.accent,minWidth:"3.5ch",textAlign:"center"}}>
                  {editState.limits[gid]??Gx.defaultLimit}
                </span>
                <div onClick={()=>setEditState(s=>({...s,limits:{...s.limits,[gid]:Math.min(Gx.limitMax,(s.limits[gid]??Gx.defaultLimit)+Gx.limitStep)}}))}
                  style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:6,width:28,height:28,
                  display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",userSelect:"none"}}>＋</div>
              </div>}
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

          {G.extensions && G.extensions.length > 0 && <>
            <div style={{...S.sLabel,marginTop:10}}>Extensions</div>
            {G.extensions.map(ext=>(
              <div key={ext.key} onClick={()=>setEditState(s=>({...s,tmExtensions:{...s.tmExtensions,[ext.key]:!s.tmExtensions?.[ext.key]}}))}
                style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:G.surface,
                  border:`1px solid ${G.border}`,borderRadius:10,padding:"11px 14px",marginBottom:6,cursor:"pointer"}}>
                <span style={{fontSize:".9rem",color:G.text}}>{ext.label}{ext.scoreField && <span style={{fontSize:".72rem",color:G.sub,marginLeft:6}}>+VP</span>}</span>
                <div style={{width:24,height:24,borderRadius:6,border:"2px solid " + (editState.tmExtensions?.[ext.key] ? G.color : G.border),
                  background:editState.tmExtensions?.[ext.key]?G.colorDim:"transparent",
                  display:"flex",alignItems:"center",justifyContent:"center",color:G.accent,fontSize:".9rem",transition:"all .15s"}}>
                  {editState.tmExtensions?.[ext.key]?"✓":""}
                </div>
              </div>
            ))}
          </>}
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
          {!G.endOnDemand && <>
            <div style={S.sLabel}>{G.limitLabel}</div>
            <LimitCtrl G={G} value={quickState.limit} label={G.limitLabel}
              onChange={v=>setQuickState(s=>({...s,limit:v}))}
              min={G.limitMin} max={G.limitMax} step={G.limitStep}/>
          </>}
          <div style={S.sLabel}>Joueurs <span style={{color:G.sub}}>(2 à 6)</span></div>
          {quickState.players.map((name,i)=>(
            <PlayerEditRow key={i} name={name} index={i}
              onChange={v=>setQuickState(s=>{const p=[...s.players];p[i]=v;return{...s,players:p};})}
              onRemove={()=>setQuickState(s=>({...s,players:s.players.filter((_,j)=>j!==i)}))}
              canRemove={quickState.players.length>2}/>
          ))}
          {quickState.players.length<6 && <Btn ghost full G={G} onClick={()=>setQuickState(s=>({...s,players:[...s.players,""]}))}>＋ Ajouter un joueur</Btn>}
          {G.scoreType==="sheet" && G.extensions && (G.extensions.length || 0) > 0 && <>
            <div style={S.sLabel}>Extensions</div>
            {G.extensions.map(ext=>(
              <div key={ext.key} onClick={()=>setQuickState(s=>({...s,tmExtensions:{...s.tmExtensions,[ext.key]:!s.tmExtensions?.[ext.key]}}))}
                style={{display:"flex",alignItems:"center",justifyContent:"space-between",background:G.surface,
                  border:`1px solid ${G.border}`,borderRadius:10,padding:"11px 14px",marginBottom:6,cursor:"pointer"}}>
                <span style={{fontSize:".9rem",color:G.text}}>{ext.label}{ext.scoreField && <span style={{fontSize:".72rem",color:G.sub,marginLeft:6}}>+VP</span>}</span>
                <div style={{width:24,height:24,borderRadius:6,border:"2px solid " + (quickState.tmExtensions?.[ext.key] ? G.color : G.border),
                  background:quickState.tmExtensions?.[ext.key]?G.colorDim:"transparent",display:"flex",alignItems:"center",justifyContent:"center",
                  color:G.accent,fontSize:".9rem",transition:"all .15s"}}>
                  {quickState.tmExtensions?.[ext.key]?"✓":""}
                </div>
              </div>
            ))}
          </>}
        </div>
        <div style={S.footer}>
          <Btn ghost G={G} onClick={()=>setScreen("home")}>← Retour</Btn>
          <Btn primary G={G} style={{flex:1}} onClick={startQuickGame}>{G.emoji} Commencer</Btn>
        </div>
      </>}

      {/* ── GAME BOARDS ── */}
      {screen==="game" && g && !G.scoreType &&
        <ClassicBoard g={g} G={G} gameId={gameId} S={S} gameGroupName={gameGroupName}
          roundNum={roundNum} roundLabel={roundLabel} getRankIcon={getRankIcon}
          adjustScore={adjustScore} update={update} setSheet={setSheet}
          goHome={goHome} finDePartie={finDePartie} validerRound={validerRound}/>}

      {screen==="game" && g && G.scoreType==="sheet" &&
        <SheetBoard g={g} G={G} S={S} gameGroupName={gameGroupName}
          update={update} goHome={goHome} finDePartie={finDePartie}/>}

      {screen==="game" && g && G.scoreType==="contracts" &&
        <ContractsBoard g={g} G={G} S={S} gameGroupName={gameGroupName}
          roundNum={roundNum} getRankIcon={getRankIcon} update={update}
          setSheet={setSheet} goHome={goHome} finDePartie={finDePartie}/>}

      {/* ── SHEET: HISTORY ── */}
      {sheet==="history" && g && (
        <BottomSheet title="📜 Historique" G={G} maxHeight="78%" onClose={()=>setSheet(null)}>
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
        </BottomSheet>
      )}

      {/* ── SHEET: RULES (Barbu) ── */}
      {sheet==="rules" && g && G.scoreType==="contracts" && (
        <BottomSheet title={`📖 Règles — ${G.label}`} G={G} maxHeight="86%" onClose={()=>setSheet(null)}>
            <div style={{overflowY:"auto",flex:1,padding:"12px 16px 24px"}}>
              <div style={{fontSize:".8rem",color:G.text,lineHeight:1.5,marginBottom:14}}>
                Jeu à contrats. <strong style={{color:G.accent}}>Le moins de points gagne</strong> (les scores sont négatifs,
                le moins négatif l'emporte). À chaque manche, le donneur choisit un contrat ; pour chacun,
                on saisit ce que chaque joueur a ramassé et l'app calcule les points.
              </div>

              <div style={{fontSize:".6rem",letterSpacing:".18em",textTransform:"uppercase",color:G.sub,marginBottom:8}}>Les contrats</div>
              {G.contracts.map(c=>{
                const reussite=c.mode==="rank";
                const rewards=reussite?reussiteRankRewards(g.players.length, c.rankStep):null;
                return (
                  <div key={c.key} style={{background:G.surface2,border:`1px solid ${G.border}`,borderRadius:12,
                    padding:"10px 12px",marginBottom:7}}>
                    <div style={{display:"flex",alignItems:"center",gap:9}}>
                      <span style={{fontSize:"1.3rem",flexShrink:0}}>{c.emoji}</span>
                      <div style={{flex:1,minWidth:0}}>
                        <div style={{fontFamily:"'Cinzel',serif",fontSize:".9rem",fontWeight:700,color:c.positive?"#6dcc90":G.text}}>{c.label}</div>
                        <div style={{fontSize:".68rem",color:G.sub,marginTop:1}}>{c.hint}</div>
                      </div>
                    </div>
                    {c.key==="salade" && (
                      <div style={{fontSize:".66rem",color:G.sub,marginTop:7,paddingTop:7,borderTop:`1px solid ${G.border}`,
                        display:"flex",flexWrap:"wrap",gap:"3px 10px"}}>
                        {c.components.map(comp=>(
                          <span key={comp.key}>{comp.emoji} {comp.label} <strong style={{color:"#ff8070"}}>{comp.per}</strong></span>
                        ))}
                      </div>
                    )}
                    {reussite && (
                      <div style={{fontSize:".66rem",color:G.sub,marginTop:7,paddingTop:7,borderTop:`1px solid ${G.border}`,
                        display:"flex",flexWrap:"wrap",gap:"3px 10px"}}>
                        {rewards.map((pts,r)=>(
                          <span key={r}>{r+1}{r===0?"er":"e"} <strong style={{color:"#6dcc90"}}>{pts>0?`+${pts}`:"0"}</strong></span>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}

              <div style={{fontSize:".66rem",color:G.sub,lineHeight:1.5,marginTop:12,fontStyle:"italic"}}>
                Valeurs standard françaises. La réussite ({G.label}) suit l'ordre d'arrivée :
                +{G.contracts.find(c=>c.mode==="rank")?.rankStep} points par joueur battu.
              </div>
            </div>
        </BottomSheet>
      )}

      {/* ── SHEET: PAST GAMES ── */}
      {sheet==="past" && pastGroupId && (()=>{
        const grp=data.groups.find(x=>x.id===pastGroupId);
        return (
          <BottomSheet title="🏆 Parties passées" G={G} maxHeight="78%" onClose={()=>setSheet(null)}>
              <div style={{overflowY:"auto",flex:1,padding:"10px 14px"}}>
                {!grp?.pastGames?.length
                  ? <div style={{color:G.sub,textAlign:"center",padding:20}}>Aucune partie enregistrée</div>
                  : grp.pastGames.map((pg,pi)=>{
                      const pgGame = GAMES[pg.gameId] || G;
                      const ds=new Date(pg.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
                      const sorted=[...pg.scores].sort((a,b)=>pgGame.winMode==="lowest"?a.score-b.score:b.score-a.score);
                      const pgTotals=pg.scores.map(x=>x.score);
                      const sc=sorted.map((s)=>`${MEDALS[medalRank(s.score, pgTotals, pgGame.winMode)]} ${s.name} ${s.score}pts`).join(" · ");
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
          </BottomSheet>
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
            if(pg.winners?.includes(s.name)||s.name===pg.winner) overall[s.name].wins++;
          });
        });
        const players = Object.entries(overall).sort((a,b)=>b[1].wins-a[1].wins);
        return (
          <BottomSheet title={`📊 Stats — ${grp.name}`} G={G} maxHeight="82%" onClose={()=>{setSheet(null);setStatsGrpId(null);}}>
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
                            if(pg.winners?.includes(s.name)||s.name===pg.winner) pp[s.name].wins++;
                          });
                        });
                        const sorted=Object.entries(pp).sort((a,b)=>b[1].wins-a[1].wins);
                        return (
                          <div key={gid} style={{marginBottom:14}}>
                            <div style={{fontSize:".6rem",letterSpacing:".15em",textTransform:"uppercase",
                              color:G.sub,marginBottom:6,display:"flex",alignItems:"center",gap:5}}>
                              <span style={{display:"flex",alignItems:"center",gap:4}}><GIcon G={Gx} size={14}/><span>{Gx.label}</span></span>
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
          </BottomSheet>
        );
      })()}

      {/* ── WIN SCREEN ── */}
      {showWin && winSnapshot && (()=>{
        const { players, totals, winners, roundNum: wRN, roundLabel: wRL } = winSnapshot;
        const ranked=[...players.map((name,i)=>({name,i,score:totals[i]}))];
        ranked.sort((a,b)=>G.winMode==="lowest"?a.score-b.score:b.score-a.score);
        const winTitle=winners.length>1?`${winners.join(' et ')} gagnent !`:`${ranked[0].name} gagne !`;
        return (
          <div style={{position:"fixed",inset:0,background:G.bg,display:"flex",flexDirection:"column",
            alignItems:"center",justifyContent:"center",textAlign:"center",padding:"20px 30px",zIndex:50,overflowY:"auto"}}>
            <div style={{fontSize:"3rem",marginBottom:8}}>🏆</div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.6rem",color:G.accent,fontWeight:900,marginBottom:4}}>{winTitle}</div>
            <div style={{color:G.sub,fontSize:".82rem",marginBottom:18}}>Partie terminée en {wRN} {wRL.toLowerCase()}{wRN>1?"s":""}</div>
            <div style={{display:"flex",flexDirection:"column",gap:7,width:"100%",maxWidth:300,marginBottom:28}}>
              {ranked.map((r)=>(
                <div key={r.i} style={{display:"flex",justifyContent:"space-between",alignItems:"center",
                  background:G.surface,borderRadius:10,padding:"10px 16px",
                  border:`1px solid ${medalRank(r.score, totals, G.winMode)===0?G.color:G.border}`}}>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:".9rem"}}>{MEDALS[medalRank(r.score, totals, G.winMode)]} {r.name}</span>
                  <span style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:G.accent}}>{r.score} pts</span>
                </div>
              ))}
            </div>
            <Btn ghost G={G} style={{padding:"10px 22px",fontSize:".9rem",marginBottom:12}} onClick={shareResult}>📤 Partager les résultats</Btn>
            <div style={{display:"flex",gap:12}}>
              <Btn ghost G={G} style={{padding:"12px 22px",fontSize:".9rem"}} onClick={goHome}>🏠 Accueil</Btn>
              <Btn primary G={G} style={{padding:"12px 22px",fontSize:".9rem"}} onClick={rejouer}>🔄 Rejouer</Btn>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
