import React from 'react'
import { createRoot } from 'react-dom/client'
import { App } from './App'
import { AppProvider } from './state/app'
import { StoreProvider } from './state/store'
import './styles.css'

createRoot(document.getElementById('root')!).render(
  <AppProvider>
    <StoreProvider>
      <App />
    </StoreProvider>
  </AppProvider>,
)
