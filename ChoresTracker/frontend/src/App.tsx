
import './App.css'

// @ts-ignore
import React, { useEffect, useState } from 'react';

function App() {
    const [message, setMessage] = useState("Waiting for backend...");

    useEffect(() => {
        fetch('http://localhost:8080/api/test')
            .then(response => response.text())
            .then(data => setMessage(data))
            .catch(err => setMessage("Backend is trippin: " + err));
    }, []);

    return (
        <div style={{ textAlign: 'center', marginTop: '50px' }}>
            <h1>Chores Tracker Connection Test</h1>
            <p>Status: <strong>{message}</strong></p>
        </div>
    );
}

export default App;

