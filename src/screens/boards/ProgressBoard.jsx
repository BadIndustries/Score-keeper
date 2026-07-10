import { COLORS } from '../../games.config.js';
import { campaignStats } from '../../gameLogic.js';
import { Btn, GIcon } from '../../ui.jsx';

// Moteur « progression » : Take Time (coopératif, campagne sans score).
// Chaque horloge a un statut (réussie ou non) et un compteur de tentatives.
export function ProgressBoard({ g, G, S, gameGroupName, update, goHome, archiveCampaign }) {
  const perChapter = G.clocksPerChapter || 4;
  const { done, total, tries, currentIndex } = campaignStats(g.clocks);
  const finished = currentIndex === -1;

  function attempt(idx, success){
    update(a=>{
      const c=a.activeGame.clocks[idx];
      c.tries+=1;
      if(success) c.done=true;
      return a;
    });
  }
  function undoFail(idx){
    update(a=>{
      const c=a.activeGame.clocks[idx];
      c.tries=Math.max(0,c.tries-1);
      return a;
    });
  }
  function unvalidate(idx){
    if(!window.confirm("Remettre cette horloge en jeu ? Sa réussite sera annulée."))return;
    update(a=>{
      const c=a.activeGame.clocks[idx];
      c.done=false;
      c.tries=Math.max(0,c.tries-1);
      return a;
    });
  }

  const curChap = finished ? null : Math.floor(currentIndex/perChapter);
  const curClock = finished ? null : currentIndex%perChapter;

  return (
    <>
      <div style={S.topBar}>
        <div style={S.topTitle}><GIcon G={G} size={18} style={{marginRight:6,verticalAlign:"middle"}}/>{gameGroupName}</div>
        <div style={{display:"flex",gap:6,alignItems:"center"}}>
          <div style={{background:G.surface2,border:`1px solid ${G.border}`,borderRadius:8,padding:"4px 10px",
            textAlign:"center",fontSize:".58rem",letterSpacing:".12em",textTransform:"uppercase",color:G.sub}}>
            Horloges<strong style={{color:G.accent,fontSize:".95rem",display:"block",lineHeight:1.1,letterSpacing:0}}>{done}/{total}</strong>
          </div>
          <div style={{background:G.surface2,border:`1px solid ${G.border}`,borderRadius:8,padding:"4px 10px",
            textAlign:"center",fontSize:".58rem",letterSpacing:".12em",textTransform:"uppercase",color:G.sub}}>
            Essais<strong style={{color:G.accent,fontSize:".95rem",display:"block",lineHeight:1.1,letterSpacing:0}}>{tries}</strong>
          </div>
        </div>
      </div>

      {/* ── Panneau de l'horloge en cours / fin de campagne ── */}
      <div style={{padding:"10px 12px 4px",flexShrink:0}}>
        {finished ? (
          <div style={{background:G.surface,border:`1px solid ${G.color}`,borderRadius:14,padding:"16px 14px",
            textAlign:"center",boxShadow:`0 0 18px ${G.colorDim}`}}>
            <div style={{fontSize:"2rem",lineHeight:1,marginBottom:6}}>🎉</div>
            <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.15rem",fontWeight:900,color:G.accent}}>Campagne terminée !</div>
            <div style={{fontSize:".78rem",color:G.sub,marginTop:4}}>
              {total} horloges réussies en <strong style={{color:G.text}}>{tries}</strong> tentative{tries>1?"s":""}
            </div>
          </div>
        ) : (
          <div style={{background:G.surface,border:`1px solid ${G.color}66`,borderRadius:14,padding:"12px 14px"}}>
            <div style={{textAlign:"center",marginBottom:10}}>
              <div style={{fontSize:".6rem",letterSpacing:".15em",textTransform:"uppercase",color:G.sub}}>En cours</div>
              <div style={{fontFamily:"'Cinzel',serif",fontSize:"1.15rem",fontWeight:900,color:G.accent,marginTop:2}}>
                Chapitre {curChap+1} — Horloge {curClock+1}
              </div>
              <div style={{fontSize:".72rem",color:G.sub,marginTop:2}}>
                Tentative n°{g.clocks[currentIndex].tries+1}
                {g.clocks[currentIndex].tries>0 && <span onClick={()=>undoFail(currentIndex)}
                  style={{marginLeft:10,color:G.accent,textDecoration:"underline",cursor:"pointer"}}>retirer un raté</span>}
              </div>
            </div>
            <div style={{display:"flex",gap:8}}>
              <div onClick={()=>attempt(currentIndex,false)}
                style={{flex:1,height:52,borderRadius:12,border:"1px solid rgba(196,74,58,.4)",
                  background:"rgba(196,74,58,.15)",color:"#ff8070",fontWeight:700,fontSize:".95rem",
                  display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",userSelect:"none"}}>
                ✗ Raté
              </div>
              <div onClick={()=>attempt(currentIndex,true)}
                style={{flex:2,height:52,borderRadius:12,border:"1px solid rgba(74,154,106,.45)",
                  background:"rgba(74,154,106,.18)",color:"#6dcc90",fontWeight:700,fontSize:"1rem",
                  display:"flex",alignItems:"center",justifyContent:"center",cursor:"pointer",userSelect:"none"}}>
                ✓ Réussie !
              </div>
            </div>
          </div>
        )}
      </div>

      {/* ── Grille des chapitres ── */}
      <div style={{flex:1,overflowY:"auto",padding:"6px 12px",display:"flex",flexDirection:"column",gap:6}}>
        {Array.from({length:G.chapters||10},(_,ch)=>{
          const clocks=g.clocks.slice(ch*perChapter,(ch+1)*perChapter);
          const chDone=clocks.every(c=>c.done);
          const chCurrent=!finished && curChap===ch;
          return (
            <div key={ch} style={{background:G.surface,border:`1px solid ${chCurrent?G.color+"88":chDone?G.color+"44":G.border}`,
              borderRadius:14,padding:"9px 12px",display:"flex",alignItems:"center",gap:10,flexShrink:0,
              opacity:!chDone&&!chCurrent&&ch*perChapter>currentIndex&&currentIndex>=0?.55:1}}>
              <div style={{width:3,borderRadius:3,alignSelf:"stretch",flexShrink:0,background:COLORS[ch%COLORS.length]}}/>
              <div style={{flexShrink:0,minWidth:78}}>
                <div style={{fontFamily:"'Cinzel',serif",fontSize:".82rem",fontWeight:700,color:chDone?G.accent:G.text}}>
                  Chap. {ch+1} {chDone?"✓":""}
                </div>
                <div style={{fontSize:".6rem",color:G.sub}}>
                  {clocks.reduce((s,c)=>s+c.tries,0)} essai{clocks.reduce((s,c)=>s+c.tries,0)>1?"s":""}
                </div>
              </div>
              <div style={{display:"flex",gap:5,flex:1,justifyContent:"flex-end"}}>
                {clocks.map((c,k)=>{
                  const idx=ch*perChapter+k;
                  const isCur=idx===currentIndex;
                  return (
                    <div key={k} onClick={c.done?()=>unvalidate(idx):undefined}
                      style={{width:46,height:46,borderRadius:10,flexShrink:0,
                        border:`1px solid ${c.done?"rgba(74,154,106,.5)":isCur?G.color:G.border}`,
                        background:c.done?"rgba(74,154,106,.16)":isCur?G.colorDim:G.surface2,
                        display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:1,
                        cursor:c.done?"pointer":"default",userSelect:"none",
                        boxShadow:isCur?`0 0 10px ${G.colorDim}`:undefined}}>
                      <span style={{fontSize:".72rem",lineHeight:1}}>{c.done?"✅":isCur?"▶":"🕐"}</span>
                      <span style={{fontSize:".55rem",color:c.done?"#6dcc90":isCur?G.accent:G.sub,fontWeight:700}}>
                        {c.done?`×${c.tries}`:isCur?`n°${c.tries+1}`:k+1}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
        <div style={{fontSize:".62rem",color:G.sub,textAlign:"center",padding:"4px 0 8px",fontStyle:"italic"}}>
          Touche une horloge réussie pour la remettre en jeu (correction).
        </div>
      </div>

      <div style={S.footer}>
        <Btn ghost G={G} onClick={goHome}>← Accueil</Btn>
        {finished
          ? <Btn primary G={G} style={{flex:1}} onClick={archiveCampaign}>🎉 Archiver la campagne</Btn>
          : <div style={{flex:1,display:"flex",alignItems:"center",justifyContent:"center",fontSize:".68rem",color:G.sub}}>
              La campagne se sauvegarde toute seule
            </div>}
      </div>
    </>
  );
}
