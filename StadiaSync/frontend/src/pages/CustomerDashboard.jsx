import React, { useEffect, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
export default function CustomerDashboard() {
  const [searchParams] = useSearchParams();
  const ticketId = searchParams.get('ticket') || 'Patron_Generic';

  // Existing States
  const [instruction, setInstruction] = useState('Fetching optimal entry route...');

  // Advanced Integration States
  const [notifications, setNotifications] = useState([]);
  const [lostItems, setLostItems] = useState([]);
  const [closureAlert, setClosureAlert] = useState(null);
  const [zones, setZones] = useState([]);
  const [myBooking, setMyBooking] = useState(null);

  // Patron Log Found Item
  const [foundTitle, setFoundTitle] = useState('');
  const [foundLocation, setFoundLocation] = useState('');
  const [foundDesc, setFoundDesc] = useState('');

  // Manual Report States
  const [lostTitle, setLostTitle] = useState('');
  const [lostLocation, setLostLocation] = useState('');
  const [lostDesc, setLostDesc] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Incentivized Routing State
  const [routingIncentive, setRoutingIncentive] = useState(null);

  // Helper: Map Zone IDs to Human Readable Names
  const mapZoneName = (id) => {
    if (id?.startsWith('C')) {
      const num = id.replace('C', '');
      return `Food Stall ${parseInt(num, 10) || num}`;
    }
    if (id?.includes('W')) return `Washroom ${id}`;
    return id;
  };

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
    // Legacy Routing Fetcher
    if (ticketId) {
      fetch('http://localhost:8000/api/routing/entry', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ticket_id: ticketId })
      })
        .then(res => res.json())
        .then(data => setInstruction(data.instruction || 'Proceed to General Admission'))
        .catch(() => setInstruction('Proceed to General Admission.'));
    }

    // New Priority Notifications Poller
    const fetchDynamics = async () => {
      try {
        const notsRes = await fetch('http://localhost:8000/api/notifications');
        const notsData = await notsRes.json();
        setNotifications(notsData.notifications || []);
      } catch (e) {
        console.error("Failed to sync backend state streams.", e);
      }
    };
    fetchDynamics();
    const interval = setInterval(fetchDynamics, 5000);

    // Native Supabase Fetching (Lost Items)
    const fetchLostItems = async () => {
      const { data } = await supabase.from('lost_items').select('*').eq('status', 'lost').order('created_at', { ascending: false });
      if (data) setLostItems(data);
    };
    fetchLostItems();

    // Native Supabase Fetching (Zones for queues)
    const fetchZones = async () => {
      // Order by Seat_ID to ensure identical stalls are shown to all ticket holders
      const { data } = await supabase.from('zones').select('*').order('Seat_ID', { ascending: true });
      if (data) {
        // Explicitly grab 2 concessions and 2 washrooms for a perfect 2x2 grid
        const food = data.filter(z => z.Seat_ID?.startsWith('C')).slice(0, 2);
        const wash = data.filter(z => z.Seat_ID?.includes('W')).slice(0, 2);
        const queueTargets = [...food, ...wash];

        setZones(queueTargets);

        // --- LOAD BALANCER ANALYZER ---
        const concessions = queueTargets.filter(z => z.Seat_ID?.startsWith('C'));
        if (concessions.length >= 2) {
          const stallsWithWait = concessions.map(z => ({
            ...z,
            wait: Math.max(2, Math.round(z.People_Count / 4))
          })).sort((a, b) => b.wait - a.wait);

          const maxStall = stallsWithWait[0];
          const minStall = stallsWithWait[stallsWithWait.length - 1];

          if (maxStall.wait - minStall.wait >= 10) {
            const discount = maxStall.wait > 30 ? '10% OFF' : '5% OFF';
            setRoutingIncentive({
              highStall: mapZoneName(maxStall.Seat_ID),
              lowStall: mapZoneName(minStall.Seat_ID),
              discount,
              delta: maxStall.wait - minStall.wait
            });

            // Broadcast to backend one-time
            fetch('http://localhost:8000/api/notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                sender: 'System Load Balancer',
                content: `TRAFFIC OPTIMIZATION: Routing initiated from ${mapZoneName(maxStall.Seat_ID)} to ${mapZoneName(minStall.Seat_ID)} via ${discount} incentive.`
              })
            }).catch(() => { });
          } else {
            setRoutingIncentive(null);
          }
        }
      }
    };
    fetchZones();

    // Native Event Listening
    const channel = supabase.channel('customer_realtime')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lost_items' },
        payload => {
          if (payload.eventType === 'INSERT' && payload.new.status === 'lost') {
            setLostItems(prev => [payload.new, ...prev]);
          } else if (payload.eventType === 'UPDATE') {
            if (payload.new.status !== 'lost') {
              setLostItems(prev => prev.filter(i => i.id !== payload.new.id));
              // 3. Closure Notification Hook!
              if (payload.new.status === 'resolved' && payload.new.reporter_name === ticketId) {
                setClosureAlert(payload.new);
                setTimeout(() => setClosureAlert(null), 8000);
              }
            }
          }
        }
      )
      .on('postgres_changes', { event: '*', schema: 'public', table: 'zones' },
        payload => {
          fetchZones();
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(channel);
    };
  }, [ticketId]);


  const submitLostItem = async () => {
    if (!lostTitle || !lostLocation || !lostDesc) return;
    setIsSubmitting(true);

    try {
      const { error } = await supabase.from('lost_items').insert([{
        type: 'customer_lost',
        title: lostTitle,
        location: lostLocation, // last_seen_location mapping
        description: lostDesc, // item_description mapping
        reporter_name: ticketId, // reported_by mapping
        status: 'lost'
      }]);

      if (error) throw error;

      // Broadcast Notification to Volunteers (Non-blocking cleanup)
      fetch('http://localhost:8000/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: `Patron ${ticketId}`,
          content: `URGENT: Lost Item Reported - ${lostTitle} near ${lostLocation}.`
        })
      }).catch(err => console.error("Notification broadcast error (non-fatal):", err));

      alert(`Lost Item Successfully Reported! Intelligence dispatched to stadium operatives.`);
      setLostTitle('');
      setLostLocation('');
      setLostDesc('');
    } catch (e) {
      console.error(e);
      alert('Failed to transmit report. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const submitFoundItem = async () => {
    if (!foundTitle || !foundLocation) return;
    const { error } = await supabase.from('lost_items').insert([{
      type: 'volunteer_found',
      title: foundTitle,
      location: foundLocation,
      description: foundDesc,
      reporter_name: ticketId,
      status: 'open'
    }]);

    if (!error) {
      setFoundTitle(''); setFoundLocation(''); setFoundDesc('');
      alert("Broadcasted natively to Supabase: Item Logged");
    }
  };

  const claimItem = async (itemId) => {
    await supabase.from('lost_items').update({ status: 'resolved' }).eq('id', itemId);
    setLostItems(prev => prev.filter(i => i.id !== itemId));
    alert("Asset Secured! Connecting you with operative grid...");
  };

  const bookQueue = async (zone) => {
    // 1. Calculate the new global count
    const newCount = (zone.People_Count || 0) + 1;

    // 2. Transmit to Supabase (Global update)
    const { error } = await supabase
      .from('zones')
      .update({ People_Count: newCount })
      .eq('Seat_ID', zone.Seat_ID);

    if (!error) {
      // 3. Set local booking state to prevent double-booking on same device
      setMyBooking({ zoneId: zone.Seat_ID, number: newCount });

      // 4. Update operative grid via notification
      fetch('http://localhost:8000/api/notifications', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sender: `Patron ${ticketId}`,
          content: `SMART BOOKING: Seat reserved at ${mapZoneName(zone.Seat_ID)} (Global Queue Position #${newCount})`
        })
      }).catch(() => { });
    }
  };

  return (
    <div style={{ backgroundColor: '#0A1224', minHeight: '100vh', padding: '1.5rem', color: '#fff', fontFamily: "'Inter', sans-serif" }}>

      {/* Universal Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#1A73E8', letterSpacing: '1px', textTransform: 'uppercase' }}>
          PATRON SERVICES CONNECT ({ticketId})
        </h1>
        <div style={{ display: 'flex', gap: '1rem' }}>
          <div style={{ background: '#111A33', padding: '0.5rem 1rem', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span style={{ fontSize: '1.2rem' }}>🌤️</span>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>Local Env</div>
              <div style={{ fontWeight: 'bold' }}>26°C Clear Night</div>
            </div>
          </div>
        </div>
      </div>

      {closureAlert && (
        <div style={{ position: 'fixed', top: '2rem', left: '50%', transform: 'translateX(-50%)', background: '#00FF00', color: '#000', padding: '1.5rem', borderRadius: '8px', zIndex: 9999, boxShadow: '0 10px 40px rgba(0,255,0,0.3)', width: '80%', maxWidth: '600px', textAlign: 'center' }}>
          <h2 style={{ margin: '0 0 0.5rem 0' }}>🎉 YOUR ASSET HAS BEEN SECURED!</h2>
          <p style={{ margin: 0, fontSize: '1.1rem' }}><strong>{closureAlert.title}</strong> has been marked as found and secured safely. Please head to central dispatch to retrieve your item.</p>
        </div>
      )}

      {routingIncentive && (
        <div style={{ background: '#1A73E8', color: '#fff', padding: '1rem', borderRadius: '4px', marginBottom: '1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', boxShadow: '0 0 20px rgba(26, 115, 232, 0.4)', animation: 'pulse 2s infinite' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '1.5rem' }}>🎟️</span>
            <div>
              <div style={{ fontWeight: 'bold', fontSize: '1rem' }}>AVOID THE CROWD: {routingIncentive.discount} REWARD</div>
              <div style={{ fontSize: '0.85rem', opacity: 0.9 }}>
                {routingIncentive.highStall} is busy. Head to <strong>{routingIncentive.lowStall}</strong> for {routingIncentive.discount} your next order!
              </div>
            </div>
          </div>
          <button onClick={() => setRoutingIncentive(null)} style={{ background: 'rgba(255,255,255,0.2)', border: 'none', color: '#fff', padding: '0.4rem 0.8rem', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}>DISMISS</button>
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) 2.5fr', gap: '1.5rem', height: '85vh' }}>

        {/* LEFT PANE: Unified Live Intel Feed */}
        <div style={{ ...styles.glassCard, height: '100%', overflowY: 'auto' }}>
          <h3 style={{ ...styles.header, borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '0.8rem' }}>
            Live Stadium Intel
          </h3>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            {/* 1. Global System Broadcasts (Read-Only) */}
            {notifications.map(n => (
              <div key={n.id} style={{ background: 'rgba(26, 115, 232, 0.1)', borderLeft: '3px solid #1A73E8', padding: '1rem', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.7rem', color: '#1A73E8', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 'bold' }}>SYSTEM BROADCAST</div>
                <div style={{ fontSize: '0.9rem', lineHeight: '1.4' }}>{n.content}</div>
                <div style={{ fontSize: '0.65rem', color: 'rgba(255,255,255,0.4)', marginTop: '0.5rem', textAlign: 'right' }}>{new Date(n.timestamp || Date.now()).toLocaleTimeString()}</div>
              </div>
            ))}

            {/* 2. Public Asset Feeds */}
            {lostItems.map(item => (
              <div key={item.id} style={{ background: 'rgba(255,255,255,0.05)', position: 'relative', borderLeft: `3px solid ${item.type === 'volunteer_found' ? '#00FF00' : '#FFBE0B'}`, padding: '1rem', borderRadius: '4px' }}>
                <div style={{ fontSize: '0.7rem', color: item.type === 'volunteer_found' ? '#00FF00' : '#FFBE0B', marginBottom: '0.25rem', textTransform: 'uppercase', fontWeight: 'bold' }}>
                  {item.type === 'volunteer_found' ? 'SECURITY ALERT: ITEM SECURED' : 'PATRON ALERT: ASSET MISSING'}
                </div>
                <div style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '0.25rem' }}>{item.title}</div>
                <div style={{ fontSize: '0.85rem', lineHeight: '1.4' }}>"{item.description}"</div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '0.8rem' }}>
                  <div style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.5)' }}>📍 Near {item.location}</div>

                  <button onClick={() => claimItem(item.id)} style={{ padding: '0.3rem 0.8rem', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', color: '#fff', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
                    {item.type === 'volunteer_found' ? 'CLAIM SECURE' : 'FOUND THIS'}
                  </button>
                </div>
              </div>
            ))}
            {(lostItems.length === 0 && notifications.length === 0) && <div style={{ color: 'rgba(255,255,255,0.4)', fontSize: '0.8rem', textAlign: 'center', marginTop: '2rem' }}>Systems Normal...</div>}
          </div>
        </div>

        {/* RIGHT PANE: Working Tools */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto', paddingRight: '0.5rem' }}>

          {/* Top Block: Navigation UI AND SMART QUEUES */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
            <div style={{ ...styles.glassCard, padding: '1.5rem', border: 'none', background: '#0D0D0D' }}>
              <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.1rem', color: '#fff', textTransform: 'uppercase', letterSpacing: '1px' }}>QUEUE WAIT TIMES</h3>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                {zones.map(z => {
                  // Service Throughput Model: 4 people per minute
                  const waitMins = Math.max(2, Math.round(z.People_Count / 4));
                  const isMyBooking = myBooking?.zoneId === z.Seat_ID;

                  return (
                    <div key={z.Seat_ID} style={{ background: '#1C1C1C', padding: '1.25rem', borderRadius: '6px' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1.5rem' }}>
                        <div>
                          <div style={{ fontSize: '1.1rem', fontWeight: 'bold', display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#fff' }}>
                            <span style={{ color: '#1A73E8' }}>📍</span> {mapZoneName(z.Seat_ID)}
                          </div>
                          <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', marginTop: '0.25rem' }}>Venue Zone</div>
                        </div>
                      </div>

                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                        <div>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#FFBE0B' }}>{waitMins} <span style={{ fontSize: '0.9rem' }}>min</span></div>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>Estimated wait</div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <div style={{ fontSize: '1.5rem', fontWeight: 'bold', color: '#fff' }}>{z.People_Count}</div>
                          <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)' }}>People in queue</div>
                        </div>

                        {/* Dynamic Action Block */}
                        <div style={{ marginLeft: '1rem' }}>
                          {isMyBooking ? (
                            <div style={{ textAlign: 'center', background: 'rgba(0,255,0,0.1)', padding: '0.4rem 0.8rem', borderRadius: '4px', border: '1px solid rgba(0,255,0,0.2)' }}>
                              <div style={{ fontSize: '0.6rem', color: '#00FF00' }}>RESERVED</div>
                              <div style={{ fontWeight: 'bold', color: '#00FF00' }}>#{myBooking.number}</div>
                            </div>
                          ) : (
                            <button onClick={() => bookQueue(z)} style={{ background: '#1A73E8', color: '#fff', border: 'none', padding: '0.5rem 1rem', borderRadius: '4px', cursor: 'pointer', fontSize: '0.75rem', fontWeight: 'bold' }}>
                              BOOK SLOT
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', flex: 1 }}>

            {/* Box A: Patron found an item */}
            <div style={{ ...styles.glassCard, flex: 1, borderTop: '4px solid #00FF00' }}>
              <h3 style={{ ...styles.header, color: '#00FF00' }}>Report Civil Found Item</h3>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1rem' }}>Did you find someone's asset? Broadcast its location and secure it.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <input
                  placeholder="Asset Title (e.g., iPhone 14 Pro)"
                  value={foundTitle} onChange={e => setFoundTitle(e.target.value)}
                  style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                />
                <input
                  placeholder="Exact Found Coordinates"
                  value={foundLocation} onChange={e => setFoundLocation(e.target.value)}
                  style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                />
                <textarea
                  placeholder="Visual Description..."
                  value={foundDesc} onChange={e => setFoundDesc(e.target.value)}
                  style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', minHeight: '60px', resize: 'none' }}
                />
                <button
                  onClick={submitFoundItem}
                  disabled={!foundTitle || !foundLocation}
                  style={{ padding: '0.8rem', background: (foundTitle && foundLocation) ? '#00FF00' : 'rgba(255,255,255,0.1)', color: (foundTitle && foundLocation) ? '#000' : 'rgba(255,255,255,0.3)', border: 'none', borderRadius: '4px', fontWeight: 'bold', cursor: 'pointer', marginTop: '0.5rem' }}
                >
                  Confirm & Broadcast
                </button>
              </div>
            </div>

            {/* Box B: Manual Lost Item Report Form */}
            <div style={{ ...styles.glassCard, flex: 1, borderTop: '4px solid #FFBE0B' }}>
              <h3 style={{ ...styles.header, color: '#FFBE0B' }}>Report Lost Item</h3>
              <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', marginBottom: '1.5rem', lineHeight: '1.5' }}>Describe your missing asset. Our operations team will be alerted immediately.</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <input
                  placeholder="Item Title (e.g., Blue Wallet)"
                  value={lostTitle} onChange={e => setLostTitle(e.target.value)}
                  style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                />
                <input
                  placeholder="Last Seen Location"
                  value={lostLocation} onChange={e => setLostLocation(e.target.value)}
                  style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
                />
                <textarea
                  placeholder="Item Description (item_description)"
                  value={lostDesc} onChange={e => setLostDesc(e.target.value)}
                  style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.3)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px', minHeight: '80px', resize: 'none' }}
                />
                <button
                  onClick={submitLostItem}
                  disabled={isSubmitting || !lostTitle || !lostLocation || !lostDesc}
                  style={{
                    padding: '0.8rem',
                    background: (lostTitle && lostLocation && lostDesc) ? '#FFBE0B' : 'rgba(255,255,255,0.1)',
                    color: (lostTitle && lostLocation && lostDesc) ? '#000' : 'rgba(255,255,255,0.3)',
                    border: 'none',
                    borderRadius: '4px',
                    fontWeight: 'bold',
                    cursor: 'pointer',
                    marginTop: '0.5rem',
                    transition: 'all 0.2s'
                  }}
                >
                  {isSubmitting ? 'Transmitting Intelligence...' : 'Submit Missing Report'}
                </button>
              </div>
            </div>

          </div>
        </div>

      </div>
    </div>
  );
}
