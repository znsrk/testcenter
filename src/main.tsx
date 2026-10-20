import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './studio/App'
import { GradeCalculator } from './components/calc'
import './studio/styles.css'

// Keep the public calculator outside the studio's access-code flow.
const isCalculator = /^\/calc\/?$/.test(window.location.pathname)

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    {isCalculator ? <GradeCalculator /> : <App />}
  </React.StrictMode>
)
