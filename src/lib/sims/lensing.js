export function init(viewport, controlsEl, hudEl) {
  const canvas = document.createElement('canvas');
  canvas.style.cssText = 'position:absolute;inset:0;width:100%!important;height:100%!important;cursor:grab;';
  viewport.appendChild(canvas);
  const ctx = canvas.getContext('2d');
  let W, H, dpr;
  let massX, massY, dragging = false;
  const massRadius = 30;
  let cachedRect = null;
  let raf;
  let targetX, targetY;

  function resize() {
    dpr = window.devicePixelRatio || 1;
    cachedRect = canvas.getBoundingClientRect();
    W = cachedRect.width; H = cachedRect.height;
    canvas.width = W * dpr; canvas.height = H * dpr;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    if (!massX) { massX = W * 0.5; massY = H * 0.5; }
    targetX = massX; targetY = massY;
  }
  resize();

  const onResize = () => resize();
  window.addEventListener('resize', onResize);

  function getLocalCoords(clientX, clientY) {
    if (!cachedRect) cachedRect = canvas.getBoundingClientRect();
    return { x: clientX - cachedRect.left, y: clientY - cachedRect.top };
  }

  canvas.addEventListener('mousedown', (e) => {
    const p = getLocalCoords(e.clientX, e.clientY);
    if (Math.hypot(p.x - massX, p.y - massY) < massRadius + 10) { dragging = true; canvas.style.cursor = 'grabbing'; }
  });
  canvas.addEventListener('mousemove', (e) => {
    if (!dragging) return;
    const p = getLocalCoords(e.clientX, e.clientY);
    targetX = p.x; targetY = p.y;
  });
  canvas.addEventListener('mouseup', () => { dragging = false; canvas.style.cursor = 'grab'; });
  canvas.addEventListener('mouseleave', () => { dragging = false; canvas.style.cursor = 'grab'; });
  canvas.addEventListener('touchstart', (e) => {
    e.preventDefault();
    const t = e.touches[0];
    const p = getLocalCoords(t.clientX, t.clientY);
    if (Math.hypot(p.x - massX, p.y - massY) < massRadius + 20) dragging = true;
  }, { passive: false });
  canvas.addEventListener('touchmove', (e) => {
    e.preventDefault();
    if (!dragging) return;
    const t = e.touches[0];
    const p = getLocalCoords(t.clientX, t.clientY);
    targetX = p.x; targetY = p.y;
  }, { passive: false });
  canvas.addEventListener('touchend', () => dragging = false);

  const onScroll = () => { cachedRect = canvas.getBoundingClientRect(); };
  window.addEventListener('scroll', onScroll, { passive: true });

  function deflect(y0, mx, my, scale) {
    const pts = [];
    const step = 2;
    let x = 0, y = y0, vy = 0;
    const GM = 8000;
    const rMin = 30;
    while (x < W) {
      const dx = x - mx, dy = y - my;
      const r = Math.sqrt(dx * dx + dy * dy + rMin * rMin);
      const force = GM * (my - y) / (r * r * r) * scale;
      vy += force * step;
      y += vy * step / 200;
      pts.push({ x, y });
      x += step;
    }
    return pts;
  }

  function drawLensing() {
    const smoothing = 0.15;
    massX += (targetX - massX) * smoothing;
    massY += (targetY - massY) * smoothing;

    ctx.clearRect(0, 0, W, H);

    ctx.strokeStyle = 'rgba(124,58,237,0.04)';
    ctx.lineWidth = 0.5;
    for (let gx = 0; gx < W; gx += 40) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
    for (let gy = 0; gy < H; gy += 40) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

    const nRays = 10;
    const spacing = H / (nRays + 1);

    for (let i = 1; i <= nRays; i++) {
      const y0 = i * spacing;
      const scalarPts = deflect(y0, massX, massY, 0.5);
      const totalPts  = deflect(y0, massX, massY, 1.0);

      ctx.setLineDash([6, 6]);
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 1;
      ctx.beginPath(); ctx.moveTo(0, y0); ctx.lineTo(W, y0); ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = 'rgba(56,189,248,0.15)';
      ctx.beginPath();
      scalarPts.forEach((p, j) => j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      for (let j = totalPts.length - 1; j >= 0; j--) ctx.lineTo(totalPts[j].x, totalPts[j].y);
      ctx.closePath();
      ctx.fill();

      ctx.strokeStyle = 'rgba(231,111,81,0.95)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      scalarPts.forEach((p, j) => j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();

      ctx.strokeStyle = 'rgba(6,255,165,0.9)';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      totalPts.forEach((p, j) => j === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
      ctx.stroke();
    }

    const grad = ctx.createRadialGradient(massX, massY, 0, massX, massY, massRadius * 3);
    grad.addColorStop(0, 'rgba(124,58,237,0.3)');
    grad.addColorStop(0.5, 'rgba(124,58,237,0.05)');
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.fillRect(massX - massRadius * 3, massY - massRadius * 3, massRadius * 6, massRadius * 6);

    ctx.beginPath();
    ctx.arc(massX, massY, massRadius, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(124,58,237,0.8)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(167,139,250,0.6)';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.fillStyle = '#fff';
    ctx.font = '14px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText('M', massX, massY + 5);

    const b = Math.max(Math.abs(H / 2 - massY), 1);
    const alpha = 4 * 8000 / (b * 200);
    const arcsec = Math.min(alpha * 206265 / 5000, 9.99);
    ctx.fillStyle = 'rgba(6,255,165,0.8)';
    ctx.font = '11px JetBrains Mono';
    ctx.textAlign = 'left';
    ctx.fillText(`α_total ≈ ${arcsec.toFixed(2)}" · 4GM/c²b`, 12, 20);

    raf = requestAnimationFrame(drawLensing);
  }
  drawLensing();

  hudEl.innerHTML =
    '<div class="hud-card"><div class="hud-label">Drag Mass</div><div class="hud-value" style="color:#7c3aed">Interactive</div><div class="hud-sub">move to bend rays</div></div>' +
    '<div class="hud-card"><div class="hud-label">Scalar Refraction</div><div class="hud-value" style="color:#e76f51">½ bend</div><div class="hud-sub">index gradient</div></div>' +
    '<div class="hud-card"><div class="hud-label">Frame-Dragging</div><div class="hud-value" style="color:#38bdf8">½ bend</div><div class="hud-sub">superfluid inflow</div></div>' +
    '<div class="hud-card"><div class="hud-label">Total = GR</div><div class="hud-value">4GM/c²b</div><div class="hud-sub">UHF matches Einstein</div></div>';

  return {
    destroy() {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', onResize);
      window.removeEventListener('scroll', onScroll);
      canvas.remove();
    }
  };
}
