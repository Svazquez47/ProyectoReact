import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'
// Cuando pasemos tu base.css a src/styles/base.css, lo importaremos aquí:
// import './styles/base.css'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>,
)
