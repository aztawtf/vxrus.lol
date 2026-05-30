import { useEffect, useRef, useState } from 'react';

/* ─────────────────────────────────────────────────────────────
   Particle system (Falling Snow)
───────────────────────────────────────────────────────────── */
interface SnowFlake {
  x: number; y: number; r: number;
  vx: number; vy: number;
  opacity: number;
}

function useSnow(canvasRef: React.RefObject<HTMLCanvasElement | null>) {
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const resize = () => { canvas.width = window.innerWidth; canvas.height = window.innerHeight; };
    resize();
    window.addEventListener('resize', resize);

    const flakes: SnowFlake[] = Array.from({ length: 150 }, () => ({
      x: Math.random() * window.innerWidth,
      y: Math.random() * window.innerHeight,
      r: Math.random() * 1.5 + 0.5,
      vx: (Math.random() - 0.5) * 0.5, // Slight side drift
      vy: Math.random() * 1.5 + 0.8,   // Falling speed
      opacity: Math.random() * 0.5 + 0.2,
    }));

    let raf: number;
    const draw = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.fillStyle = '#ffffff';
      
      for (const f of flakes) {
        f.x += f.vx;
        f.y += f.vy;
        
        if (f.y > canvas.height) {
          f.y = -10;
          f.x = Math.random() * canvas.width;
        }
        if (f.x > canvas.width) f.x = 0;
        if (f.x < 0) f.x = canvas.width;

        ctx.globalAlpha = f.opacity;
        ctx.beginPath();
        ctx.arc(f.x, f.y, f.r, 0, Math.PI * 2);
        ctx.fill();
      }
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', resize); };
  }, [canvasRef]);
}

