import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Analyzer from './pages/Analyzer';
import ProjectRegistry from './pages/ProjectRegistry';
import Projects from './pages/Projects';
import Reports from './pages/Reports';
import Login from './pages/Login';
import { SessionContextProvider } from './components/SessionContextProvider';
import ProtectedRoute from './components/ProtectedRoute';

const App = () => {
    return (
        <BrowserRouter>
            <SessionContextProvider>
                <Routes>
                    <Route path="/login" element={<Login />} />
                    
                    {/* Rotas Protegidas */}
                    <Route element={<ProtectedRoute />}>
                        <Route path="/" element={<Layout />}>
                            <Route index element={<Analyzer />} />
                            <Route path="cadastro-projetos" element={<ProjectRegistry />} />
                            <Route path="projetos" element={<Projects />} />
                            <Route path="relatorios" element={<Reports />} />
                        </Route>
                    </Route>
                </Routes>
            </SessionContextProvider>
        </BrowserRouter>
    );
};

export default App;