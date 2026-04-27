import { useEffect, useRef, useState, FormEvent } from 'react';
import { motion } from 'motion/react';

function DroneCamera({ droneId, fleet }: { droneId: string | null, fleet: any[] }) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [error, setError] = useState<string | null>(null);
  const drone = fleet.find(d => d.id === droneId);

  useEffect(() => {
    if (!droneId || drone?.status === 'OFFLINE') {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
      return;
    }

    async function startCamera() {
      try {
        const s = await navigator.mediaDevices.getUserMedia({ video: true });
        setStream(s);
        if (videoRef.current) {
          videoRef.current.srcObject = s;
        }
        setError(null);
      } catch (err) {
        console.error("Camera access error:", err);
        setError("CAMERA FEED OFFLINE: PERMISSION DENIED OR NO HARDWARE FOUND");
      }
    }

    startCamera();

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [droneId, drone?.status]);

  if (!droneId) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black/60 border border-[var(--bdr)] text-[var(--txd)] opacity-50">
        <div className="text-2xl mb-2">📷</div>
        <div className="text-[10px] uppercase tracking-widest">NO DRONE SELECTED</div>
      </div>
    );
  }

  if (drone?.status === 'OFFLINE') {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black/60 border border-[var(--rd)] text-[var(--rd)]">
        <div className="text-2xl mb-2">⚠</div>
        <div className="text-[10px] uppercase tracking-widest">DRONE OFFLINE</div>
        <div className="text-[8px] mt-1 opacity-70">ID: {droneId}</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full bg-black/60 border border-[var(--rd)] text-[var(--rd)]">
        <div className="text-2xl mb-2">⚠</div>
        <div className="text-[10px] uppercase tracking-widest text-center px-4">{error}</div>
        <div className="text-[8px] mt-1 opacity-70">DRONE: {droneId}</div>
      </div>
    );
  }

  return (
    <div className="relative h-full w-full bg-black border border-[var(--g)] overflow-hidden">
      <video 
        ref={videoRef} 
        autoPlay 
        playsInline 
        muted 
        className="h-full w-full object-cover opacity-80 grayscale contrast-125"
      />
      <div className="absolute top-2 left-2 flex flex-col gap-1">
        <div className="bg-black/60 px-2 py-1 text-[8px] text-[var(--g)] border border-[var(--g)]/30">
          LIVE FEED: {droneId}
        </div>
        <div className="bg-black/60 px-2 py-1 text-[8px] text-[var(--g)] border border-[var(--g)]/30 animate-pulse">
          REC ●
        </div>
      </div>
      <div className="absolute bottom-2 right-2 flex flex-col gap-1 text-right">
        <div className="bg-black/60 px-2 py-1 text-[8px] text-[var(--g)] border border-[var(--g)]/30">
          LAT: {drone?.lat.toFixed(4)}
        </div>
        <div className="bg-black/60 px-2 py-1 text-[8px] text-[var(--g)] border border-[var(--g)]/30">
          LON: {drone?.lon.toFixed(4)}
        </div>
      </div>
      {/* Overlay lines */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/2 left-0 w-full h-[1px] bg-[var(--g)]/20"></div>
        <div className="absolute top-0 left-1/2 w-[1px] h-full bg-[var(--g)]/20"></div>
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-16 h-16 border border-[var(--g)]/40 rounded-full"></div>
      </div>
    </div>
  );
}

