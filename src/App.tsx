import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Gallery } from './pages/Gallery';
import { Player } from './pages/Player';
import { ThemeProvider } from './components/theme-provider';

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="canvas-animation-theme">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Gallery />} />
          <Route path="/a/:id" element={<Player />} />
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
