import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Ticket, User, Shield } from 'lucide-react';

export default function Landing() {
  const [selectedMatch, setSelectedMatch] = useState('event_201');
  const [ticketId, setTicketId] = useState('');
  const [adminEmail, setAdminEmail] = useState('');
  const [adminPass, setAdminPass] = useState('');
  const [staffId, setStaffId] = useState('');
  const navigate = useNavigate();

  return (
    <div className="container" style={{maxWidth: '800px', marginTop: '4rem'}}>
      <h1 className="title" style={{ color: "var(--primary-blue)", textAlign: 'center', marginBottom: '2rem' }}>
        Welcome to StadiaSync
      </h1>

      <div className="card" style={{ marginBottom: '2rem', background: '#eef2ff' }}>
        <h2 style={{marginTop: 0}}>Find Your Match</h2>
        <select 
          value={selectedMatch} 
          onChange={(e) => setSelectedMatch(e.target.value)}
          style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid #ccc', fontSize: '1rem' }}
        >
          <option value="event_201">Aug 13: Royal Challengers vs Mumbai Indians</option>
          <option value="event_202">Aug 14: Super Kings vs Sunrisers</option>
          <option value="event_203">Aug 15: Knight Riders vs Titans</option>
        </select>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
        <div className="card">
          <div style={{display: 'flex', alignItems: 'center', marginBottom: '1rem'}}><Ticket size={24} style={{marginRight: '8px', color: 'var(--primary-blue)'}} /> <h3>Customer</h3></div>
          <input 
            placeholder="Enter Ticket ID" 
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button style={{width: '100%'}} onClick={() => navigate('/customer-dashboard?ticket=' + ticketId)}>Enter Stadium</button>
        </div>

        <div className="card">
          <div style={{display: 'flex', alignItems: 'center', marginBottom: '1rem'}}><Shield size={24} style={{marginRight: '8px', color: '#ff6b6b'}} /> <h3>Admin</h3></div>
          <input 
            placeholder="Email" 
            type="email"
            value={adminEmail}
            onChange={(e) => setAdminEmail(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginBottom: '0.5rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <input 
            placeholder="Password" 
            type="password"
            value={adminPass}
            onChange={(e) => setAdminPass(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button style={{width: '100%', backgroundColor: '#ff6b6b', color: 'white'}} onClick={() => navigate('/admin-hub')}>Login to Hub</button>
        </div>

        <div className="card">
          <div style={{display: 'flex', alignItems: 'center', marginBottom: '1rem'}}><User size={24} style={{marginRight: '8px', color: '#20c997'}} /> <h3>Volunteer</h3></div>
          <input 
            placeholder="Enter Staff ID" 
            value={staffId}
            onChange={(e) => setStaffId(e.target.value)}
            style={{ width: '100%', padding: '0.5rem', marginBottom: '1rem', borderRadius: '4px', border: '1px solid #ccc' }}
          />
          <button style={{width: '100%', backgroundColor: '#20c997', color: 'white'}} onClick={() => navigate('/volunteer-portal?staff=' + staffId)}>Access Portal</button>
        </div>
      </div>
    </div>
  );
}
