/* Kiosk dashboard, Synthwave theme: behind the rooms, a sky at dusk, a
 * striped sun going down behind dark hills, and a neon grid running toward
 * you, on a canvas the size of the screen. The sky is drawn once (again when
 * the screen changes size), the floor under the horizon up to thirty times a
 * second, and once only when the device asks for less motion. A canvas
 * rather than a grid tilted in 3D by the stylesheet: tilted, the grid has to
 * be many screens large, more than an Echo's graphics memory holds with the
 * rest of the page, which then goes missing. */
(() => {
  'use strict';
  const HORIZON = 0.6;     // of the height, from the top
  const PERIOD = 1200;     // milliseconds for the grid to come one square nearer
  const FRAME = 33;        // milliseconds between two frames, at least
  const NEAR = 3;          // how far the grid's line at the bottom of the screen is, in squares
  const SQUARE = 0.16;     // a square's width at the bottom of the screen, of the short side
  const NEON = 'rgba(255, 56, 170, 0.9)';
  const STARS = [[0.12, 0.14], [0.31, 0.08], [0.58, 0.18], [0.77, 0.06], [0.88, 0.24], [0.44, 0.29], [0.05, 0.33], [0.67, 0.31]];
  const HILLS = [[0, 1], [0, 0.55], [0.07, 0.3], [0.15, 0.62], [0.24, 0.18], [0.34, 0.6], [0.41, 0.42], [0.47, 0.7], [0.55, 0.45], [0.63, 0.75], [0.72, 0.22], [0.82, 0.58], [0.9, 0.32], [1, 0.52], [1, 1]];

  window.Kiosk.addScene((host, { still }) => {
    const canvas = host.appendChild(document.createElement('canvas'));
    const ctx = canvas.getContext('2d');
    const floor = document.createElement('canvas');   // the floor and the lines that run away from you, which stay put
    let w, h, top, vmin, raf = 0, last = 0;

    function fit() {
      w = canvas.width = host.clientWidth;
      h = canvas.height = host.clientHeight;
      top = Math.round(h * HORIZON);
      vmin = Math.min(w, h) / 100;
      drawSky();
      drawFloor();
      drawGrid(0);
    }
    // The sky to the horizon, its stars, the sun with its stripes, the hills.
    function drawSky() {
      const sky = ctx.createLinearGradient(0, 0, 0, h);
      [[0, '#090118'], [0.3, '#1d0645'], [0.47, '#4d1270'], [0.56, '#b52a7c'], [HORIZON, '#ff7a59']].forEach(([at, c]) => sky.addColorStop(at, c));
      ctx.fillStyle = sky;
      ctx.fillRect(0, 0, w, top);
      ctx.save();   // a pink glow over the horizon, wider than high
      ctx.translate(w / 2, top);
      ctx.scale(w * 0.6, h * 0.3);
      const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 1);
      glow.addColorStop(0, 'rgba(255, 90, 140, 0.55)');
      glow.addColorStop(0.7, 'rgba(255, 90, 140, 0)');
      ctx.fillStyle = glow;
      ctx.fillRect(-1, -1, 2, 1);
      ctx.restore();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.85)';
      for (const [x, y] of STARS) { ctx.beginPath(); ctx.arc(x * w, y * h, 0.35 * vmin, 0, 2 * Math.PI); ctx.fill(); }
      // the sun, its lower half cut by stripes that widen as they go down; on the Spot, behind the main light's name, fainter
      const r = 20 * vmin, y0 = top - 30 * vmin;
      const sun = ctx.createLinearGradient(0, y0, 0, y0 + 2 * r);
      [[0, '#fff38a'], [0.35, '#ffb547'], [0.68, '#ff5f86'], [1, '#d41f84']].forEach(([at, c]) => sun.addColorStop(at, c));
      ctx.save();
      ctx.globalAlpha = window.Kiosk.shape === 'round' ? 0.55 : 1;
      ctx.beginPath();
      ctx.arc(w / 2, y0 + r, r, 0, 2 * Math.PI);
      ctx.clip();
      ctx.fillStyle = sun;
      for (const [a, b] of [[0, 0.5], [0.53, 0.6], [0.64, 0.7], [0.75, 0.8], [0.86, 1]]) ctx.fillRect(w / 2 - r, y0 + a * 2 * r, 2 * r, (b - a) * 2 * r);
      ctx.restore();
      const hy = top - 9 * vmin, hh = 9.2 * vmin, hills = ctx.createLinearGradient(0, hy, 0, hy + hh);
      hills.addColorStop(0, '#2a0d4f');
      hills.addColorStop(1, '#12002b');
      ctx.fillStyle = hills;
      ctx.beginPath();
      HILLS.forEach(([x, y]) => ctx.lineTo(x * w, hy + y * hh));
      ctx.fill();
    }
    // The floor, and the grid's lines that run from you to the horizon, each
    // a long thin wedge: wider near you.
    function drawFloor() {
      floor.width = w;
      floor.height = h - top;
      const f = floor.getContext('2d'), deep = h - top, square = SQUARE * Math.min(w, h), line = 0.6 * vmin;
      f.fillStyle = '#12002b';
      f.fillRect(0, 0, w, deep);
      f.fillStyle = NEON;
      const most = Math.ceil((w / 2) * deep / (square * 2 * vmin));   // farther out, they meet the side within the haze
      for (let k = -most; k <= most; k++) {
        const x = w / 2 + k * square;
        f.beginPath(); f.moveTo(w / 2, 0); f.lineTo(x + line / 2, deep); f.lineTo(x - line / 2, deep); f.fill();
      }
    }
    // The floor under the horizon, its lines across coming nearer as `phase`
    // goes from 0 to 1, thinner far away; a haze of pink along the horizon.
    function drawGrid(phase) {
      const deep = h - top;
      ctx.drawImage(floor, 0, top);
      ctx.fillStyle = NEON;
      for (let z = NEAR - phase; ; z++) {
        const y = top + (deep * NEAR) / z, gap = (deep * NEAR) / (z * (z + 1));
        const width = Math.max(0.5, (0.6 * vmin * NEAR) / z);
        ctx.fillRect(0, y - width / 2, w, width);
        if (gap < 1.5) break;
      }
      const haze = ctx.createLinearGradient(0, top, 0, top + 9 * vmin);
      haze.addColorStop(0, '#ff5f9e');
      haze.addColorStop(1.2 / 9, 'rgba(255, 95, 158, 0.35)');
      haze.addColorStop(1, 'rgba(18, 0, 43, 0)');
      ctx.fillStyle = haze;
      ctx.fillRect(0, top, w, 9 * vmin);
    }
    function run(t) {
      raf = requestAnimationFrame(run);
      if (t - last < FRAME) return;
      last = t;
      drawGrid((t % PERIOD) / PERIOD);
    }

    fit();
    if (still) return () => canvas.remove();
    raf = requestAnimationFrame(run);
    const resized = new ResizeObserver(() => { if (canvas.width !== host.clientWidth || canvas.height !== host.clientHeight) fit(); });
    resized.observe(host);
    return () => { cancelAnimationFrame(raf); resized.disconnect(); canvas.remove(); };
  });
})();
