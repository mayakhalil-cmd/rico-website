import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.tsx'
import { startFavicon } from './favicon'

const teletactile = new FontFace(
  'Teletactile',
  `url(${import.meta.env.BASE_URL}fonts/Teletactile.ttf) format('truetype')`,
  { display: 'swap' },
)
teletactile
  .load()
  .then((font) => document.fonts.add(font))
  .catch(() => { /* font file not added yet: fallback font is used */ })

startFavicon() 

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
