import { useState } from "react";
import { GameApp } from './screens/GameApp.jsx';
import { WhoStartsApp } from './screens/WhoStartsApp.jsx';
import { GameSelector } from './screens/GameSelector.jsx';
import { HistoryApp } from './screens/HistoryApp.jsx';

export default function Root() {
  const [gameId, setGameId] = useState(null);
  if (gameId==="whoStarts") return <WhoStartsApp onBack={()=>setGameId(null)}/>;
  if (gameId==="history") return <HistoryApp onBack={()=>setGameId(null)}/>;
  return gameId
    ? <GameApp gameId={gameId} onBack={()=>setGameId(null)}/>
    : <GameSelector onSelect={setGameId}/>;
}
