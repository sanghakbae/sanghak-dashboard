import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
import PWAStatus from './PWAStatus.jsx'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <PWAStatus />
    <App />
  </React.StrictMode>,
)
