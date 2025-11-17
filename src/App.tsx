import React, { useState } from 'react';

function App() {
  const [count, setCount] = useState(0);

  return (
    <div style={{ padding: '2rem', textAlign: 'center', fontFamily: 'sans-serif', color: '#333' }}>
      <h1 style={{ marginBottom: '1rem' }}>Aplicativo React</h1>
      <p style={{ marginBottom: '1rem', fontSize: '1.2rem' }}>Contagem atual: {count}</p>
      <button 
        onClick={() => setCount(count + 1)}
        style={{ 
          padding: '0.5rem 1.5rem', 
          fontSize: '1rem', 
          cursor: 'pointer',
          backgroundColor: '#007bff',
          color: 'white',
          border: 'none',
          borderRadius: '4px'
        }}
      >
        Incrementar
      </button>
    </div>
  );
}

export default App;