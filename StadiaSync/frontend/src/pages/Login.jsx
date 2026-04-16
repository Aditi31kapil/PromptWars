import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lock, LayoutDashboard } from 'lucide-react';
import { supabase } from '../supabaseClient';

export default function Login() {
  const [identifier, setIdentifier] = useState('');
  const navigate = useNavigate();

  const handleLogin = async () => {
    // Basic RBAC Check logic
    // If it looks like a ticket tx_...
    if (identifier.startsWith('tx_')) {
      const { data, error } = await supabase.from('tickets').select('*').eq('ticket_id', identifier);
      if (data && data.length > 0) {
        navigate(`/customer-dashboard?ticket=${identifier}`);
        return;
      }
      alert('Ticket ID not found. Ensure it is exactly 5 digits (e.g., tx_00001).');
      return;
    }
    
    // If it looks like staff (staff_...)
    if (identifier.startsWith('staff_')) {
      navigate(`/volunteer-portal?staff=${identifier}`);
      return;
    }
    
    // If Admin
    if (identifier === 'admin') {
      navigate(`/admin-hub`);
      return;
    }

    alert('Invalid Identifier! Try tx_00001, staff_1, or simply "admin".');
  };

  return (
    <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh', flexDirection: 'column' }}>
      <div className="card" style={{ maxWidth: '400px', width: '100%', textAlign: 'center' }}>
        <LayoutDashboard size={48} color="var(--primary-blue)" style={{ marginBottom: '1rem' }} />
        <h2 style={{ margin: '0 0 1.5rem 0' }}>StadiaSync Core Login</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
          Unified access portal for Admins, Staff, and Patrons.
        </p>

        <div style={{ position: 'relative', marginBottom: '1.5rem' }}>
          <Lock size={20} style={{ position: 'absolute', top: '10px', left: '10px', color: 'var(--text-secondary)' }} />
          <input 
            value={identifier}
            onChange={e => setIdentifier(e.target.value)}
            placeholder="Enter ID (tx_..., staff_..., or admin)"
            style={{ width: '100%', padding: '0.6rem 0.6rem 0.6rem 2.5rem', borderRadius: '4px', boxSizing: 'border-box' }}
            onKeyDown={(e) => e.key === 'Enter' && handleLogin()}
          />
        </div>

        <button style={{ width: '100%' }} onClick={handleLogin}>Authenticate Access</button>
      </div>
    </div>
  );
}
