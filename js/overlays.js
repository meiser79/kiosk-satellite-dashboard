/* Kiosk dashboard: the backdrop. The menu, the room menu and the Show's
 * menu folders open over a dimmed backdrop. One is open at a time; a tap on
 * the backdrop, or a while without a touch, closes it. So does the Spot's
 * menu tab, which points down meanwhile. */
(() => {
  'use strict';
  const K = window.Kiosk;
  const { $ } = K;

  const backdrop = $('backdrop'), handle = $('menu-handle');
  let closeOpen = null, idleTimer = null;   // closes what is open, if something is
  function armIdle() {
    clearTimeout(idleTimer);
    idleTimer = setTimeout(closeOverlay, 12000);
  }
  function dim(close) {
    if (closeOpen && closeOpen !== close) closeOpen();
    closeOpen = close;
    handle.classList.add('open');
    backdrop.hidden = false;
    requestAnimationFrame(() => { if (closeOpen) backdrop.classList.add('show'); });
    armIdle();
  }
  function undim(close) {
    if (closeOpen !== close) return; // something else took the backdrop over
    closeOpen = null;
    clearTimeout(idleTimer);
    handle.classList.remove('open');
    backdrop.classList.remove('show');
    setTimeout(() => { if (!closeOpen) backdrop.hidden = true; }, 300);
  }
  function closeOverlay() { if (closeOpen) closeOpen(); }
  const dimmed = () => !!closeOpen;
  backdrop.addEventListener('pointerdown', closeOverlay);

  Object.assign(K, { armIdle, dim, undim, closeOverlay, dimmed });
})();
