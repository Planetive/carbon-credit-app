import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import './index.css'
import ProjectCards from './pages/ProjectCards';

createRoot(document.getElementById("root")!).render(<App />);
