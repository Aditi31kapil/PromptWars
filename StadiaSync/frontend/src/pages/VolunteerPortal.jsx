import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { toast } from 'react-toastify';

export default function VolunteerPortal() {
  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const staffId = searchParams.get('staff') || 'staff_1';
  const [staffData, setStaffData] = useState(null);

  const [notifications, setNotifications] = useState([]);
  const [dismissedNotifs, setDismissedNotifs] = useState(new Set());

  const [lostItems, setLostItems] = useState([]);
  const [foundTitle, setFoundTitle] = useState('');
  const [foundLocation, setFoundLocation] = useState('');
  const [foundDesc, setFoundDesc] = useState('');

  // Modern Clean Virtual Venue Aesthetic Design Language
  const styles = {
    glassCard: {
      background: '#111A33',
      border: '1px solid rgba(255, 255, 255, 0.05)',
      borderRadius: '8px',
      padding: '1.25rem',
      boxShadow: '0 4px 16px rgba(0, 0, 0, 0.3)',
      display: 'flex',
      flexDirection: 'column',
      fontFamily: "'Inter', sans-serif"
    },
    header: {
      margin: '0 0 1rem 0',
      fontSize: '0.95rem',
      textTransform: 'uppercase',
      color: 'rgba(255,255,255,0.8)',
      letterSpacing: '0.5px'
    }
  };

  useEffect(() => {
    if (!staffId) return;

    const initializePortal = async () => {
      // 1. Fetch Staff Identity
      const { data: sData } = await supabase.from('staff').select('*').eq('id', staffId).single();
      if (sData) setStaffData(sData);

      // 2. Fetch Native Lost Items directly from Supabase
      const { data: items } = await supabase
        .from('lost_items')
        .select('*')
        .eq('status', 'lost')
        .order('created_at', { ascending: false });
      if (items) setLostItems(items);
    };

    initializePortal();

    // 3. Native Supabase Subscriptions for deep edge sync
    const channel = supabase.channel('portal_realtime')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'staff', filter: `id=eq.${staffId}` },
        payload => {
          const newData = payload.new;
          if (newData.current_zone !== staffData?.current_zone) {
            toast.info(`⚠️ Dispatch Reassignment: Proceed to ${newData.current_zone} immediately.`, {
              autoClose: false,
              position: 'bottom-right'
            });
             // Log the notification to local systems board
             fetch(`${API_URL}/api/notifications`, {
               method: 'POST',
               headers: { 'Content-Type': 'application/json' },
               body: JSON.stringify({ sender: 'Command Dispatch', content: `OPERATIVE REASSIGNMENT: ${newData.name} urgently deployed to ${newData.current_zone}.` })
             });
          }
          setStaffData(newData);
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lost_items' },
        payload => {
          if (payload.eventType === 'INSERT') {
            if (payload.new.status === 'lost') {
              setLostItems(prev => [payload.new, ...prev]);
              toast.warn(`🚨 EMERGENCY ALERT: New Item Logged as LOST - ${payload.new.title}`);
            }
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.status !== 'lost') {
              setLostItems(prev => prev.filter(i => i.id !== payload.new.id));
            }
          }
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [staffId]);

  // Unified API Poller for Intelligence Data (Mainly Notifications)
  useEffect(() => {
    const fetchDynamics = async () => {
      try {
        const notsRes = await fetch(`${API_URL}/api/notifications`);
        const notsData = await notsRes.json();
        setNotifications(notsData.notifications || []);
      } catch (e) {
        console.error("Failed to sync backend state streams.", e);
      }
    };
    fetchDynamics();
    const interval = setInterval(fetchDynamics, 3000);
    return () => clearInterval(interval);
  }, []);

  const handleDismiss = (id) => {
    setDismissedNotifs(prev => new Set(prev).add(id));
  };

  const submitFoundItem = async () => {
    if (!foundTitle || !foundLocation) return;

    // Notice: We do NOT include 'id' here at all. 
    // We want the database to generate the ID automatically.
    const newItem = {
      type: 'volunteer_found',
      title: foundTitle,
      location: foundLocation,
      description: foundDesc,
      reporter_name: staffData?.id || staffId, // This goes into the reporter_name column, NOT the id column
      status: 'open'
    };

    const { error } = await supabase
      .from('lost_items')
      .insert([newItem]); // Supabase will see no 'id' and trigger the gen_random_uuid() default

    if (!error) {
      setFoundTitle('');
      setFoundLocation('');
      setFoundDesc('');
      toast.success("Broadcasted natively to Supabase: Item Logged");

      // Optional: Keep your notification fetch
      fetch(`${API_URL}/api/notifications`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: 'Operative Network',
          content: `FOUND LOGGED: Asset confiscated at ${foundLocation}.`
        })
      }).catch(err => console.error("Notification server offline", err));

    } else {
      toast.error(`Database Error: ${error.message}`);
      console.error("Submission Error:", error);
    }
  };

  const claimItem = async (itemId) => {
    await supabase.from('lost_items').update({ status: 'resolved' }).eq('id', itemId);
    setLostItems(prev => prev.filter(i => i.id !== itemId));
    toast.success("Item Marked as Resolved!");
  };

  // Safe Null Loader
  if (!staffData) return <div style={{ background: '#0A1224', height: '100vh', color: '#fff', padding: '2rem' }}>Loading Secure Identity Matrix...</div>;

  const activeNotifs = notifications.filter(n => !dismissedNotifs.has(n.id));

  return (
    <div style={{ backgroundColor: '#0A1224', minHeight: '100vh', padding: '1.5rem', color: '#fff', fontFamily: "'Inter', sans-serif" }}>

      {/* Universal Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#1A73E8', letterSpacing: '1px' }}>
          OPERATIVE CONSOLE ({staffData.name})
        </h1>
        <button
          onClick={() => navigate('/')}
          style={{
            background: 'rgba(255, 77, 77, 0.1)',
            color: '#ff4d4d',
            border: '1px solid rgba(255, 77, 77, 0.3)',
            padding: '0.5rem 1rem',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 'bold',
            textTransform: 'uppercase',
            letterSpacing: '1px',
            transition: 'all 0.2s'
          }}
          onMouseOver={(e) => e.target.style.background = 'rgba(255, 77, 77, 0.2)'}
          onMouseOut={(e) => e.target.style.background = 'rgba(255, 77, 77, 0.1)'}
        >
          Exit
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2.5fr', gap: '1.5rem', height: '85vh' }}>

        {/* LEFT PANE: Unified Intelligence Feed */}
        <div style={{ ...styles.glassCard, height: '100%', overflowY: 'auto' }}>
          <h3 style={{ ...styles.header, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem' }}>
            Live System & Asset Feed
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>

            {/* Render Standard Notifications */}
            {activeNotifs.map(n => (
              <div key={n.id} style={{ background: 'rgba(26, 115, 232, 0.1)', borderLeft: '3px solid #1A73E8', padding: '1rem', borderRadius: '4px', position: 'relative' }}>
                <button
                  onClick={() => handleDismiss(n.id)}
                  style={{ position: 'absolute', top: '0.5rem', right: '0.5rem', background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', fontSize: '1.2rem', fontWeight: 'bold' }}
                >×</button>
                <div style={{ fontSize: '0.7rem', color: '#1A73E8', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 'bold' }}>SYSTEM ALERT: {n.sender}</div>
                <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{n.content}</div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', textAlign: 'right' }}>{n.timestamp ? new Date(n.timestamp).toLocaleTimeString() : new Date().toLocaleTimeString()}</div>
              </div>
            ))}

            {/* Render Missing Board inside feed */}
            {lostItems.map(item => (
              <div key={item.id} style={{ background: 'rgba(255,255,255,0.05)', position: 'relative', borderLeft: `3px solid ${item.type === 'volunteer_found' ? '#00FF00' : '#FFBE0B'}`, padding: '1rem', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.7rem', color: item.type === 'volunteer_found' ? '#00FF00' : '#FFBE0B', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  {item.type === 'volunteer_found' ? 'ASSET RECOVERED BY OPS' : 'PATRON INTELLIGENCE: MISSING'}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{item.title}</div>
                <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>"{item.description}"</div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.8rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>📍 Near {item.location} <br /><span style={{ opacity: 0.5 }}>(By: {item.reporter_name})</span></div>
                  <button onClick={() => claimItem(item.id)} style={{ padding: '0.3rem 0.8rem', background: '#00FF00', color: '#000', border: 'none', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    MARK RESOLVED
                  </button>
                </div>
              </div>
            ))}

            {(activeNotifs.length === 0 && lostItems.length === 0) && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', textAlign: 'center', marginTop: '2rem' }}>Systems Normal...</div>}
          </div>
        </div>

        {/* RIGHT PANE: Workspace Hub */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>

          {/* Top Block: Active Deployment HUD */}
          <div style={{ ...styles.glassCard, background: 'rgba(0, 255, 0, 0.05)', border: '1px solid rgba(0, 255, 0, 0.2)' }}>
            <h3 style={{ ...styles.header, color: '#00FF00', marginBottom: '0.5rem' }}>Operational HUD</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Assigned Deployment Vector</span>
                <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#00FF00' }}>{staffData.current_zone}</div>
              </div>
              <div>
                <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>Assigned Specialization</span>
                <div style={{ fontSize: '1.1rem', marginTop: '0.4rem', textTransform: 'uppercase' }}>{staffData.role}</div>
              </div>
            </div>
          </div>

          {/* Bottom Split Block: Lost & Found Management */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem', flex: 1 }}>

            {/* Box B: Confiscate & Broadcast Tools */}
            <div style={{ ...styles.glassCard, flex: 1 }}>
              <h3 style={{ ...styles.header, color: '#fff' }}>Broadcast Found Item</h3>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' }}>Log physically confiscated/abandoned items securely into the network.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <input
                  placeholder="Asset Title (e.g., iPhone 14 Pro)"
                  value={foundTitle} onChange={e => setFoundTitle(e.target.value)}
                  style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                />
                <input
                  placeholder="Exact Found Coordinates (e.g., Washroom East, Sink 3)"
                  value={foundLocation} onChange={e => setFoundLocation(e.target.value)}
                  style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                />
                <textarea
                  placeholder="Visual Description & Defining marks logistics..."
                  value={foundDesc} onChange={e => setFoundDesc(e.target.value)}
                  style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', minHeight: '80px', resize: 'none' }}
                />
                <button
                  onClick={submitFoundItem}
                  disabled={!foundTitle || !foundLocation}
                  style={{ padding: '1rem', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '0.5rem', boxShadow: '0 4px 6px rgba(0,0,0,0.2)' }}
                >
                  Confirm & Broadcast &gt;&gt;
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