/* ─────────────────────────────────────────────────────────────
   Main App Component
───────────────────────────────────────────────────────── */
export default function App() {
  const [entered, setEntered] = useState(false);
  const [splashOut, setSplashOut] = useState(false);
  const [visitorCount, setVisitorCount] = useState<number>(0);
  const [lanyard, setLanyard] = useState<any>(null);
  const [showToast, setShowToast] = useState(false);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const cursorDotRef = useRef<HTMLDivElement>(null);
  const cursorRingRef = useRef<HTMLDivElement>(null);
  const bgRef = useRef<HTMLDivElement>(null);

  useSnow(canvasRef);

  // Lanyard WebSocket for Real-time Updates
  useEffect(() => {
    const userId = '571168536823595009';
    let socket: WebSocket;

    const connect = () => {
      socket = new WebSocket('wss://api.lanyard.rest/socket');
      
      socket.onopen = () => {
        socket.send(JSON.stringify({
          op: 2,
          d: { subscribe_to_id: userId }
        }));
      };

      socket.onmessage = (event) => {
        const { op, t, d } = JSON.parse(event.data);
        if (op === 1) { // Hello
          setInterval(() => socket.send(JSON.stringify({ op: 3 })), d.heartbeat_interval);
        }
        if (t === 'INIT_STATE' || t === 'PRESENCE_UPDATE') {
          setLanyard(d);
        }
      };

      socket.onclose = () => setTimeout(connect, 3000);
    };

    connect();
    return () => socket?.close();
  }, []);

  // Visitor Counter (Force update on every mount)
  useEffect(() => {
    const BASE_VAL = 1432;
    try {
      const stored = localStorage.getItem('vx_visit_force_v1');
      const count = stored ? parseInt(stored) + 1 : BASE_VAL;
      localStorage.setItem('vx_visit_force_v1', count.toString());
      setVisitorCount(count);
    } catch (e) {
      setVisitorCount(BASE_VAL);
    }
  }, []);

  const copyDiscord = () => {
    navigator.clipboard.writeText('vvxrus');
    setShowToast(true);
    setTimeout(() => setShowToast(false), 2000);
  };

  // Global Mouse Parallax & 3D Tilt
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const bg = bgRef.current;
      if (bg) {
        const x = (e.clientX / window.innerWidth - 0.5) * 20;
        const y = (e.clientY / window.innerHeight - 0.5) * 20;
        bg.style.transform = `scale(1.1) translate(${x * -0.5}px, ${y * -0.5}px)`;
      }

      const main = document.querySelector('.main-content') as HTMLElement;
      if (main && entered) {
        const xRot = (e.clientY / window.innerHeight - 0.5) * -8;
        const yRot = (e.clientX / window.innerWidth - 0.5) * 8;
        main.style.transform = `perspective(1200px) rotateX(${xRot}deg) rotateY(${yRot}deg)`;
      }

      const dot = cursorDotRef.current;
      const ring = cursorRingRef.current;
      if (dot) { dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; }
      if (ring) {
        const targetX = e.clientX;
        const targetY = e.clientY;
        ring.animate([{ left: ring.style.left, top: ring.style.top }, { left: targetX + 'px', top: targetY + 'px' }], { duration: 150, fill: 'forwards' });
      }
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, [entered]);

  const handleCardTilt = (e: React.MouseEvent<HTMLElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = (y - centerY) / 8;
    const rotateY = (centerX - x) / 8;
    card.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale3d(1.03, 1.03, 1.03)`;
  };

  const resetCardTilt = (e: React.MouseEvent<HTMLElement>) => {
    e.currentTarget.style.transform = `perspective(1000px) rotateX(0deg) rotateY(0deg) scale3d(1, 1, 1)`;
  };



  const startEnter = () => {
    setSplashOut(true);
    setTimeout(() => setEntered(true), 1000); // Safer than onTransitionEnd
  };

  return (
    <div className="app-container">
      <style>{CSS}</style>

      <div className="cursor-dot" ref={cursorDotRef} />
      <div className="cursor-ring" ref={cursorRingRef} />

      <div className="bg-parallax" ref={bgRef} />
      <div className="bg-overlay" />
      <canvas ref={canvasRef} className="particles-canvas" />

      {/* ── SPLASH ── */}
      {!entered && (
        <div className={`splash ${splashOut ? 'fade-out' : ''}`} onClick={startEnter}>
          <div className="splash-name-wrap">
            <h1 className="splash-name-clean">
              vxrus.lol
            </h1>
            <div className="splash-sub">CLICK TO ENTER</div>
          </div>
        </div>
      )}

      {/* ── TOAST ── */}
      <div className={`global-toast ${showToast ? 'show' : ''}`}>COPIED DISCORD TAG</div>

      {/* ── MAIN ── */}
      {entered && (
        <div className="main-wrapper">
          <div className="main-content">
            
            {/* Left Col: Bio */}
            <div className="col col-left">
              <div className="section-header">
                <span className="bracket">[</span> ABOUT <span className="bracket">]</span>
              </div>
              
              <div className="profile-box tilt-card" onMouseMove={handleCardTilt} onMouseLeave={resetCardTilt}>
                <div className="avatar-wrap">
                  <img src="/assets/avatar.png" className="avatar-img" alt="vxrus" />
                </div>
                <div className="profile-info">
                  <div className="profile-name-row">
                    <h2 className="profile-name">VXRUS</h2>
                    <div className={`status-dot-new ${lanyard?.discord_status || 'offline'}`} title={lanyard?.discord_status || 'offline'} />
                  </div>
                  <p className="profile-desc">i do stuff.</p>
                </div>
              </div>
            </div>

            {/* Right Col: Links */}
            <div className="col col-right">
              <div className="section-header">
                <span className="bracket">[</span> SOCIALS <span className="bracket">]</span>
              </div>

              <div className="links-list">
                <a href="https://www.tiktok.com/@vxruswtw" target="_blank" className="link-item tilt-card" onMouseMove={handleCardTilt} onMouseLeave={resetCardTilt}>
                  <span className="link-num">01</span>
                  <span className="link-text">TIKTOK</span>
                  <span className="link-handle">@vxruswtw</span>
                  <span className="link-arrow">→</span>
                </a>
                <a href="https://www.youtube.com/@vxrusdev" target="_blank" className="link-item tilt-card" onMouseMove={handleCardTilt} onMouseLeave={resetCardTilt}>
                  <span className="link-num">02</span>
                  <span className="link-text">YOUTUBE</span>
                  <span className="link-handle">@vxrusdev</span>
                  <span className="link-arrow">→</span>
                </a>
                <div className="link-item pointer tilt-card" onClick={copyDiscord} onMouseMove={handleCardTilt} onMouseLeave={resetCardTilt}>
                  <span className="link-num">03</span>
                  <span className="link-text">DISCORD</span>
                  <span className="link-handle">vvxrus</span>
                  <span className="link-arrow">⧉</span>
                </div>
              </div>

              <div className="audio-player-v2 tilt-card" onMouseMove={handleCardTilt} onMouseLeave={resetCardTilt}>
                {lanyard?.listening_to_spotify ? (
                  <a href={`https://open.spotify.com/track/${lanyard.spotify.track_id}`} target="_blank" className="spotify-link">
                    <img src={lanyard.spotify.album_art_url} className="spotify-album" alt="album art" />
                    <div className="audio-meta">
                      <div className="audio-artist-label">LISTENING TO {lanyard.spotify.artist.toUpperCase()}</div>
                      <div className="audio-song-name">{lanyard.spotify.song}</div>
                    </div>
                  </a>
                ) : (
                  <div className="spotify-link">
                    <div className="audio-meta">
                      <div className="audio-artist-label">LISTENING TO NOTHING</div>
                    </div>
                  </div>
                )}
                <div className="audio-visual">
                  {lanyard?.listening_to_spotify && [...Array(10)].map((_, i) => (
                    <div key={i} className="audio-bar" style={{ animationDelay: `${i * 0.1}s` }} />
                  ))}
                </div>
              </div>
            </div>

          </div>

          <div className="corner corner-br">Visits: {visitorCount.toLocaleString()}</div>
        </div>
      )}
    </div>
  );
}

