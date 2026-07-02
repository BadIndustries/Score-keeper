import { useState } from "react";
import { GAMES, MEDALS, KEY_GROUPS } from '../games.config.js';
import { saveGroups, loadGroups } from '../storage.js';
import { GIcon, MIN_PLAYERS, BottomSheet } from '../ui.jsx';
import { medalRank } from '../gameLogic.js';
import { CHANGELOG } from '../changelog.js';

// ── SELECTOR SCREEN ───────────────────────────────────────────────────
export function GameSelector({ onSelect }) {
  const [showHistory,  setShowHistory]  = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showInstall, setShowInstall] = useState(false);
  const [importMsg,    setImportMsg]    = useState(null);
  const [updateMsg,    setUpdateMsg]    = useState(null);
  const [updating,     setUpdating]     = useState(false);
  const [groups]                        = useState(() => loadGroups());

  const allHistory = () => {
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
      navigator.serviceWorker.addEventListener('controllerchange', reload, { once: true });

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
    if (file.size > 512 * 1024) { setImportMsg('⚠️ Fichier trop volumineux (max 512 Ko).'); return; }
    const reader = new FileReader();
    reader.onload = e => {
      try {
        const groups = JSON.parse(e.target.result);
        if (!Array.isArray(groups)) throw new Error('not array');
        for (const g of groups) {
          if (typeof g.id !== 'string') throw new Error('id');
          if (typeof g.name !== 'string' || g.name.length > 50) throw new Error('name');
          if (!Array.isArray(g.players) || g.players.length > 20) throw new Error('players');
          if (g.players.length < MIN_PLAYERS) throw new Error('players min');
          for (const p of g.players) {
            if (typeof p !== 'string' || p.trim().length === 0 || p.length > 24) throw new Error('player name');
          }
          if (g.pastGames !== undefined) {
            if (!Array.isArray(g.pastGames)) throw new Error('pastGames');
            for (const pg of g.pastGames) {
              if (typeof pg !== 'object' || pg === null || typeof pg.winner !== 'string') throw new Error('pastGame');
            }
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
      paddingBottom:"max(100px, calc(env(safe-area-inset-bottom, 0px) + 90px))",
      backgroundImage:"radial-gradient(ellipse at 50% 30%,rgba(120,80,200,.15) 0%,transparent 60%)"}}>
      <style>{`*{box-sizing:border-box;-webkit-tap-highlight-color:transparent;}`}</style>

      {/* Bottom bar — history (right) + settings (left) */}
      <div style={{position:"fixed",bottom:"calc(env(safe-area-inset-bottom, 0px) + 20px)",
        left:0,right:0,display:"flex",justifyContent:"space-between",padding:"0 20px",
        pointerEvents:"none",zIndex:10}}>
        <div onClick={()=>setShowSettings(true)} style={{pointerEvents:"auto",
          background:"rgba(255,255,255,.1)",border:"1px solid rgba(255,255,255,.14)",
          borderRadius:28,padding:"11px 20px",fontSize:".75rem",color:"rgba(255,255,255,.65)",
          cursor:"pointer",display:"flex",alignItems:"center",gap:7,letterSpacing:".05em",
          boxShadow:"0 4px 24px rgba(0,0,0,.45)",backdropFilter:"blur(8px)"}}>
          ℹ️ À propos
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
            <div style={{flexShrink:0,lineHeight:1,display:"flex",alignItems:"center"}}><GIcon G={G} size={44}/></div>
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
        <BottomSheet title="ℹ️ À propos" maxHeight="88%" zIndex={50}
          onClose={()=>{setShowSettings(false);setImportMsg(null);setUpdateMsg(null);}}
          headerExtra={<div style={{fontSize:".62rem",color:"rgba(255,255,255,.2)",letterSpacing:".08em"}}>
            Version {__APP_VERSION__} — {__BUILD_DATE__}
          </div>}>
            <div style={{padding:"16px 18px 32px",display:"flex",flexDirection:"column",gap:10,overflowY:"auto",flex:1}}>

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

              {/* GitHub */}
              <a href="https://github.com/BadIndustries/Score-keeper" target="_blank" rel="noopener noreferrer"
                style={{background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.12)",
                borderRadius:14,padding:"16px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:14,
                textDecoration:"none",color:"inherit"}}>
                <span style={{fontSize:"1.6rem"}}>💻</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:".9rem",marginBottom:3}}>Code source sur GitHub</div>
                  <div style={{fontSize:".72rem",color:"rgba(255,255,255,.4)"}}>BadIndustries/Score-keeper — voir le projet et son code</div>
                </div>
                <span style={{fontSize:"1.1rem",color:"rgba(255,255,255,.3)"}}>↗</span>
              </a>

              {/* Nouveautés / journal des versions */}
              <div onClick={()=>setShowChangelog(true)}
                style={{background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.12)",
                borderRadius:14,padding:"16px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
                <span style={{fontSize:"1.6rem"}}>🆕</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:".9rem",marginBottom:3}}>Nouveautés</div>
                  <div style={{fontSize:".72rem",color:"rgba(255,255,255,.4)"}}>Les dernières améliorations et nouveaux jeux</div>
                </div>
                <span style={{fontSize:"1.1rem",color:"rgba(255,255,255,.3)"}}>›</span>
              </div>

              {/* Astuce : installer sur l'écran d'accueil */}
              <div onClick={()=>setShowInstall(true)}
                style={{background:"rgba(255,255,255,.07)",border:"1px solid rgba(255,255,255,.12)",
                borderRadius:14,padding:"16px 18px",cursor:"pointer",display:"flex",alignItems:"center",gap:14}}>
                <span style={{fontSize:"1.6rem"}}>💡</span>
                <div style={{flex:1}}>
                  <div style={{fontWeight:700,fontSize:".9rem",marginBottom:3}}>Astuce</div>
                  <div style={{fontSize:".72rem",color:"rgba(255,255,255,.4)"}}>Installer l’app en icône sur ton téléphone</div>
                </div>
                <span style={{fontSize:"1.1rem",color:"rgba(255,255,255,.3)"}}>›</span>
              </div>

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
        </BottomSheet>
      )}

      {/* ── INSTALL TIP OVERLAY ── */}
      {showInstall && (
        <BottomSheet title="💡 Installer l’app" maxHeight="88%" zIndex={60} onClose={()=>setShowInstall(false)}>
            <div style={{overflowY:"auto",flex:1,padding:"14px 18px 32px"}}>
              <div style={{fontSize:".8rem",color:"rgba(255,255,255,.6)",lineHeight:1.5,marginBottom:18}}>
                Ajoute Score Keeper à ton écran d’accueil pour l’ouvrir comme une vraie application,
                en plein écran et même hors connexion.
              </div>

              {[
                { os:"🍏 iPhone / iPad (Safari)", steps:[
                  "Ouvre l’app dans Safari (pas dans une autre application).",
                  "Touche le bouton Partager (le carré avec une flèche vers le haut), en bas de l’écran.",
                  "Fais défiler puis touche « Sur l’écran d’accueil ».",
                  "Touche « Ajouter » en haut à droite. L’icône apparaît sur ton écran d’accueil !",
                ]},
                { os:"🤖 Android (Chrome)", steps:[
                  "Ouvre l’app dans Chrome.",
                  "Touche le menu ⋮ (trois points), en haut à droite.",
                  "Touche « Ajouter à l’écran d’accueil » (ou « Installer l’application »).",
                  "Confirme avec « Ajouter ». L’icône apparaît sur ton écran d’accueil !",
                ]},
              ].map((block,bi)=>(
                <div key={bi} style={{marginBottom:18}}>
                  <div style={{fontFamily:"'Cinzel',serif",fontSize:".9rem",fontWeight:700,color:"#fff",marginBottom:10}}>{block.os}</div>
                  {block.steps.map((step,si)=>(
                    <div key={si} style={{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}}>
                      <span style={{flexShrink:0,width:22,height:22,borderRadius:"50%",background:"rgba(94,184,255,.18)",
                        border:"1px solid rgba(94,184,255,.4)",color:"#5eb8ff",fontSize:".7rem",fontWeight:700,
                        display:"flex",alignItems:"center",justifyContent:"center"}}>{si+1}</span>
                      <span style={{fontSize:".8rem",color:"rgba(255,255,255,.7)",lineHeight:1.5,flex:1}}>{step}</span>
                    </div>
                  ))}
                </div>
              ))}

              <div style={{fontSize:".7rem",color:"rgba(255,255,255,.35)",lineHeight:1.5,fontStyle:"italic"}}>
                Astuce : si tu ne vois pas l’option, vérifie que tu es bien dans Safari (iPhone) ou Chrome (Android),
                et pas dans le navigateur intégré d’une autre app.
              </div>
            </div>
        </BottomSheet>
      )}

      {/* ── CHANGELOG OVERLAY ── */}
      {showChangelog && (
        <BottomSheet title="🆕 Nouveautés" maxHeight="86%" zIndex={60} onClose={()=>setShowChangelog(false)}>
            <div style={{overflowY:"auto",flex:1,padding:"14px 18px 32px"}}>
              {CHANGELOG.map((rel,ri)=>(
                <div key={ri} style={{marginBottom:18}}>
                  <div style={{display:"flex",alignItems:"baseline",gap:8,marginBottom:8}}>
                    <span style={{fontFamily:"'Cinzel',serif",fontSize:".95rem",fontWeight:700,color:"#fff"}}>{rel.version}</span>
                    {rel.date && <span style={{fontSize:".62rem",color:"rgba(255,255,255,.3)",letterSpacing:".06em"}}>{rel.date}</span>}
                  </div>
                  {rel.items.map((it,ii)=>(
                    <div key={ii} style={{display:"flex",gap:8,marginBottom:6}}>
                      <span style={{color:"#5eb8ff",flexShrink:0,lineHeight:1.5}}>•</span>
                      <span style={{fontSize:".8rem",color:"rgba(255,255,255,.7)",lineHeight:1.5}}>{it}</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>
        </BottomSheet>
      )}

      {/* ── HISTORY OVERLAY ── */}
      {showHistory && (()=>{
        const history = allHistory();
        return (
          <BottomSheet title="📋 Toutes les parties" maxHeight="82%" zIndex={50} onClose={()=>setShowHistory(false)}>
              <div style={{overflowY:"auto",flex:1,padding:"8px 14px 24px"}}>
                {history.length===0
                  ? <div style={{color:"rgba(255,255,255,.3)",textAlign:"center",padding:30,fontSize:".85rem"}}>Aucune partie enregistrée</div>
                  : history.map((pg,i)=>{
                      const pgGame = GAMES[pg.gameId];
                      const ds = new Date(pg.date).toLocaleDateString("fr-FR",{day:"2-digit",month:"short",year:"numeric"});
                      const sorted = [...pg.scores].sort((a,b)=> pgGame?.winMode==="lowest" ? a.score-b.score : b.score-a.score);
                      const pgTotals = pg.scores.map(x=>x.score);
                      return (
                        <div key={i} style={{padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,.05)",display:"flex",alignItems:"flex-start",gap:10}}>
                          <div style={{fontSize:"1.3rem",flexShrink:0,marginTop:2}}>{pgGame?.emoji||"🎮"}</div>
                          <div style={{flex:1,minWidth:0}}>
                            <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:2}}>
                              <span style={{fontFamily:"'Cinzel',serif",fontSize:".82rem",color:pgGame?.accent||"#fff",fontWeight:700}}>🏆 {pg.winner}</span>
                              <span style={{fontSize:".62rem",color:"rgba(255,255,255,.25)",background:"rgba(255,255,255,.06)",borderRadius:4,padding:"2px 6px"}}>{pg.groupName}</span>
                            </div>
                            <div style={{fontSize:".63rem",color:"rgba(255,255,255,.35)",lineHeight:1.6}}>
                              {sorted.map((s)=>`${MEDALS[medalRank(s.score, pgTotals, pgGame?.winMode)]} ${s.name} ${s.score}pts`).join(" · ")}
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
          </BottomSheet>
        );
      })()}
    </div>
  );
}
