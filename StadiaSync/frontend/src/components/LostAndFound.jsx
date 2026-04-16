import React, { useState } from 'react';

export default function LostAndFound() {
  const [description, setDescription] = useState('');
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(false);

  const handleMatch = async () => {
    setLoading(true);
    try {
      const res = await fetch('http://localhost:8080/api/lost-and-found/match', {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ description })
      });
      const data = await res.json();
      setMatches(data.matches || []);
    } catch (e) {
      console.error(e);
      alert('Error connecting to ML backend.');
    }
    setLoading(false);
  };

  return (
    <div className="card" style={{ flex: 1, display: 'flex', flexDirection: 'column', height: '100%' }}>
      <h3>NLP Lost & Found Semantic Matcher</h3>
      <p style={{ color: 'var(--text-secondary)' }}>Powered by Gemini API. Register found items.</p>
      
      <textarea 
        value={description}
        onChange={e => setDescription(e.target.value)}
        placeholder="e.g. Red jacket found near Gate 5..."
        style={{ width: '100%', padding: '1rem', background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', borderRadius: '4px', marginBottom: '1rem', minHeight: '80px', boxSizing: 'border-box' }}
      />
      <button onClick={handleMatch} disabled={loading}>
        {loading ? 'Running Contextual Semantic Search...' : 'Register & Find Matches'}
      </button>

      {matches.length > 0 && (
        <div style={{ marginTop: '1rem', overflowY: 'auto' }}>
          <h4 style={{marginBottom: '0.5rem'}}>Top Confidence Matches</h4>
          {matches.map((m, i) => (
            <div key={i} style={{ background: 'rgba(255,255,255,0.05)', padding: '0.8rem', borderRadius: '4px', marginBottom: '0.5rem' }}>
              <strong>Inquiry: {m.inquiry_id}</strong> | Score: <span style={{color: 'var(--color-success)', fontWeight:'bold'}}>{(m.match_score * 100).toFixed(0)}%</span>
              <p style={{ margin: '0.5rem 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Logic: {m.matching_logic}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
