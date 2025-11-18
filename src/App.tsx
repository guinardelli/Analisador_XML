import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import Home from './pages/Home';
import Login from './pages/Login';
import Projects from './pages/Projects';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import SessionContextProvider from './components/SessionContextProvider';
import PieceRegistry from './pages/PieceRegistry';
import Reports from './pages/Reports';
import ProjectRegistry from './pages/ProjectRegistry';
import ProjectDetails from './pages/ProjectDetails';

function App() {
  return (
    <SessionContextProvider>
      <Toaster position="top-right" />
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/projetos" element={<Projects />} />
              <Route path="/projetos/novo" element={<ProjectRegistry />} />
              <Route path="/projetos/:projectId" element={<ProjectDetails />} />
              <Route path="/cadastro" element={<PieceRegistry />} />
              <Route path="/relatorios" element={<Reports />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </SessionContextProvider>
  );
}

export default App;