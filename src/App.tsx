import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Gallery } from './pages/Gallery';
import { Player } from './pages/Player';
import { SequencePreview } from './pages/SequencePreview';
import { Composer } from './pages/Composer';
import { ComposeGuard } from './components/ComposeGuard';
import { ThemeProvider } from './components/theme-provider';
import { AnimationChat } from './components/AnimationChat';
import { ComposerChatProvider } from './context/ComposerChatContext';
import { AuthProvider } from './context/AuthContext';
import { WorkspaceProvider } from './context/WorkspaceContext';
import { Toaster } from 'sonner';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="canvas-animation-theme">
      <AuthProvider>
        <WorkspaceProvider>
          <ComposerChatProvider>
            <BrowserRouter>
              <Toaster position="bottom-right" richColors />
              <Routes>
            <Route path="/" element={<Gallery />} />
            <Route path="/a/:id" element={<Player />} />
            <Route path="/s/:id" element={<SequencePreview />} />
            <Route path="/compose" element={<ComposeGuard><Composer /></ComposeGuard>} />
              </Routes>
              <AnimationChat />
            </BrowserRouter>
          </ComposerChatProvider>
        </WorkspaceProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}

export default App;
