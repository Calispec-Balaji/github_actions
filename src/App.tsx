import { useState } from 'react'
import './App.css'

// ⚠️ PERFORMANCE TEST: Heavy blocking computation — intentionally drops Lighthouse score
function simulateHeavyTask() {
  const start = Date.now()
  while (Date.now() - start < 3000) {
    // Block main thread for 3 seconds → tanks TBT → performance drops below 90
    Math.sqrt(Math.random() * 999999)
  }
}
simulateHeavyTask()

function App() {
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  return (
    <main style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '24px', fontFamily: 'sans-serif' }}>
      <h1 style={{ fontSize: '2rem', margin: 0 }}>🚀 Deployment Pipeline Test</h1>
      <p style={{ color: '#aaaaaa', margin: 0 }}>Lighthouse CI + Cloudflare Pages</p>

      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{ padding: '16px 24px', background: '#1a1a1a', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem' }}>✅</div>
          <div style={{ marginTop: '8px', color: '#4ade80' }}>Build</div>
        </div>
        <div style={{ padding: '16px 24px', background: '#1a1a1a', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem' }}>🔍</div>
          <div style={{ marginTop: '8px', color: '#60a5fa' }}>Lighthouse</div>
        </div>
        <div style={{ padding: '16px 24px', background: '#1a1a1a', borderRadius: '8px', textAlign: 'center' }}>
          <div style={{ fontSize: '1.5rem' }}>☁️</div>
          <div style={{ marginTop: '8px', color: '#f97316' }}>Cloudflare</div>
        </div>
      </div>

      <button
        onClick={() => setStatus('success')}
        style={{ padding: '12px 32px', fontSize: '1rem', borderRadius: '8px', border: 'none', background: '#646cff', color: '#fff', cursor: 'pointer' }}
      >
        Test UI
      </button>

      {status === 'success' && (
        <p style={{ color: '#4ade80', fontWeight: 'bold' }}>✅ UI is working correctly!</p>
      )}
    </main>
  )
}

export default App
