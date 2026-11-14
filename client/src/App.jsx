import DungeonScreen from './components/DungeonScreen.jsx';
import { useGameStore } from './stores/useGameStore.js';

// Round 115: the web client is the Ta Prohm dungeon crawl.
export default function App() {
  return <DungeonScreen useStore={useGameStore} />;
}
