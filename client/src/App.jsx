import DungeonScreen from './components/DungeonScreen.jsx';
import AccessGate from './components/AccessGate.jsx';
import { useGameStore } from './stores/useGameStore.js';

// Round 115: the web client is the Ta Prohm dungeon crawl. Round 171: the access gate asks a friend for their code, or
// for a Gemini key when the server has no model for them.
export default function App() {
  return (
    <>
      <DungeonScreen useStore={useGameStore} />
      <AccessGate />
    </>
  );
}
