import { useState } from "react";
import { GameApp } from './screens/GameApp.jsx';
import { WhoStartsApp } from './screens/WhoStartsApp.jsx';
import { GameSelector } from './screens/GameSelector.jsx';

export default function Root() {
  const [gameId, setGameId] = useState(null);
  if (gameId==="whoStarts") return <WhoStartsApp onBack={()=>setGameId(null)}/>;
  return gameId
    ? <GameApp gameId={gameId} onBack={()=>setGameId(null)}/>
    : <GameSelector onSelect={setGameId}/>;
}
