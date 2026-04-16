import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { PieChart, Pie, Cell, Tooltip, BarChart, Bar, XAxis, ResponsiveContainer, YAxis, Legend } from 'recharts';

export default function AdminHub() {
  const navigate = useNavigate();
  const [events, setEvents] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [graphData, setGraphData] = useState({ nodes: [] });
  const [eventPhase, setEventPhase] = useState('Pre-Match');
  const [zoomLevel, setZoomLevel] = useState(100);
  const [notifiedHotspots, setNotifiedHotspots] = useState(new Set());
  const [lostStats, setLostStats] = useState({ lost: 0, found: 0 });

  // Gauge Data
  const [overallOcc, setOverallOcc] = useState({ count: 0, cap: 1 });
  const [zoneAOcc, setZoneAOcc] = useState({ count: 0, cap: 1 });
  const [zoneBOcc, setZoneBOcc] = useState({ count: 0, cap: 1 });

  // Dispatch
  const [targetStaff, setTargetStaff] = useState('');
  const [targetZone, setTargetZone] = useState('');

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

  const HOTSPOT_CONFIG = [
    { id: 'Gate North (Ingress)', type: 'Gate', x: 600, y: 80, color: '#3A86FF' },
    { id: 'Gate South (Egress)', type: 'Gate', x: 600, y: 720, color: '#3A86FF' },
    { id: 'Washroom East', type: 'Washroom', x: 1050, y: 400, color: '#FFBE0B' },
    { id: 'Washroom West', type: 'Washroom', x: 150, y: 400, color: '#FFBE0B' },
    { id: 'Food Stall West', type: 'Food', x: 250, y: 150, color: '#FB5607' },
    { id: 'Food Stall East', type: 'Food', x: 950, y: 650, color: '#FB5607' },
    { id: 'SE Concourse', type: 'Concourse', x: 950, y: 150, color: '#8338EC' },
    { id: 'SW Concourse', type: 'Concourse', x: 250, y: 650, color: '#8338EC' },
  ];

  useEffect(() => {
    const fetchData = async () => {
      const { data: eventData } = await supabase.from('events').select('*').limit(1);
      if (eventData) setEvents(eventData);

      const { data: staffData } = await supabase.from('staff').select('*').eq('status', 'active');
      if (staffData) setVolunteers(staffData);

      // Native Supabase Real-time Sync for stats
      const { data: lostItemsData } = await supabase.from('lost_items').select('*');
      if (lostItemsData) {
        setLostStats({
          lost: lostItemsData.filter(i => i.status === 'lost').length,
          found: lostItemsData.filter(i => i.status === 'found' || i.status === 'resolved').length
        });
      }

      const { data: zonesData } = await supabase.from('zones').select('*');
      if (zonesData) {
        // Calculate Row 1 Gauges
        const totalCap = zonesData.reduce((acc, z) => acc + (z.Zone_Capacity || 100), 0);
        const totalOcc = zonesData.reduce((acc, z) => acc + (z.People_Count || 0), 0);
        setOverallOcc({ count: totalOcc, cap: Math.max(1, totalCap) });

        setZoneAOcc({ count: totalOcc * 0.4, cap: totalCap * 0.4 });
        setZoneBOcc({ count: totalOcc * 0.2, cap: totalCap * 0.3 });

        // Map to explicitly spaced out Virtual Stadium Hotspots
        const newNodes = HOTSPOT_CONFIG.map((hs, index) => {
          // Assign an artificial slice of the 150 backend zones to this hotspot to aggregate real DB count variations
          const sliceSize = Math.floor(zonesData.length / HOTSPOT_CONFIG.length);
          const chunk = zonesData.slice(index * sliceSize, (index + 1) * sliceSize);

          let totalPeople = chunk.reduce((sum, z) => sum + (z.People_Count || 0), 0);
          let totalCap = chunk.reduce((sum, z) => sum + (z.Zone_Capacity || 100), 0) || 1;

          // Apply Predictive Scaling based on Event Phase natively (Override dummy data if phase dictates congestion)
          if (eventPhase === 'Pre-Match' && hs.type === 'Gate') totalPeople = totalCap * 0.95;
          if (eventPhase === 'Post-Match' && hs.type === 'Gate') totalPeople = totalCap * 0.96;
          if (eventPhase === 'Innings Break' && (hs.type === 'Washroom' || hs.type === 'Food')) totalPeople = totalCap * 0.98;

          const occupancyRatio = totalPeople / totalCap;
          const isDanger = occupancyRatio > 0.9;

          if (isDanger && !notifiedHotspots.has(hs.id)) {
            fetch('https://stadiasync.onrender.com/api/notifications', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ sender: 'System Autobot', content: `CRITICAL CONGESTION: ${hs.id} breached 90% capacity. Proceed with crowd control protocols.` })
            });
            setNotifiedHotspots(prev => new Set(prev).add(hs.id));
          } else if (!isDanger && notifiedHotspots.has(hs.id)) {
            setNotifiedHotspots(prev => {
              const next = new Set(prev);
              next.delete(hs.id);
              return next;
            });
          }

          // Map real DB operative locations physically to their currently assigned Hotspots
          const staffList = (staffData || []).filter(s => s.current_zone === hs.id);

          return {
            ...hs,
            isDanger,
            occupancyRatio,
            staffList,
            size: Math.max(15, Math.min(35, occupancyRatio * 30)),
          };
        });

        setGraphData({ nodes: newNodes });
      }
    };

    fetchData();
    const interval = setInterval(fetchData, 10000); // Polling as secondary backup

    // Native Supabase Realtime listener to update stats immediately
    const lostChannel = supabase.channel('admin_lost_sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'lost_items' },
        async () => {
          // Re-fetch counts when data changes
          const { data } = await supabase.from('lost_items').select('status');
          if (data) {
            setLostStats({
              lost: data.filter(i => i.status === 'lost').length,
              found: data.filter(i => i.status === 'found' || i.status === 'resolved').length
            });
          }
        }
      )
      .subscribe();

    return () => {
      clearInterval(interval);
      supabase.removeChannel(lostChannel);
    };
  }, [eventPhase]);

  const handleReassign = async () => {
    if (!targetStaff || !targetZone) return;
    await supabase.from('staff').update({ current_zone: targetZone }).eq('id', targetStaff);
    setTargetStaff(''); setTargetZone('');
  };

  const RenderGauge = ({ title, count, cap }) => {
    const ratio = count / cap;
    const data = [
      { name: 'Occ', value: count, fill: ratio > 0.9 ? '#ff4d4d' : '#1A73E8' },
      { name: 'Emp', value: Math.max(0, cap - count), fill: 'rgba(255,255,255,0.05)' }
    ];
    return (
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.6)', textTransform: 'uppercase', marginBottom: '0.5rem' }}>{title}</span>
        <div style={{ width: '100%', height: '100px', position: 'relative' }}>
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie data={data} innerRadius={35} outerRadius={45} startAngle={180} endAngle={0} dataKey="value" stroke="none">
                {data.map((e, i) => <Cell key={i} fill={e.fill} />)}
              </Pie>
            </PieChart>
          </ResponsiveContainer>
          <div style={{ position: 'absolute', bottom: '0px', width: '100%', textAlign: 'center' }}>
            <span style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>{Math.round(ratio * 100)}%</span>
          </div>
        </div>
      </div>
    );
  };

  const flowBarData = [
    { hour: '16:00', In: 4500, Out: 200 },
    { hour: '17:00', In: 12000, Out: 400 },
    { hour: '18:00', In: 28000, Out: 1800 },
    { hour: '19:00', In: 15400, Out: 5200 },
    { hour: '20:00', In: 2000, Out: 18000 },
    { hour: '21:00', In: 500, Out: 32000 },
  ];

  return (
    <div style={{ backgroundColor: '#0A1224', minHeight: '100vh', padding: '1.5rem', color: '#fff', fontFamily: "'Inter', sans-serif" }}>

      {/* HEADER */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', padding: '0 0.5rem' }}>
        <div>
          <h1 style={{ margin: 0, fontSize: '1.4rem', color: '#1A73E8', letterSpacing: '1px' }}>VIRTUAL VENUE CORE</h1>
          <p style={{ margin: 0, color: 'rgba(255,255,255,0.5)', fontSize: '0.85rem' }}>Active Administration Port</p>
        </div>
        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center' }}>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select
              value={eventPhase}
              onChange={(e) => setEventPhase(e.target.value)}
              style={{ padding: '0.5rem', borderRadius: '4px', background: '#111A33', color: '#fff', border: '1px solid rgba(255,255,255,0.1)' }}
            >
              <option value="Pre-Match">Pre-Match</option>
              <option value="Innings Break">Innings Break Surge</option>
              <option value="Post-Match">Egress Sequence</option>
            </select>
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
          <div style={{ textAlign: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Attendance</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{overallOcc.count.toLocaleString()}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Active Force</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#1A73E8' }}>{volunteers.length}</div>
          </div>
          <div style={{ textAlign: 'center', borderLeft: '1px solid rgba(255,255,255,0.2)', paddingLeft: '2rem' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Assets Missing</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#FFBE0B' }}>{lostStats.lost}</div>
          </div>
          <div style={{ textAlign: 'center' }}>
            <span style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.75rem', textTransform: 'uppercase' }}>Assets Secured</span>
            <div style={{ fontSize: '1.2rem', fontWeight: 'bold', color: '#00FF00' }}>{lostStats.found}</div>
          </div>
        </div>
      </div>

      {/* ROW 1 */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(250px, 1fr) minmax(280px, 1fr) minmax(320px, 1.25fr)', gap: '1.5rem', marginBottom: '1.5rem' }}>
        <div style={styles.glassCard}>
          <h3 style={styles.header}>Sector Occupancies</h3>
          <div style={{ display: 'flex', justifyContent: 'space-between', flex: 1, alignItems: 'center' }}>
            <RenderGauge title="Overall" count={overallOcc.count} cap={overallOcc.cap} />
            <RenderGauge title="Fan Zone A" count={zoneAOcc.count} cap={zoneAOcc.cap} />
            <RenderGauge title="Fan Zone B" count={zoneBOcc.count} cap={zoneBOcc.cap} />
          </div>
        </div>

        <div style={styles.glassCard}>
          <h3 style={styles.header}>Ingress / Egress Velocity</h3>
          <div style={{ flex: 1, minHeight: '160px', position: 'relative' }}>
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={flowBarData} margin={{ top: 10, right: 0, left: -20, bottom: 0 }}>
                <XAxis dataKey="hour" stroke="rgba(255,255,255,0.5)" fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke="rgba(255,255,255,0.5)" fontSize={11} tickLine={false} axisLine={false} />
                <Tooltip cursor={{ fill: 'rgba(255,255,255,0.05)' }} contentStyle={{ background: '#0A1224', border: '1px solid rgba(255,255,255,0.1)' }} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: '0.8rem' }} />
                <Bar dataKey="In" stackId="a" fill="#1A73E8" radius={[0, 0, 0, 0]} />
                <Bar dataKey="Out" stackId="a" fill="#ff4d4d" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div style={styles.glassCard}>
          <div style={{ display: 'flex', gap: '1rem', width: '100%', marginBottom: '1rem' }}>
            <select
              value={targetStaff}
              onChange={(e) => setTargetStaff(e.target.value)}
              style={{ flex: 1, padding: '0.6rem', background: '#0A1224', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
            >
              <option value="">Select Asset...</option>
              {volunteers.map(v => <option key={v.id} value={v.id}>{v.name}</option>)}
            </select>
            <select
              value={targetZone}
              onChange={(e) => setTargetZone(e.target.value)}
              style={{ flex: 1, padding: '0.6rem', boxSizing: 'border-box', background: '#0A1224', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', borderRadius: '4px' }}
            >
              <option value="">Select Target...</option>
              {HOTSPOT_CONFIG.map(hs => <option key={`td-${hs.id}`} value={hs.id}>{hs.id}</option>)}
            </select>
            <button
              onClick={handleReassign}
              style={{ padding: '0.6rem 1rem', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
            >
              Send
            </button>
          </div>

          <h3 style={{ ...styles.header, marginBottom: '0.5rem', fontSize: '0.8rem' }}>Active Roster</h3>
          <div style={{ overflowY: 'auto', flex: 1 }}>
            <table style={{ width: '100%', textAlign: 'left', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
              <thead>
                <tr style={{ color: 'rgba(255,255,255,0.5)', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                  <th style={{ paddingBottom: '0.4rem' }}>Operative</th>
                  <th style={{ paddingBottom: '0.4rem' }}>Role</th>
                  <th style={{ paddingBottom: '0.4rem' }}>Assignment</th>
                </tr>
              </thead>
              <tbody>
                {volunteers.slice(0, 5).map(v => (
                  <tr key={v.id} style={{ borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                    <td style={{ padding: '0.5rem 0', fontWeight: 'bold', color: '#1A73E8' }}>{v.name}</td>
                    <td>{v.role}</td>
                    <td>{v.current_zone}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* ROW 2 - SVG MAP */}
      <div style={{ ...styles.glassCard, height: '65vh', padding: 0, position: 'relative', overflow: 'hidden' }}>

        <div style={{ position: 'absolute', top: '1.25rem', left: '1.25rem', zIndex: 10, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <h3 style={styles.header}>Spatial Thermal Analytics</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.5rem', fontSize: '0.75rem', padding: '1rem', background: 'rgba(5, 10, 20, 0.8)', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.1)', backdropFilter: 'blur(5px)' }}>
              <strong style={{ marginBottom: '0.2rem', color: '#fff' }}>HOTSPOT LEGEND</strong>
              <span style={{ color: '#3A86FF', fontWeight: 'bold' }}>● Gates (Outer Sector)</span>
              <span style={{ color: '#FFBE0B', fontWeight: 'bold' }}>● Washrooms (Inner East/West)</span>
              <span style={{ color: '#FB5607', fontWeight: 'bold' }}>● Food Stalls & Concessions</span>
              <span style={{ color: '#8338EC', fontWeight: 'bold' }}>● General Concourses</span>
              <span style={{ color: '#ff4d4d', fontWeight: 'bold', marginTop: '0.5rem', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '0.5rem' }}>● Critical Congestion (&gt;90%)</span>
              <span style={{ color: '#00FF00', fontWeight: 'bold' }}>◆ Operative Asset Indicator</span>
            </div>
          </div>
        </div>

        {/* Zoom Controls */}
        <div style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', zIndex: 10, display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setZoomLevel(z => Math.max(50, z - 20))}
            style={{ padding: '0.5rem 1rem', background: '#111A33', color: '#fff', border: '1px solid rgba(255,255,255,0.2)', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >-</button>
          <div style={{ display: 'flex', alignItems: 'center', background: '#0A1224', padding: '0 1rem', borderRadius: '4px', fontSize: '0.85rem', fontWeight: 'bold' }}>{zoomLevel}%</div>
          <button
            onClick={() => setZoomLevel(z => Math.min(300, z + 20))}
            style={{ padding: '0.5rem 1rem', background: '#1A73E8', color: '#fff', border: 'none', borderRadius: '4px', cursor: 'pointer', fontWeight: 'bold' }}
          >+</button>
        </div>

        <div style={{ width: '100%', height: '100%', overflow: 'auto', position: 'relative' }}>
          <div style={{ width: `${zoomLevel}%`, height: `${zoomLevel}%`, minWidth: '1000px', display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
            <svg viewBox="0 0 1200 800" style={{ width: '100%', height: '100%' }}>
              <defs>
                <radialGradient id="hotspot-critical">
                  <stop offset="0%" stopColor="rgba(255, 77, 77, 0.9)" />
                  <stop offset="40%" stopColor="rgba(255, 77, 77, 0.4)" />
                  <stop offset="100%" stopColor="rgba(255, 77, 77, 0)" />
                </radialGradient>
              </defs>

              {/* Stadium Layout Base */}
              <ellipse cx="600" cy="400" rx="280" ry="160" fill="#1b301c" stroke="#2E7D32" strokeWidth="4" />
              <circle cx="600" cy="400" r="40" fill="transparent" stroke="#2E7D32" strokeWidth="3" opacity="0.6" />
              <ellipse cx="600" cy="400" rx="10" ry="35" fill="#e0e0e0" opacity="0.3" />

              <ellipse cx="600" cy="400" rx="360" ry="220" fill="transparent" stroke="rgba(255,255,255,0.1)" strokeWidth="3" />
              <ellipse cx="600" cy="400" rx="460" ry="300" fill="transparent" stroke="rgba(255,255,255,0.05)" strokeWidth="4" strokeDasharray="12 6" />

              {/* Render Mapped Dummy Hotspots */}
              {graphData.nodes.map((node) => {
                return (
                  <g key={node.id} style={{ transition: 'all 0.5s ease' }}>

                    {/* Outer Thermal Pulse Glow for Congested Areas ONLY */}
                    {node.isDanger && (
                      <circle cx={node.x} cy={node.y} r={node.size * 3.5} fill="url(#hotspot-critical)" opacity="0.8">
                        <animate attributeName="r" values={`${node.size * 3};${node.size * 4};${node.size * 3}`} dur="2s" repeatCount="indefinite" />
                        <animate attributeName="opacity" values="0.6;0.9;0.6" dur="2s" repeatCount="indefinite" />
                      </circle>
                    )}

                    {/* Core Base Node colored by Component Type */}
                    <circle
                      cx={node.x}
                      cy={node.y}
                      r={node.size}
                      fill={node.color}
                      stroke="rgba(255,255,255,0.2)"
                      strokeWidth="2"
                    />

                    {/* Embedded Hotspot Text Overlay */}
                    <g>
                      {/* Background bounding box for distinct legibility */}
                      <rect x={node.x - 70} y={node.y - node.size - 32} width="140" height="20" fill="rgba(10, 18, 36, 0.8)" rx="4" />
                      <text x={node.x} y={node.y - node.size - 18} fill="rgba(255,255,255,0.95)" fontSize="12" textAnchor="middle" fontWeight="bold">
                        {node.id}
                      </text>

                      <rect x={node.x - 24} y={node.y + node.size + 8} width="48" height="18" fill={node.isDanger ? '#ff4d4d' : 'rgba(255,255,255,0.15)'} rx="4" />
                      <text x={node.x} y={node.y + node.size + 20} fill={node.isDanger ? '#fff' : '#ddd'} fontSize="11" textAnchor="middle" fontWeight="bold">
                        {Math.round(node.occupancyRatio * 100)}%
                      </text>
                    </g>

                    {/* Dynamic Force Overlay (Green Diamonds mapped locally to Hotspot) */}
                    {node.staffList.length > 0 && node.staffList.map((staff, sIdx) => {
                      const offsetRadius = node.size + 28; // Increased spacing to prevent font overlap
                      const angle = (sIdx / node.staffList.length) * 2 * Math.PI;
                      const sx = node.x + Math.cos(angle) * offsetRadius;
                      const sy = node.y + Math.sin(angle) * offsetRadius;

                      return (
                        <g key={staff.id}>
                          {/* Diamond Drawing logic via SVG Polygon */}
                          <polygon
                            points={`${sx},${sy - 8} ${sx + 8},${sy} ${sx},${sy + 8} ${sx - 8},${sy}`}
                            fill="#00FF00"
                            stroke="#111"
                            strokeWidth="2"
                          />
                          <text x={sx} y={sy + 18} fill="#00FF00" fontSize="11" textAnchor="middle" fontWeight="bold">
                            {staff.name.replace(/\D/g, '')}
                          </text>
                          {/* Dashed connector line for clarity */}
                          <line x1={node.x} y1={node.y} x2={sx} y2={sy} stroke="#00FF00" strokeWidth="1" strokeDasharray="2 2" opacity="0.3" />
                        </g>
                      );
                    })}
                  </g>
                );
              })}
            </svg>
          </div>
        </div>
      </div>

    </div>
  );
}