function TelemetryPage() {
  const [logs, setLogs] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchLogs = async () => {
    try {
      const res = await fetch('/api/telemetry');
      const data = await res.json();
      setLogs(data.slice(0, 50)); // Show last 50
      setLoading(false);
    } catch (error) {
      console.error("Failed to fetch logs:", error);
    }
  };

  useEffect(() => {
    fetchLogs();
    const interval = setInterval(fetchLogs, 5000);
    return () => clearInterval(interval);
  }, []);

  const purgeLogs = async () => {
    if (!confirm('Are you sure you want to purge all telemetry logs? This action cannot be undone.')) return;
    try {
      await fetch('/api/telemetry', { method: 'DELETE' });
      setLogs([]);
      window.sysLog?.('Telemetry logs purged.', 'w');
    } catch (error) {
      console.error("Failed to purge logs:", error);
    }
  };

  return (
    <div id="pg-telemetry" className="pg active">
      <div className="ph">
        <div><div className="pt">DRONE TELEMETRY LOGS</div><div className="psub">HISTORICAL SENSOR DATA & FLIGHT RECORDS</div></div>
        <div className="flex gap-2">
          <button className="btn bg" onClick={() => window.open('/api/telemetry/export?format=csv', '_blank')}>↓ EXPORT CSV</button>
          <button className="btn br" onClick={purgeLogs}>⚠ PURGE LOGS</button>
        </div>
      </div>
      
      <div className="pn">
        <div className="pnh"><span className="pnt">◎ Recent Telemetry Events</span></div>
        <div className="pnb p-0 overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center animate-pulse text-[var(--txd)]">INITIALIZING DATA STREAM...</div>
          ) : (
            <table className="dt w-full">
              <thead>
                <tr>
                  <th>TIMESTAMP</th>
                  <th>DRONE ID</th>
                  <th>STATUS</th>
                  <th>BATT</th>
                  <th>SIGNAL</th>
                  <th>ALTITUDE</th>
                  <th>SPEED</th>
                  <th>LOCATION</th>
                </tr>
              </thead>
              <tbody>
                {logs.length === 0 ? (
                  <tr><td colSpan={8} className="text-center py-8 opacity-50 italic">NO TELEMETRY DATA RECORDED</td></tr>
                ) : (
                  logs.map(log => (
                    <tr key={log.id}>
                      <td className="font-mono text-[var(--txd)]">{new Date(log.timestamp).toLocaleTimeString()}</td>
                      <td className="font-bold text-[var(--g)]">{log.drone_id}</td>
                      <td><span className={`bd ${log.status === 'ACTIVE' ? 'g' : log.status === 'STBY' ? 'b' : log.status === 'RTB' ? 'a' : 'r'}`}>{log.status}</span></td>
                      <td className="font-mono">{log.batt}%</td>
                      <td className="font-mono">{log.signal}%</td>
                      <td className="font-mono">{log.alt}</td>
                      <td className="font-mono">{log.spd}</td>
                      <td className="font-mono text-[9px]">{log.lat.toFixed(4)}, {log.lon.toFixed(4)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}

declare global {
  interface Window {
    L: any;
    Chart: any;
    tf: any;
    [key: string]: any;
  }
}

export default function App() {
    const [activePage, setActivePage] = useState('dashboard');
    const [time, setTime] = useState(new Date());
    const mainRef = useRef<HTMLDivElement>(null);
    const [selectedEntity, setSelectedEntity] = useState<any>(null);
    const [command, setCommand] = useState('');
    const [selectedDrone, setSelectedDrone] = useState<string | null>(null);
    const [droneMissions, setDroneMissions] = useState<Record<string, { waypoints: any[], roe: string, targetId: string | null }>>({
      'DRN-01': { waypoints: [], roe: 'PASSIVE', targetId: null },
      'DRN-02': { waypoints: [], roe: 'PASSIVE', targetId: null },
      'DRN-03': { waypoints: [], roe: 'PASSIVE', targetId: null },
      'DRN-04': { waypoints: [], roe: 'PASSIVE', targetId: null },
    });
    const [fleet, setFleet] = useState([
      { id: 'DRN-01', type: 'REAPER-X', status: 'ACTIVE', batt: 82, signal: 94, lat: 6.15, lon: 102.28, alt: '1200m', spd: '45km/h', mission: 'PATROL-A' },
      { id: 'DRN-02', type: 'GHOST-V2', status: 'STBY', batt: 100, signal: 100, lat: 6.12, lon: 102.25, alt: '0m', spd: '0km/h', mission: 'IDLE' },
      { id: 'DRN-03', type: 'WASP-S', status: 'RTB', batt: 12, signal: 68, lat: 6.11, lon: 102.24, alt: '450m', spd: '60km/h', mission: 'RECOVERY' },
      { id: 'DRN-04', type: 'REAPER-X', status: 'OFFLINE', batt: 0, signal: 0, lat: 6.1254, lon: 102.2580, alt: '0m', spd: '0km/h', mission: 'MAINTENANCE' },
    ]);

    useEffect(() => {
      const logTelemetry = async () => {
        try {
          for (const drone of fleet) {
            if (drone.status !== 'OFFLINE') {
              await fetch('/api/telemetry', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  drone_id: drone.id,
                  type: drone.type,
                  status: drone.status,
                  batt: drone.batt,
                  signal: drone.signal,
                  lat: drone.lat,
                  lon: drone.lon,
                  alt: drone.alt,
                  spd: drone.spd,
                  mission: drone.mission
                })
              });
            }
          }
        } catch (error) {
          console.error("Telemetry logging failed:", error);
        }
      };

      const interval = setInterval(logTelemetry, 10000); // Log every 10 seconds
      return () => clearInterval(interval);
    }, [fleet]);

    const updateWaypoint = (droneId: string, index: number, field: 'lat' | 'lon', value: string) => {
      const numValue = parseFloat(value);
      if (isNaN(numValue)) return;
      
      setDroneMissions(prev => {
        const newWaypoints = [...prev[droneId].waypoints];
        newWaypoints[index] = { ...newWaypoints[index], [field]: numValue };
        return {
          ...prev,
          [droneId]: { ...prev[droneId], waypoints: newWaypoints }
        };
      });
    };

    useEffect(() => {
      const simulateDrones = () => {
        setFleet(prevFleet => prevFleet.map(drone => {
          if (drone.status === 'OFFLINE') return drone;

          // Simulate battery drain
          let newBatt = drone.batt;
          if (drone.status === 'ACTIVE' || drone.status === 'RTB') {
            newBatt = Math.max(0, drone.batt - 0.05);
          } else if (drone.status === 'STBY') {
            newBatt = Math.min(100, drone.batt + 0.1); // Charging
          }

          let newStatus = drone.status;
          if (newBatt <= 0 && drone.status !== 'OFFLINE') {
            newStatus = 'OFFLINE';
          }

          // Simulate movement if active
          let newLat = drone.lat;
          let newLon = drone.lon;
          let newSpd = drone.spd;
          let newAlt = drone.alt;

          if (newStatus === 'ACTIVE' || newStatus === 'RTB') {
            newLat += (Math.random() - 0.5) * 0.0005;
            newLon += (Math.random() - 0.5) * 0.0005;
            
            const currentSpd = parseInt(drone.spd) || 0;
            const currentAlt = parseInt(drone.alt) || 0;
            
            const nextSpd = Math.max(10, currentSpd + Math.floor((Math.random() - 0.5) * 5));
            const nextAlt = Math.max(100, currentAlt + Math.floor((Math.random() - 0.5) * 20));
            
            newSpd = `${nextSpd}km/h`;
            newAlt = `${nextAlt}m`;
          } else if (newStatus === 'STBY' || newStatus === 'OFFLINE') {
            newSpd = '0km/h';
            newAlt = '0m';
          }

          // Random signal fluctuations
          let newSignal = Math.min(100, Math.max(0, drone.signal + (Math.random() - 0.5) * 3));

          return {
            ...drone,
            status: newStatus,
            batt: Math.round(newBatt * 100) / 100,
            lat: newLat,
            lon: newLon,
            signal: Math.round(newSignal),
            spd: newSpd,
            alt: newAlt
          };
        }));
      };

      const interval = setInterval(simulateDrones, 3000);
      return () => clearInterval(interval);
    }, []);

    const handleCommand = (e: FormEvent) => {
      e.preventDefault();
      if (!command.trim()) return;
      
      const cmdText = command.trim();
      const args = cmdText.toLowerCase().split(' ');
      const baseCmd = args[0];

      window.sysLog?.(`> ${cmdText}`, 'i');

      switch (baseCmd) {
        case 'help':
          window.sysLog?.('COMMANDS: scan, radar [active|passive], clear, alert [msg], diag, stop, goto [page]', 'i');
          break;
        case 'scan':
          window.scanNow?.();
          break;
        case 'radar':
          if (args[1] === 'active' || args[1] === 'passive' || args[1] === 'tws') {
            window.setRadarMode?.(args[1]);
          } else {
            window.sysLog?.('Usage: radar [active|passive|tws]', 'w');
          }
          break;
        case 'clear':
          ['syslog', 'dlg', 'englog'].forEach(id => {
            const el = document.getElementById(id);
            if (el) el.innerHTML = '';
          });
          break;
        case 'alert':
          window.alert2?.(cmdText.substring(6) || 'System Alert', 'b');
          break;
        case 'diag':
          window.runDiag?.();
          break;
        case 'stop':
          window.emergStop?.();
          break;
        case 'goto':
          if (args[1]) {
            setActivePage(args[1]);
            window.sysLog?.(`Navigating to ${args[1]}`, 'ok');
          }
          break;
        default:
          window.sysLog?.(`Unknown command: ${baseCmd}`, 'e');
      }
      
      setCommand('');
    };

  useEffect(() => {
    const timer = setInterval(() => setTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    // Initialize global variables and functions from the original script
    const HQ_LAT = 6.1254, HQ_LON = 102.2580;
    window.HQ_LAT = HQ_LAT;
    window.HQ_LON = HQ_LON;

    const SYS = {
      radar: { online: true, mode: 'active', freq: 3000, sensitivity: 85, range: 450, sweepAngle: 0, paused: false },
      modules: { irondome_a: true, irondome_b: true, arrowsling: true, davids: false, ew: true, autoint: false, thermal: true },
      missiles: { tamir: 4, arrow: 2, pac3: 0 },
      missileMax: { tamir: 4, arrow: 2, pac3: 4 },
      reload: {
        tamir: { active: false, progress: 0, perMissile: 18 },
        arrow: { active: false, progress: 0, perMissile: 45 },
        pac3: { active: false, progress: 0, perMissile: 30 },
      },
      selMissile: 'tamir',
      selTarget: null,
      engagements: []
    };
    window.SYS = SYS;

    let DEV = [
      { id: 'KB-001', type: 'WiFi 2.4GHz', strength: -72, lat: 6.1350, lon: 102.2680, bearing: 47, range: 8, speed: 0, status: 'FRIENDLY' },
      { id: 'KB-002', type: 'LoRa 915MHz', strength: -85, lat: 6.1050, lon: 102.2480, bearing: 190, range: 22, speed: 0, status: 'FRIENDLY' },
      { id: 'KB-003', type: 'ADS-B 1090', strength: -62, lat: 6.1653, lon: 102.2929, bearing: 340, range: 5, speed: 280, status: 'FRIENDLY' },
      { id: 'UNK-K1', type: 'UHF 433MHz', strength: -68, lat: 6.4450, lon: 102.0160, bearing: 340, range: 45, speed: 120, status: 'UNKNOWN' },
      { id: 'UNK-K2', type: 'VHF 144MHz', strength: -74, lat: 5.9749, lon: 102.1344, bearing: 192, range: 18, speed: 0, status: 'UNKNOWN' },
      { id: 'KB-006', type: 'WiFi 5GHz', strength: -69, lat: 6.1274, lon: 102.2382, bearing: 280, range: 4, speed: 0, status: 'FRIENDLY' },
      { id: 'KB-007', type: 'LoRa 868MHz', strength: -81, lat: 6.0685, lon: 102.1565, bearing: 220, range: 11, speed: 0, status: 'FRIENDLY' },
      { id: 'KB-008', type: 'Cellular LTE', strength: -60, lat: 6.2584, lon: 102.1708, bearing: 325, range: 16, speed: 65, status: 'FRIENDLY' },
      { id: 'THR-001', type: 'UHF Burst', strength: -55, lat: 6.5500, lon: 102.1000, bearing: 355, range: 65, speed: 850, status: 'HOSTILE' },
      { id: 'THR-002', type: 'VHF 150MHz', strength: -58, lat: 5.5297, lon: 102.2249, bearing: 175, range: 72, speed: 420, status: 'HOSTILE' },
    ];
    window.DEV = DEV;

    // Helper functions
    const p2 = (v: number) => String(v).padStart(2, '0');
    window.p2 = p2;
    const nowStr = () => {
      const n = new Date();
      return `${p2(n.getHours())}:${p2(n.getMinutes())}:${p2(n.getSeconds())}`;
    };
    window.nowStr = nowStr;

    const alert2 = (msg: string, type = '') => {
      const el = document.createElement('div');
      el.className = 'alf ' + type;
      el.textContent = msg;
      document.body.appendChild(el);
      setTimeout(() => el.remove(), 4000);
    };
    window.alert2 = alert2;

    const sysLog = (msg: string, type = 'i') => {
      const t = nowStr();
      const line = `<div class="ll"><span class="lt">${t}</span><span class="lm ${type}">${msg}</span></div>`;
      ['syslog', 'dlg', 'englog'].forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        if (id === 'englog' && type !== 'e' && type !== 'w' && !msg.includes('LAUNCH') && !msg.includes('TARGET') && !msg.includes('RESULT')) return;
        el.innerHTML += line;
        el.scrollTop = el.scrollHeight;
      });
    };
    window.sysLog = sysLog;

    // Radar Logic
    let rSweep = 0;
    window.rblips = [];

    const initBlips = () => {
      window.rblips = window.DEV.map((d: any) => {
        const rr = Math.min(0.48, d.range / window.SYS.radar.range * 0.48);
        const a = (d.bearing - 90) * Math.PI / 180;
        const bx = 0.5 + rr * Math.cos(a), by = 0.5 + rr * Math.sin(a);
        return {
          id: d.id, st: d.status,
          x: bx, y: by, bx, by,
          vis: false, alpha: 0,
          ba: (d.bearing - 90) * Math.PI / 180,
          dx: (Math.random() - .5) * .001 * (d.speed > 0 ? 1 : 0),
          dy: (Math.random() - .5) * .001 * (d.speed > 0 ? 1 : 0)
        };
      });
    };
    window.initBlips = initBlips;

    const drawRadar = () => {
      const rc = document.getElementById('rc') as HTMLCanvasElement;
      if (!rc) return;
      const rctx = rc.getContext('2d');
      if (!rctx) return;
      const W = 300, H = 300, cx = W / 2, cy = H / 2, R = W / 2 - 2;
      rctx.clearRect(0, 0, W, H);
      rctx.beginPath(); rctx.arc(cx, cy, R, 0, Math.PI * 2);
      rctx.fillStyle = '#010a04'; rctx.fill();

      // Rings
      [.2, .4, .6, .8, 1].forEach(f => {
        rctx.beginPath(); rctx.arc(cx, cy, R * f, 0, Math.PI * 2);
        rctx.strokeStyle = `rgba(0,255,65,${.05 + f * .025})`; rctx.lineWidth = 1; rctx.stroke();
        if (f < 1) {
          rctx.fillStyle = 'rgba(0,255,65,.25)'; rctx.font = '8px Share Tech Mono';
          rctx.fillText(Math.round(window.SYS.radar.range * f) + 'km', cx + R * f + 2, cy - 2);
        }
      });

      // Crosshairs
      rctx.strokeStyle = 'rgba(0,255,65,.06)'; rctx.lineWidth = 1;
      [[cx, 0, cx, H], [0, cy, W, cy], [cx - Math.cos(.785) * R, cy - Math.sin(.785) * R, cx + Math.cos(.785) * R, cy + Math.sin(.785) * R],
      [cx - Math.cos(2.356) * R, cy - Math.sin(2.356) * R, cx + Math.cos(2.356) * R, cy + Math.sin(2.356) * R]].forEach(([x1, y1, x2, y2]) => {
        rctx.beginPath(); rctx.moveTo(x1, y1); rctx.lineTo(x2, y2); rctx.stroke();
      });

      // Sweep
      if (!window.SYS.radar.paused) { rSweep += 0.022; if (rSweep > Math.PI * 2) rSweep -= Math.PI * 2; }
      for (let i = 0; i < 55; i++) {
        const a = rSweep - i * .015;
        const al = Math.max(0, (55 - i) / 55) * .2;
        rctx.beginPath(); rctx.moveTo(cx, cy); rctx.arc(cx, cy, R - 2, a, a + .016); rctx.lineTo(cx, cy);
        rctx.fillStyle = `rgba(0,255,65,${al})`; rctx.fill();
      }
      rctx.beginPath(); rctx.moveTo(cx, cy); rctx.lineTo(cx + Math.cos(rSweep) * (R - 2), cy + Math.sin(rSweep) * (R - 2));
      rctx.strokeStyle = 'rgba(0,255,65,.9)'; rctx.lineWidth = 1.5; rctx.stroke();

      // Blips
      window.rblips.forEach((b: any) => {
        let ba = Math.atan2(b.y - .5, b.x - .5);
        if (ba < 0) ba += Math.PI * 2;
        let sa = rSweep % (Math.PI * 2);
        let diff = sa - ba; if (diff < 0) diff += Math.PI * 2;
        if (diff < .08) { b.vis = true; b.alpha = 1; }
        if (b.vis) b.alpha = Math.max(0, b.alpha - 0.007);
        if (b.alpha <= 0) b.vis = false;
        if (b.st !== 'FRIENDLY') { b.x += b.dx; b.y += b.dy; if (b.x < .05 || b.x > .95) b.dx *= -1; if (b.y < .05 || b.y > .95) b.dy *= -1; }
        if (!b.vis || b.alpha <= 0) return;
        const px = b.x * W, py = b.y * H;
        const col = b.st === 'HOSTILE' ? `rgba(255,34,68,${b.alpha})` : b.st === 'UNKNOWN' ? `rgba(255,179,0,${b.alpha})` : `rgba(0,255,65,${b.alpha})`;
        const gr = rctx.createRadialGradient(px, py, 0, px, py, 8);
        gr.addColorStop(0, col); gr.addColorStop(1, 'transparent');
        rctx.beginPath(); rctx.arc(px, py, 8, 0, Math.PI * 2); rctx.fillStyle = gr; rctx.fill();
        rctx.beginPath(); rctx.arc(px, py, 3, 0, Math.PI * 2); rctx.fillStyle = col; rctx.fill();
        if (b.st === 'HOSTILE') {
          rctx.fillStyle = `rgba(255,34,68,${b.alpha * .75})`; rctx.font = '9px Share Tech Mono';
          rctx.fillText(b.id, px + 5, py - 4);
        }
      });

      // Center
      rctx.shadowBlur = 12; rctx.shadowColor = '#00ff41';
      rctx.beginPath(); rctx.arc(cx, cy, 4, 0, Math.PI * 2); rctx.fillStyle = '#00ff41'; rctx.fill();
      rctx.shadowBlur = 0;

      rctx.fillStyle = 'rgba(0,255,65,.25)'; rctx.font = '8px Share Tech Mono';
      rctx.fillText('MODE:' + window.SYS.radar.mode.toUpperCase(), 6, H - 6);
      rctx.fillText('F:' + window.SYS.radar.freq + 'MHz', W - 70, H - 6);

      window.radarAnimId = requestAnimationFrame(drawRadar);
    };
    window.drawRadar = drawRadar;

    // Signal Chart Logic
    const BANDS = [
      { k: 'wifi', lbl: 'WiFi 2.4GHz', col: '#00ff41', d: Array.from({ length: 30 }, () => Math.random() * 40 + 40) },
      { k: 'lora', lbl: 'LoRa 915MHz', col: '#00d4ff', d: Array.from({ length: 30 }, () => Math.random() * 45 + 20) },
      { k: 'uhf', lbl: 'UHF 433MHz', col: '#ffb300', d: Array.from({ length: 30 }, () => Math.random() * 35 + 25) },
    ];

    let sigChart: any;
    const initSigChart = () => {
      const ctx = (document.getElementById('sigchart') as HTMLCanvasElement)?.getContext('2d');
      if (!ctx || !window.Chart) return;
      sigChart = new window.Chart(ctx, {
        type: 'line',
        data: {
          labels: Array(30).fill(''),
          datasets: BANDS.map(b => ({
            label: b.lbl,
            data: [...b.d],
            borderColor: b.col,
            backgroundColor: b.col + '09',
            tension: .4,
            borderWidth: 1.5,
            pointRadius: 0,
            fill: true
          }))
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          animation: false,
          plugins: { legend: { labels: { color: '#4d8a5c', font: { family: 'Share Tech Mono', size: 9 }, boxWidth: 10, padding: 8 } } },
          scales: { x: { grid: { color: 'rgba(0,255,65,.04)' }, ticks: { display: false } }, y: { grid: { color: 'rgba(0,255,65,.04)' }, ticks: { color: '#4d8a5c', font: { size: 9 } }, min: 0, max: 100 } }
        }
      });
    };

    const updSigChart = () => {
      if (!sigChart) return;
      BANDS.forEach((b, i) => {
        b.d.shift();
        const l = b.d[b.d.length - 1];
        b.d.push(Math.max(5, Math.min(95, l + (Math.random() - .5) * 16)));
        sigChart.data.datasets[i].data = [...b.d];
      });
      sigChart.update('none');
      updSigBars();
    };

    const updSigBars = () => {
      const el = document.getElementById('sigbars');
      if (!el) return;
      el.innerHTML = BANDS.map(b => {
        const lv = b.d[b.d.length - 1];
        const bars = Math.ceil(lv / 20);
        const bh = [4, 6, 9, 12, 15].map((h, i) => `<div class="sbar ${i < bars ? 'on' : ''}" style="height:${h}px"></div>`).join('');
        return `<div class="flex justify-between items-center mb-1 text-[10px]">
          <span style="color:var(--txd)">${b.lbl}</span>
          <div class="flex items-center gap-2"><span style="color:${b.col};font-size:9px">${lv.toFixed(0)}</span><div class="sb">${bh}</div></div>
        </div>`;
      }).join('');
    };

    // Device Table Logic
    const buildDevTable = () => {
      const tb = document.getElementById('dtbody');
      if (!tb) return;
      const sc: any = { FRIENDLY: 'g', HOSTILE: 'r', UNKNOWN: 'a' };
      tb.innerHTML = window.DEV.map((d: any) => {
        const cc = sc[d.status];
        const cval = cc === 'g' ? 'var(--g)' : cc === 'r' ? 'var(--rd)' : 'var(--am)';
        return `<tr>
          <td style="color:${cval}">${d.id}</td>
          <td>${d.type}</td>
          <td style="color:${d.strength > -70 ? 'var(--rd)' : d.strength > -85 ? 'var(--am)' : 'var(--g)'}">${d.strength} dBm</td>
          <td style="color:var(--txd)">${d.lat.toFixed(1)}°N ${d.lon.toFixed(1)}°E</td>
          <td>${d.bearing}°</td>
          <td>${d.range.toFixed(1)} km</td>
          <td style="color:${d.speed > 500 ? 'var(--rd)' : d.speed > 0 ? 'var(--am)' : 'var(--txd)'}">${d.speed > 0 ? d.speed + ' km/h' : '—'}</td>
          <td><span class="bd ${cc}">${d.status}</span></td>
          <td class="flex gap-1">
            <button class="btn bb py-1 px-2 text-[9px]" onclick="window.connectDev?.('${d.id}')">CONNECT</button>
          </td>
        </tr>`;
      }).join('');
    };
    window.buildDevTable = buildDevTable;

    window.runDiag = () => {
      sysLog('[DIAG] Running diagnostics...', 'i');
      alert2('Diagnostics complete', 'b');
    };

    window.emergStop = () => {
      if (!confirm('⚠ EMERGENCY STOP — Deactivate ALL systems?')) return;
      sysLog('[EMERGENCY] All systems deactivated by operator', 'e');
      alert2('EMERGENCY STOP ACTIVATED', 'r');
    };

    window.scanNow = () => {
      sysLog('[SCAN] Full spectrum scan...', 'i');
      alert2('Scanning...', 'b');
      setTimeout(() => {
        buildDevTable();
        sysLog('[SCAN] Scan complete', 'ok');
      }, 1000);
    };

    window.exportCSV = () => {
      alert2('Exporting CSV...', 'b');
    };

    window.setRadarMode = (v: string) => {
      window.SYS.radar.mode = v;
      window.SYS.radar.paused = (v === 'passive');
      const el = document.getElementById('scan-bd');
      if (el) el.textContent = v === 'passive' ? 'PASSIVE' : 'SCANNING';
      sysLog(`[CONFIG] Radar mode: ${v.toUpperCase()}`, 'i');
    };

    window.connectDev = (id: string) => {
      const d = window.DEV.find((x: any) => x.id === id);
      if (!d) return;
      sysLog(`[CONN] Initiating secure link to ${id}...`, 'i');
      alert2(`Connecting to ${id}...`, 'b');
      setTimeout(() => {
        sysLog(`[CONN] Secure channel established with ${id}`, 'ok');
        alert2(`Connected to ${id}`, 'g');
      }, 1500);
    };

    window.jamEntity = (id: string) => {
      sysLog(`[EW] Initiating active jamming on ${id}...`, 'e');
      alert2(`Jamming ${id}...`, 'r');
      setTimeout(() => {
        sysLog(`[EW] Signal suppressed for ${id}`, 'ok');
        alert2(`${id} Jammed`, 'g');
      }, 2000);
    };

    window.takeControl = (id: string) => {
      sysLog(`[CTRL] Bypassing security for ${id}...`, 'w');
      alert2(`Overriding ${id}...`, 'b');
      setTimeout(() => {
        sysLog(`[CTRL] Full control acquired for ${id}`, 'ok');
        alert2(`Control: ${id}`, 'g');
      }, 2500);
    };

    window.radioComm = (id: string) => {
      sysLog(`[COMM] Opening radio channel to ${id}...`, 'i');
      alert2(`Radio: ${id}`, 'b');
    };

    // Fighter Radar Logic
    const drawFighterRadar = () => {
      const rc = document.getElementById('fighter-radar') as HTMLCanvasElement;
      if (!rc) return;
      const rctx = rc.getContext('2d');
      if (!rctx) return;
      const W = 400, H = 400, cx = W / 2, cy = H / 2, R = W / 2 - 10;
      rctx.clearRect(0, 0, W, H);
      rctx.beginPath(); rctx.arc(cx, cy, R, 0, Math.PI * 2);
      rctx.fillStyle = '#010a04'; rctx.fill();

      // Rings
      [.2, .4, .6, .8, 1].forEach(f => {
        rctx.beginPath(); rctx.arc(cx, cy, R * f, 0, Math.PI * 2);
        rctx.strokeStyle = `rgba(0,255,65,${.1})`; rctx.lineWidth = 1; rctx.stroke();
      });

      // Sweep
      const sweepA = (Date.now() / 1000) % (Math.PI * 2);
      const grad = rctx.createLinearGradient(cx, cy, cx + R * Math.cos(sweepA), cy + R * Math.sin(sweepA));
      grad.addColorStop(0, 'rgba(0,255,65,0.5)');
      grad.addColorStop(1, 'rgba(0,255,65,0)');
      rctx.beginPath(); rctx.moveTo(cx, cy); rctx.arc(cx, cy, R, sweepA - 0.5, sweepA); rctx.lineTo(cx, cy);
      rctx.fillStyle = grad; rctx.fill();

      // Jets
      const jets = [
        { id: 'F35', a: 0.5, r: 0.7, st: 'HOSTILE' },
        { id: 'F22', a: 2.1, r: 0.3, st: 'FRIENDLY' },
        { id: 'SU57', a: 4.5, r: 0.9, st: 'UNKNOWN' },
      ];
      jets.forEach(j => {
        const px = cx + R * j.r * Math.cos(j.a), py = cy + R * j.r * Math.sin(j.a);
        rctx.beginPath(); rctx.arc(px, py, 4, 0, Math.PI * 2);
        rctx.fillStyle = j.st === 'HOSTILE' ? '#ff2244' : j.st === 'FRIENDLY' ? '#00ff41' : '#ffb300';
        rctx.fill();
        rctx.font = '9px Share Tech Mono';
        rctx.fillText(j.id, px + 6, py - 6);
      });

      window.fighterAnimId = requestAnimationFrame(drawFighterRadar);
    };

    // Missile Radar Logic
    const drawMissileRadar = () => {
      const rc = document.getElementById('missile-radar') as HTMLCanvasElement;
      if (!rc) return;
      const rctx = rc.getContext('2d');
      if (!rctx) return;
      const W = 300, H = 300, cx = W / 2, cy = H / 2, R = W / 2 - 5;
      rctx.clearRect(0, 0, W, H);
      rctx.beginPath(); rctx.arc(cx, cy, R, 0, Math.PI * 2);
      rctx.fillStyle = '#020502'; rctx.fill();

      // Grid
      rctx.strokeStyle = 'rgba(255,34,68,0.1)';
      for(let i=0; i<W; i+=30) { rctx.beginPath(); rctx.moveTo(i, 0); rctx.lineTo(i, H); rctx.stroke(); }
      for(let i=0; i<H; i+=30) { rctx.beginPath(); rctx.moveTo(0, i); rctx.lineTo(W, i); rctx.stroke(); }

      // Threats
      const threats = [
        { id: 'T-01', x: 0.3, y: 0.2 },
        { id: 'T-02', x: 0.8, y: 0.5 },
      ];
      threats.forEach(t => {
        const px = t.x * W, py = t.y * H;
        rctx.beginPath(); rctx.moveTo(px, py-6); rctx.lineTo(px+4, py+4); rctx.lineTo(px-4, py+4); rctx.closePath();
        rctx.fillStyle = '#ff2244'; rctx.fill();
        rctx.fillText(t.id, px + 6, py - 6);
      });

      window.missileAnimId = requestAnimationFrame(drawMissileRadar);
    };

    // Drone Map Logic
    let droneMap: any;
    const initDroneMap = () => {
      const el = document.getElementById('drone-map');
      if (!el || !window.L) return;
      if (droneMap) droneMap.remove();
      droneMap = window.L.map('drone-map').setView([HQ_LAT, HQ_LON], 13);
      window.L.tileLayer('https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png').addTo(droneMap);
      
      droneMap.on('click', (e: any) => {
        if (window.addWaypoint) {
          window.addWaypoint(e.latlng.lat, e.latlng.lng);
        }
      });

      const drones = [
        { id: 'DRN-01', lat: 6.15, lon: 102.28, st: 'HOSTILE' },
        { id: 'DRN-02', lat: 6.12, lon: 102.25, st: 'FRIENDLY' },
      ];
      drones.forEach(d => {
        const col = d.st === 'HOSTILE' ? '#ff2244' : '#00ff41';
        window.L.circleMarker([d.lat, d.lon], { radius: 8, color: col, fillColor: col, fillOpacity: 0.6 }).addTo(droneMap)
          .bindPopup(`<b>${d.id}</b><br>${d.st}`);
      });

      // Draw waypoints for selected drone
      if (window.currentWaypoints && window.currentWaypoints.length > 0) {
        const latlngs = window.currentWaypoints.map((wp: any) => [wp.lat, wp.lon]);
        window.L.polyline(latlngs, { color: '#00d4ff', dashArray: '5, 10' }).addTo(droneMap);
        window.currentWaypoints.forEach((wp: any, idx: number) => {
          window.L.circleMarker([wp.lat, wp.lon], { radius: 4, color: '#00d4ff' }).addTo(droneMap)
            .bindTooltip(`WP ${idx + 1}`, { permanent: true, direction: 'right' });
        });
      }
    };
    window.initDroneMap = initDroneMap;

    window.currentWaypoints = selectedDrone ? droneMissions[selectedDrone]?.waypoints : [];
    window.addWaypoint = (lat: number, lon: number) => {
      if (!selectedDrone) {
        window.alert2?.('Select a drone first', 'w');
        return;
      }
      setDroneMissions(prev => ({
        ...prev,
        [selectedDrone]: {
          ...prev[selectedDrone],
          waypoints: [...prev[selectedDrone].waypoints, { lat, lon }]
        }
      }));
      window.sysLog?.(`[DRONE] Waypoint added for ${selectedDrone}: ${lat.toFixed(4)}, ${lon.toFixed(4)}`, 'i');
    };

    // Initialize based on activePage
    if (activePage === 'fighterjet') drawFighterRadar();
    if (activePage === 'missile') drawMissileRadar();
    if (activePage === 'drone') setTimeout(initDroneMap, 100);

    // Initialize
    initBlips();
    drawRadar();
    initSigChart();
    buildDevTable();

    const simInterval = setInterval(() => {
      window.DEV.filter((d: any) => d.status !== 'FRIENDLY' && d.speed > 0).forEach((d: any) => {
        d.range = Math.max(5, d.range - d.speed / 3600 * .6);
        d.strength = Math.min(-38, d.strength + .03);
      });
      updSigChart();
      const totalThreats = window.DEV.filter((d: any) => d.status === 'HOSTILE' || d.status === 'UNKNOWN').length;
      const tpThreats = document.getElementById('tp-threats');
      if (tpThreats) tpThreats.textContent = String(totalThreats);
    }, 500);

    return () => {
      clearInterval(simInterval);
      if (sigChart) sigChart.destroy();
    };
  }, [activePage, selectedDrone, droneMissions]); // Re-init when page, drone selection, or missions change

  const options: Intl.DateTimeFormatOptions = { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' };
  const dateStr = time.toLocaleDateString('en-MY', options).toUpperCase();
  const timeStr = time.toLocaleTimeString('en-MY', { hour12: false });
  const utcStr = time.toUTCString().slice(17, 25);

  return (
    <div className="flex flex-col h-screen overflow-hidden bg-[var(--bg)] text-[var(--tx)] font-['Share_Tech_Mono']">
      {/* Topbar */}
      <div id="topbar">
        <button id="ham-btn" className="md:hidden">☰</button>
        <div className="logo">AEGIS<span>CMD</span></div>
        <div className="top-st hidden md:flex">
          <div className="si"><div className="dot g" id="d-radar"></div><span id="l-radar">RADAR ONLINE</span></div>
          <div className="si"><div className="dot g" id="d-iron"></div><span id="l-iron">SISTEM PERTAHANAN AKTIF</span></div>
          <div className="si"><div className="dot a" id="d-arrow"></div><span id="l-arrow">MISSILE STANDBY</span></div>
          <div className="si"><div className="dot r"></div><span>THREATS: <b id="tp-threats" className="text-[var(--rd)]">3</b></span></div>
        </div>
        <div id="clock" className="flex flex-col items-end leading-tight">
          <div className="text-[14px] text-[var(--g)]">{timeStr} <span className="text-[9px] text-[var(--am)]">LOCAL</span></div>
          <div className="text-[9px] text-[var(--txd)]">{dateStr} | {utcStr} UTC</div>
        </div>
      </div>

      <div id="app" className="flex flex-1 overflow-hidden">
        {/* Sidebar */}
        <div id="sidebar" className="hidden md:flex">
          <div className="sct">Navigation</div>
          <div className={`ni ${activePage === 'dashboard' ? 'active' : ''}`} onClick={() => setActivePage('dashboard')}><span className="ic">◈</span>DASHBOARD</div>
          <div className={`ni ${activePage === 'mission' ? 'active' : ''}`} onClick={() => setActivePage('mission')}><span className="ic">📋</span>MISSION PLAN</div>
          <div className={`ni ${activePage === 'devices' ? 'active' : ''}`} onClick={() => setActivePage('devices')}><span className="ic">⊕</span>DETECTED<span className="nb r" id="nb-dev">10</span></div>
          <div className={`ni ${activePage === 'config' ? 'active' : ''}`} onClick={() => setActivePage('config')}><span className="ic">◎</span>RADAR CONFIG</div>
          <div className={`ni ${activePage === 'missile' ? 'active' : ''}`} onClick={() => setActivePage('missile')}><span className="ic">⚡</span>MISSILE CTL<span className="nb a" id="nb-mis">!</span></div>
          <div className={`ni ${activePage === 'fighterjet' ? 'active' : ''}`} onClick={() => setActivePage('fighterjet')}><span className="ic">✈</span>FIGHTER RADAR</div>
          <hr className="sd" />
          <div className="sct">Live Sensors</div>
          <div className={`ni ${activePage === 'liveradar' ? 'active' : ''}`} onClick={() => setActivePage('liveradar')}><span className="ic">🎯</span>LIVE RADAR<span className="nb g" id="nb-gps" style={{ fontSize: '7px', padding: '1px 4px' }}>GPS</span></div>
          <div className={`ni ${activePage === 'flightradar' ? 'active' : ''}`} onClick={() => setActivePage('flightradar')}><span className="ic">✈</span>FLIGHT RADAR<span className="nb b" id="nb-flights" style={{ fontSize: '7px', padding: '1px 4px' }}>0</span></div>
          <div className={`ni ${activePage === 'shipradar' ? 'active' : ''}`} onClick={() => setActivePage('shipradar')}><span className="ic">🚢</span>SHIP RADAR<span className="nb g" id="nb-ships" style={{ fontSize: '7px', padding: '1px 4px' }}>0</span></div>
          <div className={`ni ${activePage === 'camera' ? 'active' : ''}`} onClick={() => setActivePage('camera')}><span className="ic">📷</span>CAMERA AR</div>
          <hr className="sd" />
          <div className="sct">Drone Ops</div>
          <div className={`ni ${activePage === 'fleet' ? 'active' : ''}`} onClick={() => setActivePage('fleet')}><span className="ic">📊</span>FLEET OVERVIEW</div>
          <div className={`ni ${activePage === 'telemetry' ? 'active' : ''}`} onClick={() => setActivePage('telemetry')}><span className="ic">📋</span>TELEMETRY LOG</div>
          <div className={`ni ${activePage === 'drone' ? 'active' : ''}`} onClick={() => setActivePage('drone')}><span className="ic">🚁</span>DRONE CTRL<span className="nb b" id="nb-drones" style={{ fontSize: '7px', padding: '1px 4px' }}>0</span></div>
          <div className={`ni ${activePage === 'autopilot' ? 'active' : ''}`} onClick={() => setActivePage('autopilot')}><span className="ic">🤖</span>AUTOPILOT</div>
          <div className="sct">System</div>
          <div className="tbox">
            <div className="tbl">Threat Level</div>
            <div className="tbv el" id="t-lbl">ELEVATED</div>
            <div className="pbar"><div className="pf a" id="t-bar" style={{ width: '65%' }}></div></div>
          </div>
        </div>

        {/* Main Content */}
        <div id="main" className="flex-1 overflow-y-auto bg-[var(--bg)]" ref={mainRef}>
          <motion.div
            key={activePage}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
            className="p-4"
          >
            {activePage === 'dashboard' && (
              <div id="pg-dashboard" className="pg active">
                <div className="ph">
                  <div><div className="pt">AEGIS COMMAND DASHBOARD</div><div className="psub">LIVE TACTICAL OVERVIEW — MALACCA STRAIT SECTOR</div></div>
                  <div className="flex gap-2">
                    <button className="btn bg" onClick={() => window.scanNow?.()}>⊕ SYSTEM SCAN</button>
                    <button className="btn br" onClick={() => window.emergStop?.()}>⚡ EMERGENCY STOP</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                  <div className="pn lg:col-span-2">
                    <div className="pnh"><span className="pnt">◈ Tactical Radar Scope</span></div>
                    <div className="pnb flex justify-center">
                      <canvas id="radar" width="400" height="400" className="max-w-full"></canvas>
                    </div>
                  </div>
                  <div className="pn">
                    <div className="pnh"><span className="pnt">◎ Signal Analysis</span></div>
                    <div className="pnb">
                      <canvas id="sig-chart" height="150"></canvas>
                      <div className="mt-4 space-y-2">
                        <div className="fl">Band Activity</div>
                        <div className="flex items-center gap-2">
                          <div className="text-[10px] w-8">2.4G</div>
                          <div className="flex-1 h-2 bg-black/40 border border-[var(--bdr)]"><div id="bar-24" className="h-full bg-[var(--g)]" style={{ width: '45%' }}></div></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-[10px] w-8">5.8G</div>
                          <div className="flex-1 h-2 bg-black/40 border border-[var(--bdr)]"><div id="bar-58" className="h-full bg-[var(--am)]" style={{ width: '12%' }}></div></div>
                        </div>
                        <div className="flex items-center gap-2">
                          <div className="text-[10px] w-8">SAT</div>
                          <div className="flex-1 h-2 bg-black/40 border border-[var(--bdr)]"><div id="bar-sat" className="h-full bg-[var(--bl)]" style={{ width: '88%' }}></div></div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="pn">
                  <div className="pnh"><span className="pnt">⊕ System Status</span></div>
                  <div className="pnb grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="st-box">
                      <div className="stl">CPU LOAD</div>
                      <div className="stv">14.2%</div>
                    </div>
                    <div className="st-box">
                      <div className="stl">MEM USAGE</div>
                      <div className="stv">2.4 GB</div>
                    </div>
                    <div className="st-box">
                      <div className="stl">UPLINK</div>
                      <div className="stv text-[var(--g)]">STABLE</div>
                    </div>
                    <div className="st-box">
                      <div className="stl">LATENCY</div>
                      <div className="stv">12ms</div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePage === 'fighterjet' && (
              <div id="pg-fighterjet" className="pg active">
                <div className="ph">
                  <div><div className="pt">FIGHTER JET RADAR</div><div className="psub">ADVANCED STEALTH DETECTION — F-35 / F-22 / SU-57</div></div>
                  <div className="flex gap-2">
                    <button className="btn bg" onClick={() => window.scanNow?.()}>⊕ DEEP SCAN</button>
                    <button className="btn br" onClick={() => window.jamEntity?.('ALL_HOSTILE')}>⚡ MASS JAM</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                  <div className="pn lg:col-span-2">
                    <div className="pnh"><span className="pnt">◈ Combat Air Patrol — Live</span></div>
                    <div className="pnb flex flex-col items-center">
                      <canvas id="fighter-radar" width="400" height="400" className="max-w-full"></canvas>
                    </div>
                  </div>
                  <div className="pn">
                    <div className="pnh"><span className="pnt">◎ Detected Jets</span></div>
                    <div className="pnb">
                      {[
                        { id: 'F35-01', type: 'F-35 Lightning II', status: 'HOSTILE', dist: '120km' },
                        { id: 'F22-04', type: 'F-22 Raptor', status: 'FRIENDLY', dist: '45km' },
                        { id: 'SU57-02', type: 'Su-57 Felon', status: 'UNKNOWN', dist: '210km' },
                      ].map(jet => (
                        <div key={jet.id} className="mb-3 p-2 border border-[var(--bdr)] bg-black/20">
                          <div className="flex justify-between items-center mb-1">
                            <span className={`font-bold ${jet.status === 'HOSTILE' ? 'text-[var(--rd)]' : jet.status === 'FRIENDLY' ? 'text-[var(--g)]' : 'text-[var(--am)]'}`}>{jet.id}</span>
                            <span className="text-[9px] text-[var(--txd)]">{jet.dist}</span>
                          </div>
                          <div className="text-[10px] mb-2">{jet.type}</div>
                          <div className="flex gap-1">
                            <button className="btn bb py-1 px-2 text-[8px]" onClick={() => window.connectDev?.(jet.id)}>CONN</button>
                            <button className="btn bg py-1 px-2 text-[8px]" onClick={() => window.takeControl?.(jet.id)}>CTRL</button>
                            <button className="btn br py-1 px-2 text-[8px]" onClick={() => window.jamEntity?.(jet.id)}>JAM</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePage === 'drone' && (
              <div id="pg-drone" className="pg active">
                <div className="ph">
                  <div><div className="pt">DRONE RADAR</div><div className="psub">REAL-TIME UAV TRACKING & CONTROL</div></div>
                  <div className="flex gap-2">
                    <button className="btn bg" onClick={() => window.scanNow?.()}>⊕ SCAN DRONES</button>
                  </div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                  <div className="pn lg:col-span-2">
                    <div className="pnh">
                      <span className="pnt">🗺 Live Drone Map</span>
                      {selectedDrone && (
                        <span className="text-[10px] text-[var(--bl)] animate-pulse">CLICK MAP TO ADD WAYPOINTS FOR {selectedDrone}</span>
                      )}
                    </div>
                    <div id="drone-map" className="h-[400px] w-full bg-black/40"></div>
                  </div>
                  <div className="pn">
                    <div className="pnh"><span className="pnt">◎ Drone Fleet</span></div>
                    <div className="pnb">
                      {fleet.map(drone => (
                        <div key={drone.id} className={`mb-3 p-2 border ${selectedDrone === drone.id ? 'border-[var(--g)] bg-[var(--gk)]/20' : 'border-[var(--bdr)] bg-black/20'} cursor-pointer`} onClick={() => setSelectedDrone(drone.id)}>
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-[var(--g)]">{drone.id}</span>
                            <span className={`bd ${drone.status === 'ACTIVE' ? 'g' : drone.status === 'STBY' ? 'b' : drone.status === 'RTB' ? 'a' : 'r'}`}>{drone.status}</span>
                          </div>
                          <div className="text-[9px] text-[var(--txd)] mb-1">
                            TYPE: {drone.type} | MISSION: {droneMissions[drone.id]?.waypoints.length > 0 ? <span className="text-[var(--bl)]">ACTIVE ({droneMissions[drone.id].waypoints.length} WP)</span> : 'IDLE'}
                            {droneMissions[drone.id]?.targetId && <span className="ml-2 text-[var(--rd)]">| TGT: {droneMissions[drone.id].targetId}</span>}
                          </div>

                          <div className="mt-2 mb-2">
                            <div className="text-[8px] text-[var(--txd)] mb-1 uppercase">Assign Target ID</div>
                            <select 
                              className="fsel w-full py-1 text-[9px]" 
                              value={droneMissions[drone.id]?.targetId || ''} 
                              onClick={(e) => e.stopPropagation()}
                              onChange={(e) => {
                                setDroneMissions(prev => ({
                                  ...prev,
                                  [drone.id]: { ...prev[drone.id], targetId: e.target.value || null }
                                }));
                                window.sysLog?.(`[DRONE] Target ${e.target.value || 'CLEARED'} assigned to ${drone.id}`, 'i');
                              }}
                            >
                              <option value="">NONE</option>
                              {window.DEV?.filter((d: any) => d.status !== 'FRIENDLY').map((d: any) => (
                                <option key={d.id} value={d.id}>{d.id} ({d.status})</option>
                              ))}
                            </select>
                          </div>

                          <div className="flex gap-1">
                            <button className="btn bb py-1 px-2 text-[8px]" onClick={(e) => { e.stopPropagation(); window.connectDev?.(drone.id); }}>CONN</button>
                            <button className="btn bg py-1 px-2 text-[8px]" onClick={(e) => { e.stopPropagation(); window.takeControl?.(drone.id); }}>CTRL</button>
                            <button className="btn br py-1 px-2 text-[8px]" onClick={(e) => { e.stopPropagation(); window.jamEntity?.(drone.id); }}>JAM</button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>

                {/* Drone Camera Feed */}
                <div className="pn mb-4">
                  <div className="pnh">
                    <span className="pnt">📷 Live Drone Feed: {selectedDrone || 'NONE'}</span>
                    {selectedDrone && (
                      <div className="flex gap-2">
                        <span className="text-[10px] text-[var(--g)] animate-pulse">● SIGNAL STRENGTH: {fleet.find(d => d.id === selectedDrone)?.signal}%</span>
                      </div>
                    )}
                  </div>
                  <div className="pnb h-[300px] p-0">
                    <DroneCamera droneId={selectedDrone} fleet={fleet} />
                  </div>
                </div>

                {/* Mission Planner */}
                {selectedDrone && (
                  <div className="pn mb-4">
                    <div className="pnh">
                      <span className="pnt">📋 Mission Planner: {selectedDrone}</span>
                      <div className="flex gap-2">
                        <button className="btn br py-1 px-2 text-[8px]" onClick={() => {
                          setDroneMissions(prev => ({
                            ...prev,
                            [selectedDrone]: { ...prev[selectedDrone], waypoints: [] }
                          }));
                          window.sysLog?.(`[DRONE] Waypoints cleared for ${selectedDrone}`, 'w');
                        }}>CLEAR WAYPOINTS</button>
                        <button className="btn bg py-1 px-2 text-[8px]" onClick={() => {
                          window.sysLog?.(`[DRONE] Mission uploaded to ${selectedDrone}`, 'ok');
                          window.alert2?.('Mission Uploaded', 'g');
                        }}>UPLOAD MISSION</button>
                      </div>
                    </div>
                    <div className="pnb grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div>
                        <div className="fl">Rules of Engagement</div>
                        <select 
                          className="fsel" 
                          value={droneMissions[selectedDrone]?.roe} 
                          onChange={(e) => setDroneMissions(prev => ({
                            ...prev,
                            [selectedDrone]: { ...prev[selectedDrone], roe: e.target.value }
                          }))}
                        >
                          <option value="PASSIVE">PASSIVE (RECON ONLY)</option>
                          <option value="DEFENSIVE">DEFENSIVE (RETURN FIRE)</option>
                          <option value="AGGRESSIVE">AGGRESSIVE (ENGAGE ON SIGHT)</option>
                        </select>
                      </div>
                      <div>
                        <div className="fl">Assign Target</div>
                        <select 
                          className="fsel" 
                          value={droneMissions[selectedDrone]?.targetId || ''} 
                          onChange={(e) => setDroneMissions(prev => ({
                            ...prev,
                            [selectedDrone]: { ...prev[selectedDrone], targetId: e.target.value || null }
                          }))}
                        >
                          <option value="">NO TARGET ASSIGNED</option>
                          {window.DEV?.filter((d: any) => d.status !== 'FRIENDLY').map((d: any) => (
                            <option key={d.id} value={d.id}>{d.id} ({d.status})</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <div className="fl">Waypoints ({droneMissions[selectedDrone]?.waypoints.length})</div>
                        <div className="max-h-[200px] overflow-y-auto border border-[var(--bdr)] p-2 bg-black/40">
                          {droneMissions[selectedDrone]?.waypoints.length === 0 ? (
                            <div className="text-[10px] text-[var(--txd)] italic">No waypoints set. Click map to add.</div>
                          ) : (
                            droneMissions[selectedDrone]?.waypoints.map((wp, i) => (
                              <div key={i} className="text-[9px] mb-2 flex flex-col border-b border-[var(--bdr)]/30 pb-2 last:border-0">
                                <div className="flex justify-between mb-1">
                                  <span className="font-bold text-[var(--bl)]">WAYPOINT {i+1}</span>
                                  <button className="text-[var(--rd)] hover:underline" onClick={() => {
                                    setDroneMissions(prev => {
                                      const newWaypoints = prev[selectedDrone].waypoints.filter((_, idx) => idx !== i);
                                      return { ...prev, [selectedDrone]: { ...prev[selectedDrone], waypoints: newWaypoints } };
                                    });
                                    window.sysLog?.(`[DRONE] Waypoint ${i+1} removed for ${selectedDrone}`, 'w');
                                  }}>REMOVE</button>
                                </div>
                                <div className="flex gap-2">
                                  <div className="flex-1">
                                    <div className="text-[7px] text-[var(--txd)] uppercase mb-0.5">Latitude</div>
                                    <input 
                                      type="number" 
                                      step="0.0001"
                                      className="fsel w-full py-0.5 px-1 text-[9px]" 
                                      value={wp.lat} 
                                      onChange={(e) => updateWaypoint(selectedDrone, i, 'lat', e.target.value)}
                                    />
                                  </div>
                                  <div className="flex-1">
                                    <div className="text-[7px] text-[var(--txd)] uppercase mb-0.5">Longitude</div>
                                    <input 
                                      type="number" 
                                      step="0.0001"
                                      className="fsel w-full py-0.5 px-1 text-[9px]" 
                                      value={wp.lon} 
                                      onChange={(e) => updateWaypoint(selectedDrone, i, 'lon', e.target.value)}
                                    />
                                  </div>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {activePage === 'flightradar' && (
              <div id="pg-flightradar" className="pg active">
                <div className="ph">
                  <div><div className="pt">FLIGHT RADAR</div><div className="psub">COMMERCIAL & MILITARY AIR TRAFFIC</div></div>
                </div>
                <div className="pn">
                  <div className="pnh"><span className="pnt">✈ Active Flights</span></div>
                  <div className="overflow-x-auto">
                    <table className="dt w-full">
                      <thead>
                        <tr>
                          <th>CALLSIGN</th><th>TYPE</th><th>ALT</th><th>SPD</th><th>STATUS</th><th>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { cs: 'MH123', type: 'B737', alt: '32000ft', spd: '450kts', status: 'FRIENDLY' },
                          { cs: 'AK456', type: 'A320', alt: '28000ft', spd: '420kts', status: 'FRIENDLY' },
                          { cs: 'UNKN-X', type: 'UAV', alt: '15000ft', spd: '120kts', status: 'UNKNOWN' },
                        ].map(f => (
                          <tr key={f.cs}>
                            <td>{f.cs}</td><td>{f.type}</td><td>{f.alt}</td><td>{f.spd}</td>
                            <td><span className={`bd ${f.status === 'FRIENDLY' ? 'g' : 'a'}`}>{f.status}</span></td>
                            <td className="flex gap-1">
                              <button className="btn bb py-1 px-2 text-[8px]" onClick={() => window.connectDev?.(f.cs)}>CONN</button>
                              <button className="btn bg py-1 px-2 text-[8px]" onClick={() => window.takeControl?.(f.cs)}>CTRL</button>
                              <button className="btn ba py-1 px-2 text-[8px]" onClick={() => window.radioComm?.(f.cs)}>RADIO</button>
                              <button className="btn br py-1 px-2 text-[8px]" onClick={() => window.jamEntity?.(f.cs)}>JAM</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activePage === 'shipradar' && (
              <div id="pg-shipradar" className="pg active">
                <div className="ph">
                  <div><div className="pt">SHIP RADAR</div><div className="psub">MARITIME VESSEL TRACKING — AIS DATA</div></div>
                </div>
                <div className="pn">
                  <div className="pnh"><span className="pnt">🚢 Active Vessels</span></div>
                  <div className="overflow-x-auto">
                    <table className="dt w-full">
                      <thead>
                        <tr>
                          <th>NAME</th><th>TYPE</th><th>SPD</th><th>DEST</th><th>STATUS</th><th>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[
                          { name: 'MAERSK KOTA', type: 'CARGO', spd: '18kts', dest: 'SINGAPORE', status: 'FRIENDLY' },
                          { name: 'KD JEBAT', type: 'FRIGATE', spd: '25kts', dest: 'PATROL', status: 'FRIENDLY' },
                          { name: 'UNKNOWN-V', type: 'FISHING', spd: '8kts', dest: 'UNKNOWN', status: 'UNKNOWN' },
                        ].map(s => (
                          <tr key={s.name}>
                            <td>{s.name}</td><td>{s.type}</td><td>{s.spd}</td><td>{s.dest}</td>
                            <td><span className={`bd ${s.status === 'FRIENDLY' ? 'g' : 'a'}`}>{s.status}</span></td>
                            <td className="flex gap-1">
                              <button className="btn bb py-1 px-2 text-[8px]" onClick={() => window.connectDev?.(s.name)}>CONN</button>
                              <button className="btn bg py-1 px-2 text-[8px]" onClick={() => window.takeControl?.(s.name)}>CTRL</button>
                              <button className="btn ba py-1 px-2 text-[8px]" onClick={() => window.radioComm?.(s.name)}>RADIO</button>
                              <button className="btn br py-1 px-2 text-[8px]" onClick={() => window.jamEntity?.(s.name)}>JAM</button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activePage === 'missile' && (
              <div id="pg-missile" className="pg active">
                <div className="ph">
                  <div><div className="pt">MISSILE RADAR</div><div className="psub">INTERCEPTOR STATUS & THREAT TRACKING</div></div>
                </div>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mb-4">
                  <div className="pn">
                    <div className="pnh"><span className="pnt">🚀 Interceptor Inventory</span></div>
                    <div className="pnb">
                      {[
                        { name: 'TAMIR', type: 'IRON DOME', count: 4, ready: true },
                        { name: 'ARROW-3', type: 'EXO-ATMOSPHERIC', count: 2, ready: true },
                        { name: 'PAC-3', type: 'PATRIOT', count: 0, ready: false },
                        { name: 'THAAD', type: 'TERMINAL HIGH ALT', count: 1, ready: true },
                      ].map(m => (
                        <div key={m.name} className="flex justify-between items-center mb-2 p-2 border border-[var(--bdr)]">
                          <div>
                            <div className="font-bold text-[var(--g)]">{m.name}</div>
                            <div className="text-[9px] text-[var(--txd)]">{m.type}</div>
                          </div>
                          <div className="text-right">
                            <div className={`text-lg font-bold ${m.count > 0 ? 'text-[var(--g)]' : 'text-[var(--rd)]'}`}>×{m.count}</div>
                            <div className="text-[8px]">{m.ready ? 'READY' : 'RELOADING'}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pn">
                    <div className="pnh"><span className="pnt">◈ Missile Tracking Scope</span></div>
                    <div className="pnb flex justify-center">
                      <canvas id="missile-radar" width="300" height="300"></canvas>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePage === 'mission' && (
              <div id="pg-mission" className="pg active">
                <div className="ph">
                  <div><div className="pt">MISSION PLANNING</div><div className="psub">STRATEGIC ASSET DEPLOYMENT & ENGAGEMENT RULES</div></div>
                  <div className="flex gap-2">
                    <button className="btn bg" onClick={() => {
                      window.sysLog?.('[MISSION] Global ROE updated to AGGRESSIVE', 'w');
                      window.alert2?.('ROE: AGGRESSIVE', 'r');
                    }}>⚡ BATTLE READY</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
                  <div className="pn lg:col-span-2">
                    <div className="pnh"><span className="pnt">🎯 Engagement Matrix</span></div>
                    <div className="pnb p-0">
                      <table className="dt w-full">
                        <thead>
                          <tr>
                            <th>ASSET</th><th>TYPE</th><th>ASSIGNED TARGET</th><th>ROE</th><th>STATUS</th>
                          </tr>
                        </thead>
                        <tbody>
                          {[
                            { id: 'DRN-01', type: 'UAV', target: droneMissions['DRN-01']?.targetId || 'NONE', roe: droneMissions['DRN-01']?.roe, st: 'ON STATION' },
                            { id: 'DRN-02', type: 'UAV', target: droneMissions['DRN-02']?.targetId || 'NONE', roe: droneMissions['DRN-02']?.roe, st: 'PATROLLING' },
                            { id: 'IRON-DOME', type: 'SAM', target: 'AUTO-THREAT', roe: 'DEFENSIVE', st: 'ACTIVE' },
                            { id: 'ARROW-3', type: 'ABM', target: 'NONE', roe: 'PASSIVE', st: 'STANDBY' },
                          ].map(asset => (
                            <tr key={asset.id}>
                              <td className="font-bold text-[var(--g)]">{asset.id}</td>
                              <td>{asset.type}</td>
                              <td className={asset.target !== 'NONE' ? 'text-[var(--rd)]' : ''}>{asset.target}</td>
                              <td><span className={`bd ${asset.roe === 'AGGRESSIVE' ? 'r' : asset.roe === 'DEFENSIVE' ? 'a' : 'g'}`}>{asset.roe}</span></td>
                              <td>{asset.st}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="pn">
                    <div className="pnh"><span className="pnt">⚠ High Priority Threats</span></div>
                    <div className="pnb">
                      {window.DEV?.filter((d: any) => d.status === 'HOSTILE').map((d: any) => (
                        <div key={d.id} className="mb-3 p-2 border border-[var(--rd)] bg-[var(--rdk)]/10">
                          <div className="flex justify-between items-center mb-1">
                            <span className="font-bold text-[var(--rd)]">{d.id}</span>
                            <span className="text-[9px] text-[var(--txd)]">{d.type}</span>
                          </div>
                          <div className="text-[10px] mb-2">RANGE: {d.range.toFixed(1)}km | SPEED: {d.speed}km/h</div>
                          <div className="flex gap-1">
                            <button className="btn bg py-1 px-2 text-[8px]" onClick={() => {
                              setSelectedDrone('DRN-01');
                              setActivePage('drone');
                              window.sysLog?.(`[MISSION] Tasking DRN-01 to intercept ${d.id}`, 'w');
                            }}>ASSIGN DRN-01</button>
                            <button className="btn br py-1 px-2 text-[8px]" onClick={() => {
                              window.sysLog?.(`[MISSION] Locking ${d.id} for Iron Dome engagement`, 'e');
                              window.alert2?.(`Target Locked: ${d.id}`, 'r');
                            }}>LOCK SAM</button>
                          </div>
                        </div>
                      ))}
                      {window.DEV?.filter((d: any) => d.status === 'HOSTILE').length === 0 && (
                        <div className="text-center py-8 text-[var(--txd)] opacity-50 italic">No active hostile threats.</div>
                      )}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="pn">
                    <div className="pnh"><span className="pnt">🛡 Rules of Engagement (Global)</span></div>
                    <div className="pnb">
                      <div className="space-y-4">
                        <div className="flex items-center justify-between p-2 border border-[var(--bdr)] hover:border-[var(--g)] cursor-pointer">
                          <div>
                            <div className="font-bold text-[var(--g)]">ROE: PASSIVE</div>
                            <div className="text-[9px] text-[var(--txd)]">Surveillance only. No engagement without direct order.</div>
                          </div>
                          <div className="dot g"></div>
                        </div>
                        <div className="flex items-center justify-between p-2 border border-[var(--bdr)] hover:border-[var(--am)] cursor-pointer">
                          <div>
                            <div className="font-bold text-[var(--am)]">ROE: DEFENSIVE</div>
                            <div className="text-[9px] text-[var(--txd)]">Engage only if fired upon or threat enters exclusion zone.</div>
                          </div>
                          <div className="dot a"></div>
                        </div>
                        <div className="flex items-center justify-between p-2 border border-[var(--rd)] bg-[var(--rdk)]/10 cursor-pointer">
                          <div>
                            <div className="font-bold text-[var(--rd)]">ROE: AGGRESSIVE</div>
                            <div className="text-[9px] text-[var(--txd)]">Engage all hostile entities within range immediately.</div>
                          </div>
                          <div className="dot r"></div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <div className="pn">
                    <div className="pnh"><span className="pnt">📡 Mission Comms</span></div>
                    <div id="dlg" className="log h-[180px] border-none bg-black/40">
                      <div className="ll"><span className="lt">01:42:00</span><span className="lm i">MISSION CONTROL ONLINE. STANDING BY FOR TASKING.</span></div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePage === 'fleet' && (
              <div id="pg-fleet" className="pg active">
                <div className="ph">
                  <div><div className="pt">FLEET OVERVIEW</div><div className="psub">CONSOLIDATED DRONE STATUS & MISSION PROGRESS</div></div>
                  <div className="flex gap-2">
                    <button className="btn bg" onClick={() => window.sysLog?.('Initiating global fleet sync...', 'i')}>⊕ SYNC ALL</button>
                    <button className="btn br" onClick={() => window.sysLog?.('All drones returning to base...', 'w')}>⚡ GLOBAL RTB</button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
                  <div className="st-box">
                    <div className="stl">TOTAL ASSETS</div>
                    <div className="stv">{fleet.length}</div>
                  </div>
                  <div className="st-box">
                    <div className="stl">ACTIVE MISSIONS</div>
                    <div className="stv text-[var(--g)]">{fleet.filter(d => d.status === 'ACTIVE').length}</div>
                  </div>
                  <div className="st-box">
                    <div className="stl">AVG BATTERY</div>
                    <div className="stv text-[var(--am)]">
                      {Math.round(fleet.reduce((acc, d) => acc + d.batt, 0) / fleet.length)}%
                    </div>
                  </div>
                  <div className="st-box">
                    <div className="stl">SYSTEM HEALTH</div>
                    <div className="stv text-[var(--bl)]">OPTIMAL</div>
                  </div>
                </div>

                <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                  <div className="xl:col-span-2 space-y-4">
                    {fleet.map(drone => (
                      <div key={drone.id} className="pn hover:border-[var(--g)] transition-colors cursor-pointer" onClick={() => { setSelectedDrone(drone.id); setActivePage('drone'); }}>
                        <div className="pnh flex justify-between items-center">
                          <div className="flex items-center gap-3">
                            <span className="text-xl">🚁</span>
                            <div>
                              <span className="pnt">{drone.id}</span>
                              <span className="text-[10px] ml-2 opacity-50">{drone.type}</span>
                            </div>
                          </div>
                          <span className={`bd ${drone.status === 'ACTIVE' ? 'g' : drone.status === 'STBY' ? 'b' : drone.status === 'RTB' ? 'a' : 'r'}`}>
                            {drone.status}
                          </span>
                        </div>
                        <div className="pnb grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div>
                            <div className="fl">POSITION</div>
                            <div className="text-[11px]">{drone.lat.toFixed(4)}, {drone.lon.toFixed(4)}</div>
                            <div className="text-[9px] text-[var(--txd)]">ALT: {drone.alt} | SPD: {drone.spd}</div>
                          </div>
                          <div>
                            <div className="fl">MISSION</div>
                            <div className="text-[11px] text-[var(--am)] font-bold">{drone.mission}</div>
                            <div className="text-[9px] text-[var(--txd)]">PROGRESS: {drone.status === 'ACTIVE' ? '45%' : '0%'}</div>
                          </div>
                          <div>
                            <div className="fl">BATTERY</div>
                            <div className="flex items-center gap-2">
                              <div className="flex-1 h-2 bg-black/40 border border-[var(--bdr)] rounded-full overflow-hidden">
                                <div 
                                  className={`h-full ${drone.batt > 50 ? 'bg-[var(--g)]' : drone.batt > 20 ? 'bg-[var(--am)]' : 'bg-[var(--rd)]'}`} 
                                  style={{ width: `${drone.batt}%` }}
                                ></div>
                              </div>
                              <span className="text-[10px] w-8">{drone.batt}%</span>
                            </div>
                          </div>
                          <div>
                            <div className="fl">SIGNAL</div>
                            <div className="flex items-center gap-1">
                              {[1, 2, 3, 4].map(i => (
                                <div 
                                  key={i} 
                                  className={`w-1 rounded-full ${drone.signal >= i * 25 ? 'bg-[var(--bl)]' : 'bg-white/10'}`}
                                  style={{ height: `${i * 3}px` }}
                                ></div>
                              ))}
                              <span className="text-[10px] ml-1">{drone.signal}%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>

                  <div className="space-y-4">
                    <div className="pn">
                      <div className="pnh"><span className="pnt">📡 Fleet Telemetry</span></div>
                      <div className="pnb space-y-3">
                        <div className="flex justify-between text-[10px]">
                          <span className="text-[var(--txd)]">UPLINK STATUS</span>
                          <span className="text-[var(--g)]">ENCRYPTED</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-[var(--txd)]">DATA RATE</span>
                          <span>450 Mbps</span>
                        </div>
                        <div className="flex justify-between text-[10px]">
                          <span className="text-[var(--txd)]">ACTIVE LINKS</span>
                          <span>{fleet.filter(d => d.signal > 0).length} / {fleet.length}</span>
                        </div>
                        <div className="h-[100px] border border-[var(--bdr)] bg-black/40 relative overflow-hidden">
                          <div className="absolute inset-0 flex items-center justify-around opacity-20">
                            {[...Array(10)].map((_, i) => (
                              <div key={i} className="w-[1px] bg-[var(--g)]" style={{ height: `${Math.random() * 100}%` }}></div>
                            ))}
                          </div>
                          <div className="absolute inset-0 flex items-center justify-center text-[8px] text-[var(--g)] animate-pulse">LIVE STREAMING...</div>
                        </div>
                      </div>
                    </div>

                    <div className="pn">
                      <div className="pnh"><span className="pnt">📋 Maintenance Log</span></div>
                      <div className="pnb text-[10px] space-y-2 max-h-[200px] overflow-y-auto">
                        <div className="border-l-2 border-[var(--am)] pl-2 py-1 bg-white/5">
                          <div className="text-[var(--am)] font-bold">DRN-03: LOW BATTERY</div>
                          <div className="text-[9px] opacity-70">Automatic RTB initiated at 01:45:12</div>
                        </div>
                        <div className="border-l-2 border-[var(--rd)] pl-2 py-1 bg-white/5">
                          <div className="text-[var(--rd)] font-bold">DRN-04: OFFLINE</div>
                          <div className="text-[9px] opacity-70">Motor failure detected. Scheduled for repair.</div>
                        </div>
                        <div className="border-l-2 border-[var(--g)] pl-2 py-1 bg-white/5">
                          <div className="text-[var(--g)] font-bold">DRN-01: MISSION START</div>
                          <div className="text-[9px] opacity-70">Patrol route A-12 confirmed.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {activePage === 'devices' && (
              <div id="pg-devices" className="pg active">
                <div className="ph">
                  <div><div className="pt">DETECTED DEVICES</div><div className="psub">ALL TRACKED ENTITIES — LIVE SENSOR DATA</div></div>
                  <div className="flex gap-2">
                    <button className="btn bg" onClick={() => window.scanNow?.()}>⊕ SCAN NOW</button>
                    <button className="btn bb" onClick={() => window.exportCSV?.()}>↓ EXPORT CSV</button>
                    <button className="btn bg" onClick={() => window.open('/api/telemetry/export?format=csv', '_blank')}>↓ TELEMETRY LOG</button>
                  </div>
                </div>
                <div className="pn">
                  <div className="pnh"><span className="pnt">⊕ Contact List</span><span className="text-[10px] text-[var(--txd)]" id="dcnt">10 CONTACTS</span></div>
                  <div className="overflow-x-auto">
                    <table className="dt w-full">
                      <thead>
                        <tr>
                          <th>ID</th><th>SIGNAL TYPE</th><th>STRENGTH</th><th>LOCATION</th><th>BRG</th><th>RNG</th><th>SPEED</th><th>STATUS</th><th>ACTIONS</th>
                        </tr>
                      </thead>
                      <tbody id="dtbody">
                        {/* Populated by JS */}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}

            {activePage === 'camera' && (
              <div id="pg-camera" className="pg active">
                <div className="ph">
                  <div><div className="pt">CAMERA AR</div><div className="psub">AUGMENTED REALITY DRONE OPTICS</div></div>
                  <div className="flex gap-2">
                    <select 
                      className="fsel py-1 px-4" 
                      value={selectedDrone || ''} 
                      onChange={(e) => setSelectedDrone(e.target.value || null)}
                    >
                      <option value="">SELECT DRONE</option>
                      {fleet.map(d => (
                        <option key={d.id} value={d.id}>{d.id} ({d.status})</option>
                      ))}
                    </select>
                  </div>
                </div>
                <div className="pn h-[60vh]">
                  <div className="pnh flex justify-between items-center">
                    <span className="pnt">LIVE OPTICS: {selectedDrone || 'STANDBY'}</span>
                    {selectedDrone && (
                      <div className="flex gap-3 text-[10px]">
                        <span className="text-[var(--g)]">BATT: {fleet.find(d => d.id === selectedDrone)?.batt}%</span>
                        <span className="text-[var(--bl)]">SIG: {fleet.find(d => d.id === selectedDrone)?.signal}%</span>
                      </div>
                    )}
                  </div>
                  <div className="pnb h-full p-0">
                    <DroneCamera droneId={selectedDrone} fleet={fleet} />
                  </div>
                </div>
              </div>
            )}

            {activePage === 'telemetry' && (
              <TelemetryPage />
            )}

            {/* Other pages would follow the same pattern... */}
            {activePage !== 'dashboard' && activePage !== 'mission' && activePage !== 'fleet' && activePage !== 'devices' && activePage !== 'missile' && activePage !== 'fighterjet' && activePage !== 'drone' && activePage !== 'flightradar' && activePage !== 'shipradar' && activePage !== 'camera' && activePage !== 'telemetry' && (
              <div className="flex flex-col items-center justify-center h-[60vh] opacity-50">
                <div className="text-4xl mb-4">⚙</div>
                <div className="text-xl font-bold uppercase tracking-widest">{activePage} INTERFACE</div>
                <div className="text-sm mt-2">Module initialization in progress...</div>
                <button className="btn bg mt-6" onClick={() => setActivePage('dashboard')}>Return to Dashboard</button>
              </div>
            )}

            {/* Command Console Section */}
            <div className="pn mt-8 mb-4">
              <div className="pnh">
                <span className="pnt">⌨ AEGIS COMMAND CONSOLE</span>
                <div className="flex gap-2">
                  <button className="btn py-1 px-2 text-[8px] bg-black/40 border border-[var(--bdr)] hover:border-[var(--g)]" onClick={() => { setCommand('help'); }}>HELP</button>
                  <button className="btn py-1 px-2 text-[8px] bg-black/40 border border-[var(--bdr)] hover:border-[var(--rd)] text-[var(--rd)]" onClick={() => { setCommand('clear'); }}>CLEAR</button>
                </div>
              </div>
              <div className="pnb p-0">
                <div id="syslog" className="log h-[160px] border-none bg-black/60 scrollbar-thin scrollbar-thumb-[var(--bdr)]">
                  <div className="ll"><span className="lt">00:00:00</span><span className="lm i">AEGIS COMMAND SYSTEM INITIALIZED. TYPE 'HELP' FOR COMMANDS.</span></div>
                </div>
                <form onSubmit={handleCommand} className="flex border-t border-[var(--bdr)] bg-[#051208]">
                  <div className="flex items-center px-4 text-[var(--g)] font-bold text-[14px] animate-pulse">_</div>
                  <input 
                    type="text" 
                    className="fi border-none flex-1 py-4 text-[13px] bg-transparent focus:ring-0" 
                    placeholder="ENTER COMMAND..."
                    value={command}
                    onChange={(e) => setCommand(e.target.value)}
                    autoFocus
                  />
                  <button type="submit" className="px-6 bg-[var(--gk)] text-[var(--g)] border-l border-[var(--bdr)] hover:bg-[var(--g)] hover:text-black transition-colors font-bold">EXECUTE</button>
                </form>
              </div>
              <div className="flex gap-2 p-2 bg-black/20 border-t border-[var(--bdr)] overflow-x-auto">
                <span className="text-[9px] text-[var(--txd)] self-center mr-2">QUICK:</span>
                <button className="btn py-1 px-2 text-[8px] bg-black/40 border border-[var(--bdr)]" onClick={() => { setCommand('scan'); }}>SCAN</button>
                <button className="btn py-1 px-2 text-[8px] bg-black/40 border border-[var(--bdr)]" onClick={() => { setCommand('radar active'); }}>RADAR:ACT</button>
                <button className="btn py-1 px-2 text-[8px] bg-black/40 border border-[var(--bdr)]" onClick={() => { setCommand('radar passive'); }}>RADAR:PAS</button>
                <button className="btn py-1 px-2 text-[8px] bg-black/40 border border-[var(--bdr)]" onClick={() => { setCommand('diag'); }}>DIAG</button>
                <button className="btn py-1 px-2 text-[8px] bg-black/40 border border-[var(--bdr)] text-[var(--am)]" onClick={() => { setCommand('alert SYSTEM_CHECK'); }}>ALERT</button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Mobile Nav */}
      <div id="mobile-nav" className="flex md:hidden overflow-x-auto">
        <button className={`mn-btn ${activePage === 'dashboard' ? 'active' : ''}`} onClick={() => setActivePage('dashboard')}>
          <span className="mn-ic">◈</span>DASH
        </button>
        <button className={`mn-btn ${activePage === 'devices' ? 'active' : ''}`} onClick={() => setActivePage('devices')}>
          <span className="mn-ic">⊕</span>SCAN
        </button>
        <button className={`mn-btn ${activePage === 'missile' ? 'active' : ''}`} onClick={() => setActivePage('missile')}>
          <span className="mn-ic">⚡</span>MSL
        </button>
        <button className={`mn-btn ${activePage === 'fighterjet' ? 'active' : ''}`} onClick={() => setActivePage('fighterjet')}>
          <span className="mn-ic">✈</span>JET
        </button>
        <button className={`mn-btn ${activePage === 'fleet' ? 'active' : ''}`} onClick={() => setActivePage('fleet')}>
          <span className="mn-ic">📊</span>FLT
        </button>
        <button className={`mn-btn ${activePage === 'drone' ? 'active' : ''}`} onClick={() => setActivePage('drone')}>
          <span className="mn-ic">🚁</span>UAV
        </button>
        <button className={`mn-btn ${activePage === 'camera' ? 'active' : ''}`} onClick={() => setActivePage('camera')}>
          <span className="mn-ic">📷</span>CAM
        </button>
        <button className={`mn-btn ${activePage === 'telemetry' ? 'active' : ''}`} onClick={() => setActivePage('telemetry')}>
          <span className="mn-ic">📊</span>LOG
        </button>
      </div>
    </div>
  );
}
