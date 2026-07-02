import { useState } from "react";
import { COLORS } from '../../games.config.js';
import { tmGetAllFields, computeTMTotal, medalRank } from '../../gameLogic.js';
import { Btn, GIcon } from '../../ui.jsx';
import { usePressRepeat } from '../../usePressRepeat.js';

// Moteur « feuille de score » (wizard étape par étape) : Terraforming Mars, Harmonies.
export function SheetBoard({ g, G, S, gameGroupName, update, goHome, finDePartie }) {
  const pressProps = usePressRepeat();
  const [tmStep, setTmStep] = useState(0);

  function adjustTMScore(i, key, d) {
    update(a => {
      a.activeGame.tmScores ||= [];
      const scores=a.activeGame.tmScores[i];
      scores[key]=Math.max(0,(scores[key]||0)+d);
      const fields=tmGetAllFields(G, a.activeGame.tmExtensions||{});
      a.activeGame.totals[i]=computeTMTotal(scores, fields);
      return a;
    });
  }

  const fields=tmGetAllFields(G,g.tmExtensions||{});
  const isRecap=tmStep>=fields.length;
  const field=fields[tmStep]||null;
  const maxTotal=Math.max(1,...g.totals);

  if(!isRecap && field) return (
    <>
      <div style={S.topBar}>
        <div style={S.topTitle}><GIcon G={G} size={18} style={{marginRight:6,verticalAlign:"middle"}}/>{gameGroupName}</div>
        <div style={{background:G.surface2,border:`1px solid ${G.border}`,borderRadius:8,
          padding:"4px 10px",textAlign:"center",fontSize:".58rem",letterSpacing:".1em",
          textTransform:"uppercase",color:G.sub}}>
          étape<strong style={{color:G.accent,fontSize:".95rem",display:"block",lineHeight:1.1,letterSpacing:0}}>{tmStep+1}/{fields.length}</strong>
        </div>
      </div>

      <div style={{padding:"10px 12px 4px",flexShrink:0}}>
        <div style={{textAlign:"center",marginBottom:8}}>
          <div style={{fontSize:"1.6rem",lineHeight:1}}>{field.emoji||"📋"}</div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.15rem",fontWeight:700,color:G.accent,marginTop:4}}>{field.label}</div>
          {field.hint && <div style={{fontSize:".72rem",color:G.sub,marginTop:3}}>{field.hint}</div>}
        </div>
        <div style={{display:"flex",gap:4,marginBottom:4}}>
          {fields.map((f,idx)=>(
            <div key={idx} onClick={()=>setTmStep(idx)} title={f.label}
              style={{height:8,flex:1,borderRadius:2,transition:"background .3s",cursor:"pointer",
                background:idx<tmStep?G.color:idx===tmStep?G.accent:G.border}}/>
          ))}
        </div>
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8,flex:1,padding:"4px 12px",overflowY:"auto"}}>
        {g.players.map((name,i)=>{
          const val=(g.tmScores?.[i]||{})[field.key]??0;
          return (
            <div key={i} style={{background:G.surface,border:`1px solid ${G.border}`,
              borderRadius:14,padding:"10px 14px 10px 16px",position:"relative",flexShrink:0}}>
              <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,
                borderRadius:"14px 0 0 14px",background:COLORS[i%COLORS.length]}}/>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:".95rem",fontWeight:700}}>{name}</span>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  {field.quickSteps
                    ? <>{field.quickSteps.slice().reverse().map(s=>(
                        <div key={-s} onClick={()=>adjustTMScore(i,field.key,-s)}
                          style={{height:44,padding:"0 10px",borderRadius:10,border:"1px solid rgba(196,74,58,.35)",
                            background:"rgba(196,74,58,.15)",color:"#ff8070",fontSize:".85rem",fontWeight:700,
                            display:"flex",alignItems:"center",cursor:"pointer",userSelect:"none"}}>{"−"+s}</div>
                      ))}
                      <span style={{fontFamily:"'Cinzel',serif",fontSize:"1.6rem",fontWeight:900,
                        color:G.accent,minWidth:36,textAlign:"center",lineHeight:1}}>{val}</span>
                      {field.quickSteps.map(s=>(
                        <div key={s} onClick={()=>adjustTMScore(i,field.key,s)}
                          style={{height:44,padding:"0 10px",borderRadius:10,border:"1px solid rgba(74,154,106,.3)",
                            background:"rgba(74,154,106,.12)",color:"#6dcc90",fontSize:".85rem",fontWeight:700,
                            display:"flex",alignItems:"center",cursor:"pointer",userSelect:"none"}}>{"+"+ s}</div>
                      ))}</>
                    : <>
                        <div {...pressProps("tm"+i+field.key+"m",()=>adjustTMScore(i,field.key,-(field.step||1)))}
                          style={{width:44,height:44,borderRadius:10,border:"1px solid rgba(196,74,58,.35)",
                            background:"rgba(196,74,58,.15)",color:"#ff8070",fontSize:"1.4rem",
                            display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",userSelect:"none"}}>−</div>
                        <span style={{fontFamily:"'Cinzel',serif",fontSize:"1.6rem",fontWeight:900,
                          color:G.accent,minWidth:36,textAlign:"center",lineHeight:1}}>{val}</span>
                        <div {...pressProps("tm"+i+field.key+"p",()=>adjustTMScore(i,field.key,field.step||1))}
                          style={{width:44,height:44,borderRadius:10,border:`1px solid ${G.color}55`,
                            background:`${G.color}22`,color:G.accent,fontSize:"1.4rem",
                            display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",userSelect:"none"}}>+</div>
                      </>
                  }
                </div>
              </div>
            </div>
          );
        })}

        <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:14,padding:"10px 14px",marginTop:2,flexShrink:0}}>
          <div style={{fontSize:".68rem",letterSpacing:".1em",textTransform:"uppercase",color:G.sub,marginBottom:8}}>Scores cumulés</div>
          {g.players.map((name,i)=>{
            const total=g.totals[i]||0;
            const pct=Math.round((total/maxTotal)*100);
            return (
              <div key={i} style={{marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:".78rem",marginBottom:3}}>
                  <span style={{color:G.sub}}>{name}</span>
                  <span style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:G.text}}>{total}</span>
                </div>
                <div style={{height:6,background:G.surface2,borderRadius:3,overflow:"hidden"}}>
                  <div style={{height:"100%",borderRadius:3,width:`${pct}%`,transition:"width .4s",
                    background:COLORS[i%COLORS.length]}}/>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div style={S.footer}>
        <Btn ghost G={G} onClick={()=>{if(window.confirm("Quitter la partie ?"))goHome();}}>← Quitter</Btn>
        {tmStep > 0 && <Btn ghost G={G} onClick={()=>setTmStep(s=>s-1)}>◀</Btn>}
        <Btn primary G={G} style={{flex:1}} onClick={()=>setTmStep(s=>s+1)}>
          {tmStep===fields.length-1?"Voir le récap ▶":"Suivant ▶"}
        </Btn>
      </div>
    </>
  );

  const ranked=[...g.players.map((name,i)=>({name,i,total:g.totals[i]||0}))].sort((a,b)=>b.total-a.total);
  return (
    <>
      <div style={S.topBar}>
        <div style={S.topTitle}><GIcon G={G} size={18} style={{marginRight:6,verticalAlign:"middle"}}/>Récapitulatif</div>
      </div>
      <div style={{flex:1,overflowY:"auto",padding:"8px 12px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:6,marginBottom:12}}>
          {ranked.map(({name,i,total})=>{const mr=medalRank(total,g.totals,G.winMode);return (
            <div key={i} style={{background:G.surface,border:`1px solid ${mr===0?G.color:G.border}`,
              borderRadius:14,padding:"10px 14px 10px 16px",position:"relative",
              boxShadow:mr===0?`0 0 14px ${G.colorDim}`:undefined}}>
              <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,
                borderRadius:"14px 0 0 14px",background:COLORS[i%COLORS.length]}}/>
              <div style={{display:"flex",alignItems:"center"}}>
                <span style={{fontSize:"1.3rem",marginRight:8}}>{["🥇","🥈","🥉"][mr]||""}</span>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:".95rem",fontWeight:700,flex:1}}>{name}</span>
                <span style={{fontFamily:"'Cinzel',serif",fontSize:"1.7rem",fontWeight:900,
                  color:mr===0?G.accent:G.text,lineHeight:1}}>{total}</span>
              </div>
              <div style={{display:"flex",flexWrap:"wrap",gap:"3px 10px",marginTop:5}}>
                {fields.map(f=>{
                  const v=(g.tmScores?.[i]||{})[f.key]??0;
                  return v!==0?(
                    <span key={f.key} style={{fontSize:".7rem",color:G.sub}}>
                      {f.emoji} {f.label} <strong style={{color:G.text}}>{v}</strong>
                    </span>
                  ):null;
                })}
              </div>
            </div>
          );})}
        </div>

        <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:14,overflow:"hidden"}}>
          <div style={{padding:"8px 14px",borderBottom:`1px solid ${G.border}`,
            fontSize:".68rem",letterSpacing:".1em",textTransform:"uppercase",color:G.sub}}>Détail</div>
          <div style={{overflowX:"auto"}}>
          <table style={{width:"100%",borderCollapse:"collapse",fontSize:".78rem"}}>
            <thead>
              <tr style={{borderBottom:`1px solid ${G.border}`}}>
                <td style={{padding:"6px 14px",color:G.sub}}></td>
                {g.players.map((name,i)=>(
                  <td key={i} style={{padding:"6px 8px",textAlign:"center",fontFamily:"'Cinzel',serif",
                    fontSize:".72rem",color:COLORS[i%COLORS.length],fontWeight:700}}>{name.split(" ")[0]}</td>
                ))}
              </tr>
            </thead>
            <tbody>
              {fields.map(f=>(
                <tr key={f.key} style={{borderBottom:`1px solid ${G.border}33`}}>
                  <td style={{padding:"6px 14px",color:G.sub}}>{f.emoji} {f.label}</td>
                  {g.players.map((_,i)=>(
                    <td key={i} style={{padding:"6px 8px",textAlign:"center",
                      color:G.text,fontFamily:"'Cinzel',serif",fontWeight:600}}>
                      {(g.tmScores?.[i]||{})[f.key]??0}
                    </td>
                  ))}
                </tr>
              ))}
              <tr style={{borderTop:`1px solid ${G.border}`,background:G.surface2}}>
                <td style={{padding:"7px 14px",fontWeight:700,color:G.accent,fontSize:".8rem"}}>Total</td>
                {g.players.map((_,i)=>(
                  <td key={i} style={{padding:"7px 8px",textAlign:"center",
                    fontFamily:"'Cinzel',serif",fontWeight:900,color:G.accent,fontSize:".95rem"}}>
                    {g.totals[i]||0}
                  </td>
                ))}
              </tr>
            </tbody>
          </table>
          </div>
        </div>
      </div>
      <div style={S.footer}>
        <Btn ghost G={G} onClick={()=>setTmStep(0)}>← Corriger</Btn>
        <Btn primary G={G} style={{flex:1}} onClick={finDePartie}>🏁 Terminer</Btn>
      </div>
    </>
  );
}
