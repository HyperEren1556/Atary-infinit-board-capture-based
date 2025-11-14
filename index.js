import { undo, redo, updateCurrentPlayer, currentPlayer, placeAt } from "./undo-redo.mjs";
import { placedBalls, deadspace, enclosures } from "./detectCapture.mjs";
import { loadPlayers, players } from "./player.mjs";
import { drawAll, screenToWorld, scale, camera, ctx } from "./drawAll.mjs";


//#region logic
(() => {
  //#region === CANVAS & CONTEXT INITIALIZATION ===
  const canvas = document.getElementById('c');
  const ctx = canvas.getContext('2d');
  //#endregion

  //#region === UI ELEMENT REFERENCES ===
  const infoBtn = document.getElementById('infoBtn');
  const popup = document.getElementById('popup');
  const closeInfo = document.getElementById('closeInfo');
  const coordBox = document.getElementById('coordBox');
  //#endregion

  //#region === RESPONSIVE RESIZING FUNCTION ===
  function resize() {
    const dpr = window.devicePixelRatio || 1;
    canvas.width = canvas.clientWidth * dpr;
    canvas.height = canvas.clientHeight * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }
  window.addEventListener('resize', resize);
  resize();
  //#endregion



  // === GAME STATE VARIABLES ===
  const keys = {}; // keyboard state
  const speedUnitsPerSecond = 6; // camera pan speed


  //snipe UNDOSTACK and REDOSTACK
  let hoverSnap = { x: 0, y: 0 }; // hovered grid position (snapped)
  let isPanning = false; // panning flag
  let panLast = null; // last pan mouse position


  // === PLAYER SETTINGS ===
  loadPlayers()
  updateCurrentPlayer()


  //#region === GAME LOOP ===
  let last = performance.now();
  function loop(now) {
    const dt = (now - last) / 1000; last = now;

    // Handle camera keyboard movement
    let dx = 0, dy = 0;
    // Scale keyboard panning so it feels consistent regardless of zoom level
    const panSpeed = speedUnitsPerSecond / (scale);
    if (keys['ArrowLeft'] || keys['a']) dx -= 1;
    if (keys['ArrowRight'] || keys['d']) dx += 1;
    if (keys['ArrowUp'] || keys['w']) dy += 1;
    if (keys['ArrowDown'] || keys['s']) dy -= 1;

    if (dx || dy) {
      const len = Math.hypot(dx, dy) || 1;
      camera.x += (dx / len) * panSpeed * dt;
      camera.y += (dy / len) * panSpeed * dt;
    }

    if (dx || dy) {
      const len = Math.hypot(dx, dy) || 1;
      camera.x += (dx / len) * speedUnitsPerSecond * dt;
      camera.y += (dy / len) * speedUnitsPerSecond * dt;
    }

    drawAll(placedBalls, enclosures, players, hoverSnap, currentPlayer);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
  //#endregion

  //#region === INPUT HANDLERS ===


  window.addEventListener('keydown', e => {
    if (e.ctrlKey && e.key.toLowerCase() === 'z') { undo(placedBalls); e.preventDefault(); return; }
    if (e.ctrlKey && e.key.toLowerCase() === 'y') { redo(placedBalls); e.preventDefault(); return; }
    if (e.key === '+') { zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1.15); e.preventDefault(); }
    if (e.key === '-') { zoomAt(canvas.clientWidth / 2, canvas.clientHeight / 2, 1 / 1.15); e.preventDefault(); }
    if (e.key.toLowerCase() === 'r') { resetView(); e.preventDefault(); }
    keys[e.key] = true;
  });
  window.addEventListener('keyup', e => { keys[e.key] = false; });

  // === ZOOM & PAN ===
  canvas.addEventListener('wheel', e => {
    const delta = -e.deltaY;
    const factor = delta > 0 ? 1.08 : 1 / 1.08;
    zoomAt(e.offsetX, e.offsetY, factor);
    e.preventDefault();
  }, { passive: false });


  function zoomAt(sx, sy, factor) {
    const before = screenToWorld(sx, sy);
    scale *= factor; scale = Math.max(0.08, Math.min(8, scale));
    const after = screenToWorld(sx, sy);
    camera.x += before.x - after.x;
    camera.y += before.y - after.y;
  }

  function resetView() { scale = 1; camera.x = 0; camera.y = 0; }

  // === MOUSE EVENTS ===
  canvas.tabIndex = 0; canvas.style.outline = 'none';
  canvas.addEventListener('contextmenu', e => { e.preventDefault(); });

  canvas.addEventListener('mousedown', e => {
    // Right mouse: start panning
    if (e.button === 2) { isPanning = true; panLast = { x: e.clientX, y: e.clientY }; return; }

    // Left mouse: attempt to place a point
    if (e.button === 0) { const world = screenToWorld(e.offsetX, e.offsetY); placeAt(world, placedBalls, deadspace, players); }
  });

  // Update hover position & handle camera drag
  window.addEventListener('mousemove', e => {
    if (isPanning && panLast) {
      const dx = (e.clientX - panLast.x) / (baseGridPx * scale);
      const dy = (e.clientY - panLast.y) / (baseGridPx * scale);
      camera.x -= dx; camera.y += dy
      panLast = { x: e.clientX, y: e.clientY };
    }
    const w = screenToWorld(e.offsetX, e.offsetY);
    //hoversnap for point placement preview
    hoverSnap.x = Math.round(w.x); hoverSnap.y = Math.round(w.y);
    coordBox.textContent = `x: ${w.x.toFixed(2)}, y: ${w.y.toFixed(2)}, zoom: ${scale.toFixed(2)}`;
  });

  window.addEventListener('mouseup', e => { if (e.button === 2) { isPanning = false; panLast = null; } });

  // === TOUCH GESTURES (Two-finger Pan & Zoom) ===
  let touchState = { active: false, startDist: 0, startScale: 1, startCenter: { x: 0, y: 0 }, startCam: { x: 0, y: 0 } };

  canvas.addEventListener('touchstart', e => {
    if (e.touches.length === 2) {
      e.preventDefault();
      touchState.active = true;
      const [t1, t2] = e.touches;
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      touchState.startDist = Math.hypot(dx, dy);
      touchState.startScale = scale;
      touchState.startCenter = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };
      touchState.startCam = { ...camera };
    }
  }, { passive: false });

  canvas.addEventListener('touchmove', e => {
    if (touchState.active && e.touches.length === 2) {
      e.preventDefault();
      const [t1, t2] = e.touches;
      const dx = t2.clientX - t1.clientX;
      const dy = t2.clientY - t1.clientY;
      const newDist = Math.hypot(dx, dy);
      const zoomFactor = newDist / touchState.startDist;

      // Calculate new zoom
      const newScale = Math.max(0.08, Math.min(8, touchState.startScale * zoomFactor));
      const center = { x: (t1.clientX + t2.clientX) / 2, y: (t1.clientY + t2.clientY) / 2 };

      // Convert to world coordinates for stable panning
      const before = screenToWorld(touchState.startCenter.x, touchState.startCenter.y);
      scale = newScale;
      const after = screenToWorld(center.x, center.y);
      camera.x = touchState.startCam.x + (before.x - after.x);
      camera.y = touchState.startCam.y + (before.y - after.y);
    }
  }, { passive: false });

  canvas.addEventListener('touchend', e => {
    if (e.touches.length < 2) touchState.active = false;
  }, { passive: false });
  //#endregion

  //#region === MODAL INTERACTIONS ===
  infoBtn.addEventListener('click', () => { popup.style.display = 'flex'; });
  closeInfo.addEventListener('click', () => { popup.style.display = 'none'; });
  popup.addEventListener('click', e => { if (e.target === popup) popup.style.display = 'none'; });
  //#endregion

  //#endregion
})();
