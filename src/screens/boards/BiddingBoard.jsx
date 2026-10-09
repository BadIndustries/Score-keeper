import { useState } from "react";
import { COLORS } from '../../games.config.js';
import { computeSkullKingRoundScore, makeWinSnapshot, recordPastGame, medalRank } from '../../gameLogic.js';
import { Btn, GIcon } from '../../ui.jsx';
import { usePressRepeat } from '../../usePressRepeat.js';

const STEPS = [
  { key: "bid",    label: "Annonce",         emoji: "🗣️", hint: "Combien de plis vas-tu remporter ?" },
  { key: "actual", label: "Plis remportés",  emoji: "🏆", hint: "Combien de plis as-tu réellement remportés ?" },
  { key: "bonus",  label: "Bonus",           emoji: "💰", hint: "14 capturés (+10, +20 l'atout noir), pirates/sirènes/Skull King capturés — uniquement si l'annonce est juste" },
];

// Moteur « enchères » : Skull King. Nombre de manches fixe (G.maxRounds),
// chaque manche : annonce, plis remportés, bonus — score non linéaire (computeSkullKingRoundScore).
export function BiddingBoard({ g, G, gameId, S, gameGroupName, roundNum, roundLabel,
  update, setSheet, goHome, finDePartie, setWinSnapshot, setShowWin }) {
  const pressProps = usePressRepeat();
  const [roundDraft, setRoundDraft] = useState(null);
  const maxRounds = G.maxRounds || 10;
  const maxAbs = Math.max(1, ...g.totals.map(t => Math.abs(t)));

  function startRound(){
    setRoundDraft({
      step: 0,
      bid: g.players.map(()=>0),
      actual: g.players.map(()=>0),
      bonus: g.players.map(()=>0),
    });
  }
  function adjustField(field, i, d, max, step){
    setRoundDraft(dr=>{
      const arr=[...dr[field]];
      arr[i]=Math.max(0, Math.min(max, arr[i]+d*step));
      return {...dr, [field]:arr};
    });
  }
  function validerRound(){
    if(!g||!roundDraft) return;
    const scores=g.players.map((_,i)=>computeSkullKingRoundScore(roundDraft.bid[i], roundDraft.actual[i], roundDraft.bonus[i], roundNum));
    const newTotals=g.totals.map((t,i)=>t+scores[i]);
    const willWin=(g.history.length+1)>=maxRounds;
    const winSnap=willWin?makeWinSnapshot(g, G, gameId, newTotals):null;
    update(a=>{
      const ag=a.activeGame;
      ag.history.push({bid:[...roundDraft.bid], actual:[...roundDraft.actual], bonus:[...roundDraft.bonus], scores:[...scores]});
      scores.forEach((pts,i)=>{ ag.totals[i]+=pts; });
      ag.tour=ag.history.length; ag.manche=ag.history.length;
      if(willWin){
        if(ag.groupId){
          const grp=a.groups.find(x=>x.id===ag.groupId);
          if(grp) recordPastGame(grp, gameId, ag, G.winMode);
        }
        a.activeGame=null;
      }
      return a;
    });
    setRoundDraft(null);
    if(willWin){ setWinSnapshot(winSnap); setShowWin(true); }
  }

  if(!roundDraft) return (
    <>
      <div style={S.topBar}>
        <div style={S.topTitle}><GIcon G={G} size={18} style={{marginRight:6,verticalAlign:"middle"}}/>{gameGroupName}</div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <div style={{background:G.surface2,border:`1px solid ${G.border}`,borderRadius:8,padding:"4px 10px",
            textAlign:"center",fontSize:".58rem",letterSpacing:".12em",textTransform:"uppercase",color:G.sub}}>
            {roundLabel}<strong style={{color:G.accent,fontSize:".95rem",display:"block",lineHeight:1.1,letterSpacing:0}}>{roundNum}/{maxRounds}</strong>
          </div>
          <div style={S.iconBtn} onClick={()=>setSheet("rules")}>📖</div>
          <div style={S.iconBtn} onClick={()=>setSheet("history")}>📜</div>
        </div>
      </div>

      <div style={{padding:"8px 12px 4px",flexShrink:0}}>
        <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:14,padding:"10px 14px"}}>
          <div style={{fontSize:".6rem",letterSpacing:".15em",textTransform:"uppercase",color:G.sub,marginBottom:8}}>Scores cumulés</div>
          {g.players.map((name,i)=>{
            const total=g.totals[i]||0;
            const pct=Math.round((Math.abs(total)/maxAbs)*100);
            const mr=medalRank(total, g.totals, G.winMode);
            return (
              <div key={i} style={{marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:".8rem",marginBottom:3}}>
                  <span style={{color:G.text,display:"flex",alignItems:"center",gap:5}}>
                    <span style={{width:8,height:8,borderRadius:"50%",background:COLORS[i%COLORS.length],display:"inline-block"}}/>
                    {name} {roundNum>1?(["🥇","🥈","🥉"][mr]||""):""}
                  </span>
                  <span style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:total<0?"#ff8070":G.text}}>{total}</span>
                </div>
                <div style={{height:5,background:G.surface2,borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:3,width:`${pct}%`,transition:"width .4s",background:COLORS[i%COLORS.length]}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:"12px 20px",gap:14}}>
        <div style={{fontSize:"2.4rem",lineHeight:1}}>🏴‍☠️</div>
        <div style={{textAlign:"center"}}>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.2rem",fontWeight:900,color:G.accent}}>Manche {roundNum}</div>
          <div style={{fontSize:".75rem",color:G.sub,marginTop:3}}>{roundNum} carte{roundNum>1?"s":""} par joueur</div>
        </div>
        <Btn primary G={G} style={{padding:"14px 28px",fontSize:"1rem"}} onClick={startRound}>▶ Annoncer</Btn>
      </div>

      <div style={S.footer}>
        <Btn ghost G={G} onClick={()=>{if(window.confirm("Quitter la partie ?"))goHome();}}>← Quitter</Btn>
        <Btn ghost G={G} style={{flex:1}} onClick={finDePartie}>🏁 Terminer la partie</Btn>
      </div>
    </>
  );

  const step=STEPS[roundDraft.step];
  const isLast=roundDraft.step>=STEPS.length-1;
  const liveScores=g.players.map((_,i)=>computeSkullKingRoundScore(roundDraft.bid[i], roundDraft.actual[i], roundDraft.bonus[i], roundNum));

  return (
    <>
      <div style={S.topBar}>
        <div style={S.topTitle}>🏴‍☠️ Manche {roundNum}</div>
        <div style={{background:G.surface2,border:`1px solid ${G.border}`,borderRadius:8,padding:"4px 10px",
          textAlign:"center",fontSize:".58rem",letterSpacing:".1em",textTransform:"uppercase",color:G.sub}}>
          étape<strong style={{color:G.accent,fontSize:".95rem",display:"block",lineHeight:1.1,letterSpacing:0}}>{roundDraft.step+1}/{STEPS.length}</strong>
        </div>
      </div>

      <div style={{padding:"10px 12px 4px",flexShrink:0}}>
        <div style={{textAlign:"center",marginBottom:8}}>
          <div style={{fontSize:"1.6rem",lineHeight:1}}>{step.emoji}</div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.1rem",fontWeight:700,color:G.accent,marginTop:4}}>{step.label}</div>
          <div style={{fontSize:".72rem",color:G.sub,marginTop:3}}>{step.hint}</div>
        </div>
        <div style={{display:"flex",gap:4,marginBottom:4}}>
          {STEPS.map((s,idx)=>(
            <div key={idx} onClick={()=>setRoundDraft(dr=>({...dr,step:idx}))} title={s.label}
              style={{height:8,flex:1,borderRadius:2,transition:"background .3s",cursor:"pointer",
                background:idx<roundDraft.step?G.color:idx===roundDraft.step?G.accent:G.border}}/>
          ))}
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8,flex:1,padding:"4px 12px",overflowY:"auto"}}>
        {g.players.map((name,i)=>{
          const field=step.key;
          const max=field==="bonus"?200:roundNum;
          const btnStep=field==="bonus"?10:1;
          const val=roundDraft[field][i];
          return (
            <div key={i} style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:14,
              padding:"10px 14px 10px 16px",position:"relative",flexShrink:0}}>
              <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,borderRadius:"14px 0 0 14px",background:COLORS[i%COLORS.length]}}/>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:".95rem",fontWeight:700}}>{name}</span>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div {...pressProps("bid"+i+field+"m",()=>adjustField(field,i,-1,max,btnStep))}
                    style={{height:44,padding:"0 12px",minWidth:48,borderRadius:10,border:"1px solid rgba(196,74,58,.35)",
                      background:"rgba(196,74,58,.15)",color:"#ff8070",fontSize:"1rem",fontWeight:700,
                      display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",userSelect:"none"}}>{"−"+btnStep}</div>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:"1.6rem",fontWeight:900,minWidth:48,textAlign:"center",lineHeight:1,color:G.accent}}>{val}</span>
                  <div {...pressProps("bid"+i+field+"p",()=>adjustField(field,i,1,max,btnStep))}
                    style={{height:44,padding:"0 12px",minWidth:48,borderRadius:10,border:"1px solid rgba(74,154,106,.3)",
                      background:"rgba(74,154,106,.12)",color:"#6dcc90",fontSize:"1rem",fontWeight:700,
                      display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",userSelect:"none"}}>{"+"+btnStep}</div>
                </div>
              </div>
            </div>
          );
        })}

        <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:14,padding:"10px 14px",flexShrink:0}}>
          <div style={{fontSize:".6rem",letterSpacing:".1em",textTransform:"uppercase",color:G.sub,marginBottom:6}}>Total — Manche {roundNum}</div>
          {g.players.map((name,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:".8rem",padding:"2px 0"}}>
              <span style={{color:G.sub}}>{name} <span style={{opacity:.6}}>({roundDraft.bid[i]}/{roundDraft.actual[i]})</span></span>
              <span style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:liveScores[i]<0?"#ff8070":liveScores[i]>0?"#6dcc90":G.text}}>{liveScores[i]>0?`+${liveScores[i]}`:liveScores[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={S.footer}>
        <Btn ghost G={G} onClick={()=>{
          const saisi=["bid","actual","bonus"].some(f=>roundDraft[f].some(v=>v));
          if(!saisi || window.confirm("Annuler cette manche ? La saisie sera perdue.")) setRoundDraft(null);
        }}>✕ Annuler</Btn>
        {roundDraft.step>0 && <Btn ghost G={G} onClick={()=>setRoundDraft(dr=>({...dr,step:dr.step-1}))}>◀</Btn>}
        {isLast
          ? <Btn primary G={G} style={{flex:1}} onClick={validerRound}>✓ Valider la manche</Btn>
          : <Btn primary G={G} style={{flex:1}} onClick={()=>setRoundDraft(dr=>({...dr,step:dr.step+1}))}>Suivant ▶</Btn>}
      </div>
    </>
  );
}
