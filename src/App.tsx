import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Gallery } from './pages/Gallery';
import { Player } from './pages/Player';
import { Composer } from './pages/Composer';
import { ThemeProvider } from './components/theme-provider';
import { AnimationChat } from './components/AnimationChat';
import { ComposerChatProvider } from './context/ComposerChatContext';
import { Toaster } from 'sonner';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="canvas-animation-theme">
      <ComposerChatProvider>
        <BrowserRouter>
          <Toaster position="bottom-right" richColors />
          <Routes>
            <Route path="/" element={<Gallery />} />
            <Route path="/a/:id" element={<Player />} />
            <Route path="/compose" element={<Composer />} />
          </Routes>
          <AnimationChat />
        </BrowserRouter>
      </ComposerChatProvider>
    </ThemeProvider>
  );
}

export default App;
