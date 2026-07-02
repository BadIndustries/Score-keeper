import { useState } from "react";
import { COLORS } from '../../games.config.js';
import { Btn, GIcon } from '../../ui.jsx';
import { usePressRepeat } from '../../usePressRepeat.js';

// Moteur « manches » : Odin, Flip 7, Skyjo, Roi des Nains, Qwirkle.
export function ClassicBoard({ g, G, gameId, S, gameGroupName, roundNum, roundLabel,
  getRankIcon, adjustScore, update, setSheet, goHome, finDePartie, validerRound }) {
  const pressProps = usePressRepeat();
  const [directEdit, setDirectEdit] = useState(null);
  const [directVal,  setDirectVal]  = useState("");

  function toggleFlip7(i){ update(a=>{a.activeGame.flip7[i]=!a.activeGame.flip7[i];return a;}); }
  function toggleFlip7Dbl(i){ update(a=>{a.activeGame.flip7dbl[i]=!a.activeGame.flip7dbl[i];return a;}); }
  function toggleDouble(i){ update(a=>{a.activeGame.doubled[i]=!a.activeGame.doubled[i];return a;}); }

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

  return (
    <>
      <div style={S.topBar}>
        <div style={S.topTitle}><GIcon G={G} size={18} style={{marginRight:6,verticalAlign:"middle"}}/>{gameGroupName}</div>
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
          const f7dbl = gameId==="flip7" ? (g.flip7dbl?.[i]||false) : false;
          const doubled = gameId==="skyjo" ? g.doubled[i] : false;
          const tourTotal = cur + (f7?15:0);
          const tourTotalFinal = f7dbl ? tourTotal*2 : tourTotal;
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
                    <div {...pressProps("adj"+i+"m",()=>adjustScore(i,-1))} style={{width:44,height:44,borderRadius:8,
                      border:"1px solid rgba(196,74,58,.3)",background:"rgba(196,74,58,.15)",color:"#ff8070",
                      fontSize:"1.2rem",display:"flex",alignItems:"center",justifyContent:"center",
                      cursor:"pointer",userSelect:"none",flexShrink:0}}>−</div>
                    <div style={{flex:1,textAlign:"center"}} onClick={()=>{if(directEdit!==i){setDirectEdit(i);setDirectVal(String(cur));}}}>
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
                    <div {...pressProps("adj"+i+"p",()=>adjustScore(i,+1))} style={{width:44,height:44,borderRadius:8,
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
                        style={{flex:1,height:36,borderRadius:6,border:`1px solid ${border}`,background:bg,
                        color,fontSize:".7rem",fontWeight:700,display:"flex",alignItems:"center",
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
                {gameId==="flip7" && (
                  <div onClick={()=>toggleFlip7Dbl(i)}
                    style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                    background:f7dbl?"rgba(239,68,68,.18)":G.surface2,
                    border:`1px solid ${f7dbl?"rgba(239,68,68,.6)":G.border}`,
                    borderRadius:10,padding:"5px 8px",cursor:"pointer",flexShrink:0,minWidth:58}}>
                    <span style={{fontSize:"1rem"}}>✕2</span>
                    <span style={{fontSize:".5rem",letterSpacing:".06em",textTransform:"uppercase",
                      color:f7dbl?"#f87171":G.sub,fontWeight:f7dbl?700:400}}>
                      {f7dbl?"Doublé":"Double"}
                    </span>
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
                {gameId==="qwirkle" && (
                  <div onClick={()=>adjustScore(i,12)}
                    style={{display:"flex",flexDirection:"column",alignItems:"center",gap:2,
                    background:G.surface2,
                    border:`1px solid ${G.border}`,
                    borderRadius:10,padding:"5px 10px",cursor:"pointer",flexShrink:0,minWidth:58}}>
                    <span style={{fontSize:"1rem"}}>🎯</span>
                    <span style={{fontSize:".5rem",letterSpacing:".06em",textTransform:"uppercase",
                      color:G.sub,fontWeight:700}}>+12</span>
                  </div>
                )}
                <div style={{display:"flex",flexDirection:"column",alignItems:"center",flexShrink:0,minWidth:44}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:"1rem",fontWeight:700,lineHeight:1,
                    color:f7dbl?"#f87171":doubled?"#f87171":f7?"#f6c90e":G.accent}}>
                    {gameId==="skyjo"
                      ? (doubled&&cur!==0?`×2 = ${cur*2}`:cur!==0?`${cur>0?"+":""}${cur}`:"-")
                      : f7dbl?`×2 = ${tourTotalFinal>0?tourTotalFinal:0}`
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
        {G.endOnDemand && <Btn ghost G={G} onClick={finDePartie}>🏁 Fin</Btn>}
        <Btn primary G={G} style={{flex:1}} onClick={validerRound}>{G.emoji} Valider {roundLabel.toLowerCase()}</Btn>
      </div>
    </>
  );
}
