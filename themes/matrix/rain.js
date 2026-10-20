/* Kiosk dashboard, Matrix theme: green code falling behind the rooms. A
 * column of characters every glyph's width, each falling at its own pace:
 * the newest character bright, those behind it green and fading away, here
 * and there one of them changing as it fades, a column starting again from
 * the top once it has left the screen. About
 * twenty steps a second on a canvas the size of the screen; the stylesheet
 * mirrors it, as the film's characters were, and dims it under the rooms. */
(() => {
  'use strict';
  const GLYPHS = 'ｦｱｳｴｵｶｷｹｺｻｼｽｾｿﾀﾂﾃﾅﾆﾇﾈﾊﾋﾎﾏﾐﾑﾒﾓﾔﾕﾗﾘﾜ0123456789:=*+-<>¦|ｸﾁﾄﾉﾌﾍﾖﾙﾚﾛﾝ';
  const STEP = 50;          // milliseconds between two steps
  const FADE = 0.08;        // how much of the trail each step darkens

  window.Kiosk.addScene((host, { still }) => {
    const canvas = host.appendChild(document.createElement('canvas'));
    const ctx = canvas.getContext('2d');
    const glyph = () => GLYPHS[Math.floor(Math.random() * GLYPHS.length)];
    let size, columns;

    // The canvas the size of the layer, a column every glyph, each somewhere above the top.
    function fit() {
      canvas.width = host.clientWidth;
      canvas.height = host.clientHeight;
      size = Math.round(parseFloat(getComputedStyle(document.documentElement).fontSize) * 0.9);
      ctx.font = `${size}px "Kiosk Matrix Glyphs", "Kiosk Share Tech Mono", monospace`;
      ctx.textBaseline = 'top';
      columns = Array.from({ length: Math.ceil(canvas.width / size) }, () => ({ y: -Math.random() * 30, pace: 0.35 + Math.random() * 0.65, row: null }));
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    // One step: everything darkens a little; where a column has reached a
    // new row, the last bright character turns green and a new one comes.
    function step() {
      ctx.fillStyle = `rgba(0, 0, 0, ${FADE})`;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
      columns.forEach((c, i) => {
        c.y += c.pace;
        const row = Math.floor(c.y);
        if (row === c.row) return;
        if (c.row !== null && c.row >= 0) { ctx.fillStyle = '#2bff63'; ctx.fillText(c.last, i * size, c.row * size); }
        c.row = row;
        if (row >= 0) { c.last = glyph(); ctx.fillStyle = '#eaffee'; ctx.fillText(c.last, i * size, row * size); }
        if (row * size > canvas.height && Math.random() < 0.04) { c.y = -Math.random() * 10; c.row = null; }
      });
      // A few characters in the trails change, as faded as the one they replace.
      for (let n = Math.ceil(columns.length / 20); n > 0; n--) {
        const i = Math.floor(Math.random() * columns.length), c = columns[i], back = 2 + Math.floor(Math.random() * 10);
        if (c.row === null || c.row - back < 0) continue;
        ctx.fillStyle = '#000';
        ctx.fillRect(i * size, (c.row - back) * size, size, size);
        ctx.globalAlpha = Math.pow(1 - FADE, back / c.pace);
        ctx.fillStyle = '#2bff63';
        ctx.fillText(glyph(), i * size, (c.row - back) * size);
        ctx.globalAlpha = 1;
      }
    }

    fit();
    if (still) {   // less motion asked for: the rain as it stands after a while, still
      for (let i = 0; i < 90; i++) step();
      return () => canvas.remove();
    }
    const timer = setInterval(step, STEP);
    const resized = new ResizeObserver(() => { if (canvas.width !== host.clientWidth || canvas.height !== host.clientHeight) fit(); });
    resized.observe(host);
    return () => { clearInterval(timer); resized.disconnect(); canvas.remove(); };
  });
})();
