import { useState, useCallback, useEffect, useRef } from "react";
import { loadGroups } from '../storage.js';

// ── WHO STARTS ───────────────────────────────────────────────────────
const KEY_WHEEL = "who-wheel-v1";
const DOT_COLORS   = ["#ff3f6c","#3f9eff","#3fffb0","#ff9f3f","#bf3fff"];
const WHEEL_COLORS = ["#e63946","#457b9d","#2a9d8f","#e9c46a","#f4a261","#a8dadc","#6d6875","#b5838d","#52b788","#ff6b6b"];

const WHO_CSS = `
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
  @media (prefers-reduced-motion:reduce){.wdot,.wdot .dring,.wdot .dpulse,.wdot .dpulse2{animation:none!important;transition:none!important}.wdot.winner,.wdot.loser{animation:none!important}.wdot.winner .dring,.wdot.winner .dpulse,.wdot.winner .dpulse2,.wdot.winner::after{animation:none!important}}
`;

function loadWheelPlayers() {
  try { const r = localStorage.getItem(KEY_WHEEL); if (r) return JSON.parse(r); } catch { /* ignore */ }
  return [];
}

export function WhoStartsApp({ onBack }) {
  const [mode, setMode]     = useState("hub");   // hub | fingers | wheel
  const [wSub, setWSub]     = useState("setup"); // setup | spin | result
  const [wPlayers, setWP]   = useState(() => loadWheelPlayers());
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
  const fLockedRef = useRef(false);
  const fFreeRef    = useRef([0,1,2,3,4]);
  const fTimerRef    = useRef(null);
  const fDebounceRef = useRef(null);

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
      ['dpulse','dpulse2','dring','dcore'].forEach(c=>{const e=document.createElement('div');e.className=c;d.appendChild(e);});
      document.body.appendChild(d); return d;
    };
    const cancelCD=()=>{
      if(fDebounceRef.current){clearTimeout(fDebounceRef.current);fDebounceRef.current=null;}
      if(fTimerRef.current){clearInterval(fTimerRef.current);fTimerRef.current=null;}
      if(fStateRef.current==="countdown"){ fStateRef.current="waiting"; fLockedRef.current=false; }
      setFCdNum(3);
    };
    const reset=()=>{
      cancelCD();
      fTouchesRef.current.forEach(t=>t.el.remove()); fTouchesRef.current.clear();
      fFreeRef.current=[0,1,2,3,4]; fStateRef.current="idle"; fLockedRef.current=false;
      setFPhase("idle"); setFCount(0); setFReplay(false);
    };
    const startCD=()=>{
      if(fStateRef.current==="countdown") return;
      fLockedRef.current=true;
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
      if (fLockedRef.current) {
        if (fStateRef.current==="result"){ e.preventDefault(); reset(); }
        return;
      }
      e.preventDefault();
      for(const t of e.changedTouches){
        if(fTouchesRef.current.size>=5) break;
        const idx=fFreeRef.current.shift(); if(idx===undefined) break;
        fTouchesRef.current.set(t.identifier,{el:makeDot(t.clientX,t.clientY,idx),idx});
      }
      fStateRef.current="waiting";
      const n=fTouchesRef.current.size; setFCount(n); setFPhase(n>0?"waiting":"idle");
      if(fDebounceRef.current) clearTimeout(fDebounceRef.current);
      if(n>=MIN_T){fDebounceRef.current=setTimeout(()=>{fDebounceRef.current=null;startCD();},300);}
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
      if(fDebounceRef.current){clearTimeout(fDebounceRef.current);fDebounceRef.current=null;}
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
          <div aria-live="polite" aria-atomic="true" style={{position:"absolute",width:1,height:1,overflow:"hidden",clip:"rect(0,0,0,0)"}}>{fCount} doigt{fCount>1?"s":""} posé{fCount>1?"s":""}</div>
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
