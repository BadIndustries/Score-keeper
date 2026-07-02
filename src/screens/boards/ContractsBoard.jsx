import { useState } from "react";
import { COLORS } from '../../games.config.js';
import { computeContractScores, reussiteRankRewards } from '../../gameLogic.js';
import { Btn, GIcon } from '../../ui.jsx';
import { usePressRepeat } from '../../usePressRepeat.js';

// Moteur « jeu à contrats » : Le Barbu.
export function ContractsBoard({ g, G, S, gameGroupName, roundNum, getRankIcon,
  update, setSheet, goHome, finDePartie }) {
  const pressProps = usePressRepeat();
  const [contractDraft, setContractDraft] = useState(null);

  function startContract(c){
    // Mode classement (réussite) : null = non saisi (≠ dernier). Sinon 0.
    const init=c.mode==="rank"?null:0;
    setContractDraft({
      key: c.key,
      step: 0,
      counts: Object.fromEntries(c.components.map(comp=>[comp.key, g.players.map(()=>init)])),
    });
  }
  function adjustContractCount(compKey, i, d, max){
    setContractDraft(dr=>{
      const arr=[...dr.counts[compKey]];
      arr[i]=Math.max(0, Math.min(max ?? 99, arr[i]+d));
      return {...dr, counts:{...dr.counts, [compKey]:arr}};
    });
  }
  // Réussite : un rang est unique. Attribuer un rang à un joueur le retire
  // de tout autre joueur qui l'avait (toggle si on retape le même).
  function setReussiteRank(compKey, i, pts){
    setContractDraft(dr=>{
      const cur=dr.counts[compKey];
      const arr=cur.map((v,j)=>{
        if(j===i) return v===pts ? null : pts;   // re-tap = désélection
        return v===pts ? null : v;                // libère le rang chez les autres
      });
      return {...dr, counts:{...dr.counts, [compKey]:arr}};
    });
  }
  function validerContract(){
    if(!g||!contractDraft)return;
    const contract=G.contracts.find(c=>c.key===contractDraft.key);
    if(!contract){ setContractDraft(null); return; }
    const scores=computeContractScores(contract, contractDraft.counts, g.players.length);
    update(a=>{
      const ag=a.activeGame;
      ag.history.push({contract:contract.key, scores:[...scores]});
      scores.forEach((pts,i)=>{ ag.totals[i]+=pts; });
      ag.tour=ag.history.length; ag.manche=ag.history.length;
      return a;
    });
    setContractDraft(null);
  }

  const playedCounts={};
  g.history.forEach(h=>{ playedCounts[h.contract]=(playedCounts[h.contract]||0)+1; });
  const maxAbs=Math.max(1,...g.totals.map(t=>Math.abs(t)));

  if(!contractDraft) return (
    <>
      <div style={S.topBar}>
        <div style={S.topTitle}><GIcon G={G} size={18} style={{marginRight:6,verticalAlign:"middle"}}/>{gameGroupName}</div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <div style={{background:G.surface2,border:`1px solid ${G.border}`,borderRadius:8,padding:"4px 10px",
            textAlign:"center",fontSize:".58rem",letterSpacing:".12em",textTransform:"uppercase",color:G.sub}}>
            Contrats<strong style={{color:G.accent,fontSize:".95rem",display:"block",lineHeight:1.1,letterSpacing:0}}>{g.history.length}</strong>
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
            return (
              <div key={i} style={{marginBottom:6}}>
                <div style={{display:"flex",justifyContent:"space-between",fontSize:".8rem",marginBottom:3}}>
                  <span style={{color:G.text,display:"flex",alignItems:"center",gap:5}}>
                    <span style={{width:8,height:8,borderRadius:"50%",background:COLORS[i%COLORS.length],display:"inline-block"}}/>
                    {name} {roundNum>1?getRankIcon(i):""}
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

      <div style={{...S.sLabel,padding:"4px 14px 0"}}>Choisis un contrat</div>
      <div style={{flex:1,overflowY:"auto",padding:"4px 12px",display:"flex",flexDirection:"column",gap:7}}>
        {G.contracts.map(c=>{
          const n=playedCounts[c.key]||0;
          return (
            <div key={c.key} onClick={()=>startContract(c)}
              style={{background:G.surface,border:`1px solid ${n>0?G.color+"55":G.border}`,borderRadius:14,
                padding:"11px 14px",display:"flex",alignItems:"center",gap:12,cursor:"pointer"}}>
              <span style={{fontSize:"1.5rem",flexShrink:0}}>{c.emoji}</span>
              <div style={{flex:1,minWidth:0}}>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:".95rem",fontWeight:700,color:c.positive?"#6dcc90":G.text}}>{c.label}</div>
                <div style={{fontSize:".66rem",color:G.sub,marginTop:1}}>{c.hint}</div>
              </div>
              {n>0 && <span style={{fontSize:".62rem",color:G.accent,background:G.colorDim,borderRadius:20,padding:"2px 8px",flexShrink:0}}>{"✓ "+n+"×"}</span>}
              <span style={{color:G.accent,fontSize:"1.1rem",flexShrink:0,opacity:.6}}>›</span>
            </div>
          );
        })}
      </div>

      <div style={S.footer}>
        <Btn ghost G={G} onClick={()=>{if(window.confirm("Quitter la partie ?"))goHome();}}>← Quitter</Btn>
        <Btn primary G={G} style={{flex:1}} onClick={finDePartie}>🏁 Terminer la partie</Btn>
      </div>
    </>
  );

  const contract=G.contracts.find(c=>c.key===contractDraft.key);
  const comps=contract.components;
  const comp=comps[contractDraft.step];
  const isLast=contractDraft.step>=comps.length-1;
  const liveScores=computeContractScores(contract, contractDraft.counts, g.players.length);
  return (
    <>
      <div style={S.topBar}>
        <div style={S.topTitle}>{contract.emoji} {contract.label}</div>
        {comps.length>1 && <div style={{background:G.surface2,border:`1px solid ${G.border}`,borderRadius:8,
          padding:"4px 10px",textAlign:"center",fontSize:".58rem",letterSpacing:".1em",textTransform:"uppercase",color:G.sub}}>
          étape<strong style={{color:G.accent,fontSize:".95rem",display:"block",lineHeight:1.1,letterSpacing:0}}>{contractDraft.step+1}/{comps.length}</strong>
        </div>}
      </div>

      <div style={{padding:"10px 12px 4px",flexShrink:0}}>
        <div style={{textAlign:"center",marginBottom:8}}>
          <div style={{fontSize:"1.6rem",lineHeight:1}}>{comp.emoji}</div>
          <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.1rem",fontWeight:700,color:G.accent,marginTop:4}}>{comp.label}</div>
          <div style={{fontSize:".72rem",color:G.sub,marginTop:3}}>
            {contract.mode==="rank"?`Désigne la place de chaque joueur (+${contract.rankStep} par joueur battu)`
              :comp.per!=null?`${comp.per} point${Math.abs(comp.per)>1?"s":""} par unité`:"Saisis directement les points"}
          </div>
        </div>
        {comps.length>1 && <div style={{display:"flex",gap:4,marginBottom:4}}>
          {comps.map((cc,idx)=>(
            <div key={idx} onClick={()=>setContractDraft(dr=>({...dr,step:idx}))} title={cc.label}
              style={{height:8,flex:1,borderRadius:2,transition:"background .3s",cursor:"pointer",
                background:idx<contractDraft.step?G.color:idx===contractDraft.step?G.accent:G.border}}/>
          ))}
        </div>}
      </div>

      <div style={{display:"flex",flexDirection:"column",gap:8,flex:1,padding:"4px 12px",overflowY:"auto"}}>
        {contract.mode==="rank" && (()=>{
          const rewards=reussiteRankRewards(g.players.length, contract.rankStep);
          return g.players.map((name,i)=>{
            const val=contractDraft.counts[comp.key][i];
            const saisi=val!=null;
            return (
              <div key={i} style={{background:G.surface,border:`1px solid ${saisi?G.border:"#7a3030"}`,borderRadius:14,
                padding:"10px 14px 10px 16px",position:"relative",flexShrink:0}}>
                <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,borderRadius:"14px 0 0 14px",background:COLORS[i%COLORS.length]}}/>
                <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:8}}>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:".95rem",fontWeight:700}}>{name}</span>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:"1.4rem",fontWeight:900,color:val>0?"#6dcc90":saisi?G.sub:"#c87070",lineHeight:1}}>{!saisi?"—":val>0?`+${val}`:"0"}</span>
                </div>
                <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                  {rewards.map((pts,r)=>{
                    const sel=val===pts;
                    return (
                      <div key={r} onClick={()=>setReussiteRank(comp.key,i,pts)}
                        style={{flex:"1 1 auto",minWidth:54,height:42,borderRadius:10,cursor:"pointer",userSelect:"none",
                          border:`1px solid ${sel?G.color:G.border}`,background:sel?G.colorDim:G.surface2,
                          display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1}}>
                        <span style={{fontSize:".72rem",fontWeight:700,color:sel?G.accent:G.text}}>{r+1}{r===0?"er":"e"}</span>
                        <span style={{fontSize:".58rem",color:sel?G.accent:G.sub}}>{pts>0?`+${pts}`:"0"}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            );
          });
        })()}

        {contract.mode!=="rank" && g.players.map((name,i)=>{
          const val=contractDraft.counts[comp.key][i];
          const countStep=comp.per!=null?1:(comp.step||1);
          const stepPts=comp.per!=null?Math.abs(comp.per):(comp.step||1);
          const positive=comp.per!=null?comp.per>0:true;
          const pts=comp.per!=null?val*comp.per:val;
          const downD=positive?-countStep:countStep;
          const upD=positive?countStep:-countStep;
          return (
            <div key={i} style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:14,
              padding:"10px 14px 10px 16px",position:"relative",flexShrink:0}}>
              <div style={{position:"absolute",left:0,top:0,bottom:0,width:3,borderRadius:"14px 0 0 14px",background:COLORS[i%COLORS.length]}}/>
              <div style={{display:"flex",alignItems:"center",justifyContent:"space-between"}}>
                <div style={{display:"flex",flexDirection:"column",minWidth:0}}>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:".95rem",fontWeight:700}}>{name}</span>
                  {comp.per!=null && val>0 && <span style={{fontSize:".6rem",color:G.sub,marginTop:1}}>{val} × {Math.abs(comp.per)}</span>}
                </div>
                <div style={{display:"flex",alignItems:"center",gap:8}}>
                  <div {...pressProps("bc"+i+comp.key+"m",()=>adjustContractCount(comp.key,i,downD,comp.max))}
                    style={{height:44,padding:"0 12px",minWidth:48,borderRadius:10,border:"1px solid rgba(196,74,58,.35)",
                      background:"rgba(196,74,58,.15)",color:"#ff8070",fontSize:"1rem",fontWeight:700,
                      display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",userSelect:"none"}}>{"−"+stepPts}</div>
                  <span style={{fontFamily:"'Cinzel',serif",fontSize:"1.6rem",fontWeight:900,minWidth:48,textAlign:"center",lineHeight:1,
                    color:pts<0?"#ff8070":pts>0?"#6dcc90":G.sub}}>{pts}</span>
                  <div {...pressProps("bc"+i+comp.key+"p",()=>adjustContractCount(comp.key,i,upD,comp.max))}
                    style={{height:44,padding:"0 12px",minWidth:48,borderRadius:10,border:"1px solid rgba(74,154,106,.3)",
                      background:"rgba(74,154,106,.12)",color:"#6dcc90",fontSize:"1rem",fontWeight:700,
                      display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",userSelect:"none"}}>{"+"+stepPts}</div>
                </div>
              </div>
            </div>
          );
        })}

        <div style={{background:G.surface,border:`1px solid ${G.border}`,borderRadius:14,padding:"10px 14px",flexShrink:0}}>
          <div style={{fontSize:".6rem",letterSpacing:".1em",textTransform:"uppercase",color:G.sub,marginBottom:6}}>Total du contrat</div>
          {g.players.map((name,i)=>(
            <div key={i} style={{display:"flex",justifyContent:"space-between",fontSize:".8rem",padding:"2px 0"}}>
              <span style={{color:G.sub}}>{name}</span>
              <span style={{fontFamily:"'Cinzel',serif",fontWeight:700,color:liveScores[i]<0?"#ff8070":liveScores[i]>0?"#6dcc90":G.text}}>{liveScores[i]>0?`+${liveScores[i]}`:liveScores[i]}</span>
            </div>
          ))}
        </div>
      </div>

      <div style={S.footer}>
        <Btn ghost G={G} onClick={()=>{
          const saisi=Object.values(contractDraft.counts).some(arr=>arr.some(v=>v));
          if(!saisi || window.confirm("Annuler ce contrat ? La saisie sera perdue.")) setContractDraft(null);
        }}>✕ Annuler</Btn>
        {contractDraft.step>0 && <Btn ghost G={G} onClick={()=>setContractDraft(dr=>({...dr,step:dr.step-1}))}>◀</Btn>}
        {isLast
          ? <Btn primary G={G} style={{flex:1}} onClick={validerContract}>✓ Valider le contrat</Btn>
          : <Btn primary G={G} style={{flex:1}} onClick={()=>setContractDraft(dr=>({...dr,step:dr.step+1}))}>Suivant ▶</Btn>}
      </div>
    </>
  );
}