const CSS = `
@import url('https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=UnifrakturMaguntia&family=Inter:wght@300;500;900&display=swap');

:root {
  --black: #050505;
  --dark: #0a0a0a;
  --accent: #ffffff;
  --dim: #444;
  --text: #888;
  --white: #eee;
  --border: rgba(255, 255, 255, 0.08);
}

* { box-sizing: border-box; margin: 0; padding: 0; cursor: none !important; }

body {
  background: var(--black);
  color: var(--white);
  font-family: 'Space Mono', monospace;
  overflow: hidden;
  height: 100vh;
}



.app-container { height: 100vh; width: 100vw; position: relative; overflow: hidden; }

.cursor-dot {
  position: fixed; width: 4px; height: 4px; background: #fff;
  border-radius: 50%; pointer-events: none; z-index: 9999;
  transform: translate(-50%, -50%);
}
.cursor-ring {
  position: fixed; width: 26px; height: 26px; border: 1px solid rgba(255,255,255,0.2);
  border-radius: 50%; pointer-events: none; z-index: 9998;
  transform: translate(-50%, -50%);
}

.bg-parallax {
  position: fixed; inset: -40px;
  background: url('/assets/bg.png') center/cover no-repeat;
  filter: brightness(0.2) contrast(1.1);
  z-index: -2;
}
.bg-overlay {
  position: fixed; inset: 0;
  background: radial-gradient(circle at center, transparent, rgba(0,0,0,0.9));
  z-index: -1;
}
.particles-canvas { position: fixed; inset: 0; z-index: 0; pointer-events: none; }

.splash {
  position: fixed; inset: 0; z-index: 100;
  display: flex; align-items: center; justify-content: center;
  background: var(--black);
  transition: opacity 1s cubic-bezier(0.7, 0, 0.3, 1), transform 1s;
}
.splash.fade-out { opacity: 0; transform: scale(1.05); pointer-events: none; }

.splash-name-wrap { 
  text-align: center; 
  display: flex; 
  flex-direction: column; 
  align-items: center; 
}

.splash-name-clean {
  font-size: clamp(3rem, 12vw, 8rem);
  letter-spacing: -0.05em;
  line-height: 1;
  user-select: none;
  font-family: 'Inter', sans-serif;
  font-weight: 900;
  color: #fff;
  text-transform: lowercase;
  text-shadow: none !important;
}

.splash-sub {
  font-size: 0.65rem; color: var(--dim); letter-spacing: 0.5em; margin-top: 1.5rem;
  text-align: center; text-transform: uppercase; animation: pulse 2s infinite;
}

.main-wrapper {
  position: relative; z-index: 1; min-height: 100vh;
  display: flex; align-items: center; justify-content: center;
  padding: 2rem; opacity: 0; animation: fadeIn 1s 0.2s forwards;
  overflow-y: auto; overflow-x: hidden;
}

.main-content {
  display: grid; grid-template-columns: 1fr 1fr; gap: 3rem;
  max-width: 1000px; width: 100%; transform-style: preserve-3d;
  padding: 2rem 0;
}

.col { display: flex; flex-direction: column; gap: 2rem; min-width: 0; }
.section-header { font-size: 0.6rem; letter-spacing: 0.5em; color: var(--dim); }
.bracket { color: var(--accent); opacity: 0.4; }

.profile-box { 
  display: flex; gap: 1.5rem; align-items: center;
  background: rgba(255,255,255,0.015); padding: 1.2rem;
  border: 1px solid transparent; transition: all 0.4s;
  width: 100%;
}
.profile-box:hover { background: rgba(255,255,255,0.03); border-color: var(--border); }
.avatar-wrap { width: 70px; height: 70px; border-radius: 50%; overflow: hidden; flex-shrink: 0; }
.avatar-img { width: 100%; height: 100%; object-fit: cover; opacity: 0.9; filter: grayscale(0.2); }

.profile-name { font-size: 2.2rem; font-weight: 900; letter-spacing: -0.05em; font-family: 'Inter', sans-serif; }
.profile-desc { font-size: 0.8rem; color: var(--text); }

.profile-name-row { display: flex; align-items: center; gap: 0.8rem; flex-wrap: wrap; }

.status-dot-new {
  width: 8px; height: 8px; border-radius: 50%;
  margin-top: 0.3rem;
}
.status-dot-new.online { background: #3ba55d; box-shadow: 0 0 8px #3ba55d; }
.status-dot-new.idle { background: #faa81a; box-shadow: 0 0 8px #faa81a; }
.status-dot-new.dnd { background: #ed4245; box-shadow: 0 0 8px #ed4245; }
.status-dot-new.offline { background: #747f8d; }

.links-list { display: flex; flex-direction: column; }
.link-item {
  display: flex; align-items: center; gap: 1rem; padding: 0.9rem 0.5rem;
  border-bottom: 1px solid var(--border); text-decoration: none;
  color: var(--text); position: relative; transition: all 0.3s;
}
.link-item:hover { color: var(--white); background: rgba(255,255,255,0.02); }
.link-num { font-size: 0.6rem; color: var(--dim); }
.link-text { font-weight: 700; font-size: 0.85rem; flex: 1; }
.link-handle { font-size: 0.7rem; opacity: 0.4; }
.link-arrow { font-size: 0.7rem; opacity: 0.2; }
.link-item:hover .link-arrow { transform: translateX(3px); opacity: 1; }

.audio-player-v2 {
  background: rgba(255,255,255,0.015); border: 1px solid var(--border);
  padding: 1rem; display: flex; justify-content: space-between; align-items: center;
}
.spotify-link { display: flex; gap: 1rem; align-items: center; text-decoration: none; color: inherit; flex: 1; }
.spotify-album { width: 45px; height: 45px; border-radius: 4px; object-fit: cover; }
.spotify-placeholder { width: 45px; height: 45px; background: var(--dark); border-radius: 4px; display: flex; align-items: center; justify-content: center; color: var(--dim); }
.audio-artist-label { font-size: 0.55rem; font-weight: 700; color: var(--dim); letter-spacing: 0.05em; margin-bottom: 2px; }
.audio-song-name { font-size: 0.8rem; font-weight: 700; color: var(--white); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; max-width: 180px; }
.audio-visual { display: flex; gap: 3px; height: 12px; align-items: flex-end; padding-left: 10px; }
.audio-bar { width: 2px; height: 3px; background: var(--white); opacity: 0.3; animation: audio-bar 0.8s infinite alternate; }

.global-toast {
  position: fixed; top: 2rem; left: 50%; transform: translateX(-50%) translateY(-20px);
  padding: 0.8rem 1.5rem; background: #fff; color: #000;
  font-family: 'Inter', sans-serif; font-weight: 900; font-size: 0.75rem;
  letter-spacing: -0.02em; z-index: 9999; pointer-events: none;
  opacity: 0; transition: all 0.4s cubic-bezier(0.19, 1, 0.22, 1);
}
.global-toast.show { opacity: 1; transform: translateX(-50%) translateY(0); }

.no-select { user-select: none; -webkit-user-select: none; }

.tilt-card { transition: transform 0.1s ease-out; transform-style: preserve-3d; will-change: transform; }

.copy-notif {
  position: absolute; right: 1rem; top: 1rem; font-size: 0.5rem;
  background: #fff; color: #000; padding: 0.15rem 0.4rem; font-weight: 700;
}

.corner { position: fixed; font-size: 0.55rem; color: var(--dim); letter-spacing: 0.2em; z-index: 10; }
.corner-br { bottom: 2rem; right: 2rem; }

@keyframes fadeIn { from { opacity: 0; transform: translateY(5px); } to { opacity: 1; transform: translateY(0); } }
@keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 0.8; } }
@keyframes audio-bar { from { height: 3px; } to { height: 12px; } }

@media (max-width: 900px) {
  .main-content { gap: 2rem; }
}

@media (max-width: 800px) {
  .main-wrapper { align-items: flex-start; padding-top: 4rem; }
  .main-content { grid-template-columns: 1fr; gap: 2.5rem; max-width: 500px; }
  .corner { display: none; }
}

@media (max-width: 480px) {
  .main-wrapper { padding: 1.5rem; padding-top: 3rem; }
  .profile-name { font-size: 1.8rem; }
  .profile-box { flex-direction: column; text-align: center; align-items: center; gap: 1rem; }
  .profile-name-row { justify-content: center; }
  .splash-name-clean { font-size: 18vw; }
}
.pointer { cursor: pointer !important; }
`;
