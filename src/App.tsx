import { useState } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import Login from './pages/Login';
import Projects from './pages/Projects';
import Layout from './components/Layout';
import ProtectedRoute from './components/ProtectedRoute';
import SessionContextProvider from './components/SessionContextProvider';
import PieceRegistry from './pages/PieceRegistry';
import Reports from './pages/Reports';

function App() {
  return (
    <SessionContextProvider>
      <Router>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<Home />} />
              <Route path="/projects" element={<Projects />} />
              <Route path="/registry" element={<PieceRegistry />} />
              <Route path="/reports" element={<Reports />} />
            </Route>
          </Route>
        </Routes>
      </Router>
    </SessionContextProvider>
  );
}

export default App;