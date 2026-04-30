const SQEngine = (() => {
  // ── theme toggle ───────────────────────────────────────────────────────────
  function initTheme() {
    const btn = document.getElementById("btn-theme");
    if (!btn) return;
    btn.textContent =
      document.documentElement.getAttribute("data-theme") === "light"
        ? "☾"
        : "☀";
    btn.addEventListener("click", () => {
      const isLight =
        document.documentElement.getAttribute("data-theme") === "light";
      const next = isLight ? "dark" : "light";
      document.documentElement.setAttribute("data-theme", next);
      localStorage.setItem("sq-theme", next);
      btn.textContent = isLight ? "☀" : "☾";
    });
  }

  // ── canvas coordinate conversion ───────────────────────────────────────────
  // Returns a function that maps client (viewport) coords → canvas logical coords,
  // accounting for CSS scaling when the canvas is displayed smaller than its
  // internal resolution.
  function makeToCanvas(canvas, W, H) {
    return function (cx, cy) {
      const r = canvas.getBoundingClientRect();
      return {
        x: (cx - r.left) * (W / r.width),
        y: (cy - r.top) * (H / r.height),
      };
    };
  }

  // ── fps tracker ────────────────────────────────────────────────────────────
  // Uses a rolling window of timestamps for accurate, smooth fps measurement —
  // avoids the sawtooth discontinuity of the "reset every 500ms" bucket approach.
  //
  // If `canvas` is provided, a small overlay graph is injected into the corner
  // of the canvas showing fps history as a line chart.
  //
  // Returns a tick(ts) function that:
  //   - accepts the requestAnimationFrame timestamp
  //   - returns the raw frame delta (ms) for use as dt
  //   - updates the text element and overlay graph automatically
  function createFpsTracker(fpsEl, canvas) {
    const SMOOTH = 30; // rolling window size for fps calculation (~0.5s at 60fps)
    const HIST_LEN = 120; // graph history samples (120px wide = ~2s at 60fps)
    const MAX_FPS = 75; // y-axis ceiling for the graph

    const tsSamples = [];
    const fpsHistory = [];
    let lastTs = 0;
    let lastDisplayTs = 0;
    let graphCtx = null;

    if (canvas) {
      const wrap = _wrapCanvas(canvas);
      const gc = document.createElement("canvas");
      gc.width = HIST_LEN;
      gc.height = 48;
      gc.className = "sq-fps-graph";
      wrap.appendChild(gc);
      graphCtx = gc.getContext("2d");
    }

    return function tick(ts) {
      const dt = lastTs ? ts - lastTs : 0;
      lastTs = ts;

      tsSamples.push(ts);
      if (tsSamples.length > SMOOTH) tsSamples.shift();

      let fps = 0;
      if (tsSamples.length >= 2) {
        const elapsed = tsSamples[tsSamples.length - 1] - tsSamples[0];
        fps = (tsSamples.length - 1) / (elapsed / 1000);
      }

      fpsHistory.push(fps);
      if (fpsHistory.length > HIST_LEN) fpsHistory.shift();

      if (fpsEl && ts - lastDisplayTs >= 500) {
        lastDisplayTs = ts;
        fpsEl.textContent = Math.round(fps);
      }

      if (graphCtx) _drawFpsGraph(graphCtx, fpsHistory, MAX_FPS);

      return dt;
    };
  }

  // ── draw helpers ──────────────────────────────────────────────────────────
  function drawBox(ctx, box, color) {
    ctx.strokeStyle = color;
    ctx.strokeRect(box.x, box.y, box.width, box.height);
  }

  function drawCircle(ctx, circle, color) {
    ctx.strokeStyle = color;
    ctx.beginPath();
    ctx.arc(circle.x, circle.y, circle.r, 0, Math.PI * 2);
    ctx.stroke();
  }

  // ── screen wrap ────────────────────────────────────────────────────────────
  // Teleports an entity to the opposite edge when it exits the canvas.
  // Works with circle entities (uses .r) and box entities (uses .width/.height).
  function screenWrap(entity, W, H) {
    const hw = entity.r ?? entity.width  ?? 0;
    const hh = entity.r ?? entity.height ?? 0;
    if      (entity.x < -hw)    entity.x += W + hw * 2;
    else if (entity.x > W + hw) entity.x -= W + hw * 2;
    if      (entity.y < -hh)    entity.y += H + hh * 2;
    else if (entity.y > H + hh) entity.y -= H + hh * 2;
  }

  // ── touch joystick ────────────────────────────────────────────────────────
  // Wires up a virtual joystick from existing pad/knob DOM elements.
  // Returns a live { dx, dy } direction object (values normalized -1 to 1).
  //
  // Usage:
  //   const dir = SQEngine.createTouchJoystick(
  //     document.getElementById("joystick-pad"),
  //     document.getElementById("joystick-knob")
  //   );
  //   // In update: entity.x += dir.dx * speed * dt;
  function createTouchJoystick(padEl, knobEl) {
    const dir = { dx: 0, dy: 0 };
    let active = false;

    function apply(touch) {
      const rect = padEl.getBoundingClientRect();
      const MAX  = rect.width / 2;
      const tx   = Math.max(-MAX, Math.min(MAX, touch.clientX - (rect.left + MAX)));
      const ty   = Math.max(-MAX, Math.min(MAX, touch.clientY - (rect.top  + MAX)));
      dir.dx = tx / MAX;
      dir.dy = ty / MAX;
      knobEl.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px))`;
    }

    function reset() {
      active = false;
      dir.dx = 0;
      dir.dy = 0;
      knobEl.style.transform = "translate(-50%, -50%)";
    }

    padEl.addEventListener("touchstart",  e => { active = true; apply(e.changedTouches[0]); }, { passive: true });
    padEl.addEventListener("touchmove",   e => { if (active) apply(e.changedTouches[0]); },   { passive: true });
    padEl.addEventListener("touchend",    reset);
    padEl.addEventListener("touchcancel", reset);

    return dir;
  }

  // ── internals ──────────────────────────────────────────────────────────────
  function _wrapCanvas(canvas) {
    if (
      canvas.parentElement &&
      canvas.parentElement.classList.contains("sq-wrap")
    ) {
      return canvas.parentElement;
    }
    const wrap = document.createElement("div");
    wrap.className = "sq-wrap";
    canvas.parentNode.insertBefore(wrap, canvas);
    wrap.appendChild(canvas);
    return wrap;
  }

  function _drawFpsGraph(ctx, history, maxFps) {
    const W = ctx.canvas.width;
    const H = ctx.canvas.height;
    const isLight =
      document.documentElement.getAttribute("data-theme") === "light";

    ctx.clearRect(0, 0, W, H);
    ctx.fillStyle = isLight ? "rgba(255,255,255,0.88)" : "rgba(0,0,0,0.62)";
    ctx.fillRect(0, 0, W, H);

    if (history.length < 2) return;

    // 60 fps reference line
    const y60 = H - (60 / maxFps) * H;
    ctx.strokeStyle = isLight ? "rgba(0,160,0,0.28)" : "rgba(0,220,0,0.3)";
    ctx.lineWidth = 0.5;
    ctx.setLineDash([2, 2]);
    ctx.beginPath();
    ctx.moveTo(0, y60);
    ctx.lineTo(W, y60);
    ctx.stroke();
    ctx.setLineDash([]);

    const latest = history[history.length - 1];
    const good = latest >= 50;
    const ok = latest >= 30;
    const lineC = good ? "#44cc77" : ok ? "#ccaa22" : "#cc3333";
    const fillC = good
      ? "rgba(68,204,119,0.18)"
      : ok
        ? "rgba(204,170,34,0.18)"
        : "rgba(204,51,51,0.18)";

    const startX = Math.max(0, W - history.length);

    // filled area under the curve
    ctx.fillStyle = fillC;
    ctx.beginPath();
    ctx.moveTo(startX, H);
    for (let i = 0; i < history.length; i++) {
      ctx.lineTo(startX + i, H - Math.min(history[i] / maxFps, 1) * H);
    }
    ctx.lineTo(startX + history.length - 1, H);
    ctx.closePath();
    ctx.fill();

    // fps line
    ctx.strokeStyle = lineC;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    for (let i = 0; i < history.length; i++) {
      const y = H - Math.min(history[i] / maxFps, 1) * H;
      if (i === 0) ctx.moveTo(startX + i, y);
      else ctx.lineTo(startX + i, y);
    }
    ctx.stroke();

    // current fps label
    ctx.fillStyle = isLight ? "rgba(0,0,0,0.45)" : "rgba(255,255,255,0.55)";
    ctx.font = "24px monospace";
    ctx.textAlign = "right";
    ctx.fillText(Math.round(latest), W - 3, H - 3);
  }

  return { initTheme, makeToCanvas, createFpsTracker, drawBox, drawCircle, screenWrap, createTouchJoystick };
})();
