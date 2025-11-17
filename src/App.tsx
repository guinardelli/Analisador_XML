import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Analyzer from './pages/Analyzer';
import ProjectRegistry from './pages/ProjectRegistry';
import Projects from './pages/Projects';
import Reports from './pages/Reports';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Analyzer />} />
                    <Route path="cadastro-projetos" element={<ProjectRegistry />} />
                    <Route path="projetos" element={<Projects />} />
                    <Route path="relatorios" element={<Reports />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
};

export default App;