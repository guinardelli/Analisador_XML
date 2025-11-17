import React from 'react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Layout from './components/Layout';
import Analyzer from './pages/Analyzer';
import ProjectRegistry from './pages/ProjectRegistry';

const App = () => {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<Layout />}>
                    <Route index element={<Analyzer />} />
                    <Route path="cadastro-projetos" element={<ProjectRegistry />} />
                </Route>
            </Routes>
        </BrowserRouter>
    );
};

export default App;