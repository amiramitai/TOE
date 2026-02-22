export function init(viewport, controlsEl, hudEl) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%!important;height:100%!important;cursor:grab;';
    viewport.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let W, H, dpr, raf;
    let frameDrag = true;
    let t = 0;
    const GM = 4000, softR = 30, massR = 34;

    /* --- draggable mass position --- */
    let massX, massY, targetX, targetY, dragging = false;
    let cachedRect = null;

    function resize() {
        dpr = window.devicePixelRatio || 1;
        cachedRect = canvas.getBoundingClientRect();
        W = cachedRect.width; H = cachedRect.height;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
        if (!massX) { massX = W * 0.4; massY = H * 0.5; targetX = massX; targetY = massY; }
    }
    resize();

    function getLocalCoords(clientX, clientY) {
        if (!cachedRect) cachedRect = canvas.getBoundingClientRect();
        return { x: clientX - cachedRect.left, y: clientY - cachedRect.top };
    }

    canvas.addEventListener('mousedown', (e) => {
        const p = getLocalCoords(e.clientX, e.clientY);
        if (Math.hypot(p.x - massX, p.y - massY) < massR + 14) { dragging = true; canvas.style.cursor = 'grabbing'; }
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
        const tc = e.touches[0];
        const p = getLocalCoords(tc.clientX, tc.clientY);
        if (Math.hypot(p.x - massX, p.y - massY) < massR + 24) dragging = true;
    }, { passive: false });
    canvas.addEventListener('touchmove', (e) => {
        e.preventDefault();
        if (!dragging) return;
        const tc = e.touches[0];
        const p = getLocalCoords(tc.clientX, tc.clientY);
        targetX = p.x; targetY = p.y;
    }, { passive: false });
    canvas.addEventListener('touchend', () => { dragging = false; canvas.style.cursor = 'grab'; });
    const onScroll = () => { cachedRect = canvas.getBoundingClientRect(); };
    window.addEventListener('scroll', onScroll, { passive: true });

    controlsEl.innerHTML =
        '<button class="ctrl-btn active" id="shap-fd">\u27F3 Frame-Dragging: ON</button>';

    const fdBtn = controlsEl.querySelector('#shap-fd');
    fdBtn.onclick = function() {
        frameDrag = !frameDrag;
        this.textContent = '\u27F3 Frame-Dragging: ' + (frameDrag ? 'ON' : 'OFF');
        this.classList.toggle('active', frameDrag);
    };

    function draw() {
        t += 0.016;

        /* smooth mass movement */
        massX += (targetX - massX) * 0.15;
        massY += (targetY - massY) * 0.15;

        ctx.clearRect(0, 0, W, H);

        const cx = massX, cy = massY;
        const rayY = H * 0.25;

        // Density grid (warped)
        ctx.strokeStyle = 'rgba(26,26,58,0.35)'; ctx.lineWidth = 0.8;
        const gridN = 25;
        for (let i = 0; i <= gridN; i++) {
            for (let j = 0; j <= gridN; j++) {
                const gx = (i / gridN) * W, gy = (j / gridN) * H;
                const dx = gx - cx, dy = gy - cy;
                const r = Math.sqrt(dx * dx + dy * dy + softR * softR);
                const warp = GM / (r * r) * 0.5;
                const wx = gx + dx * warp * 0.01;
                const wy = gy + dy * warp * 0.01;
                if (i < gridN) {
                    const nx = ((i+1) / gridN) * W, ny = gy;
                    const ndx = nx - cx, ndy = ny - cy;
                    const nr = Math.sqrt(ndx*ndx + ndy*ndy + softR*softR);
                    const nw = GM / (nr*nr) * 0.5;
                    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(nx + ndx*nw*0.01, ny + ndy*nw*0.01); ctx.stroke();
                }
                if (j < gridN) {
                    const nx = gx, ny = ((j+1) / gridN) * H;
                    const ndx = nx - cx, ndy = ny - cy;
                    const nr = Math.sqrt(ndx*ndx + ndy*ndy + softR*softR);
                    const nw = GM / (nr*nr) * 0.5;
                    ctx.beginPath(); ctx.moveTo(wx, wy); ctx.lineTo(nx + ndx*nw*0.01, ny + ndy*nw*0.01); ctx.stroke();
                }
            }
        }

        // Mass body — bigger glow + circle
        const mgrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, massR * 4);
        mgrad.addColorStop(0, 'rgba(124,58,237,0.35)');
        mgrad.addColorStop(0.5, 'rgba(124,58,237,0.08)');
        mgrad.addColorStop(1, 'transparent');
        ctx.fillStyle = mgrad;
        ctx.fillRect(cx - massR*4, cy - massR*4, massR*8, massR*8);
        ctx.beginPath(); ctx.arc(cx, cy, massR, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(124,58,237,0.8)'; ctx.fill();
        ctx.strokeStyle = 'rgba(167,139,250,0.6)'; ctx.lineWidth = 2.5; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = 'bold 16px JetBrains Mono'; ctx.textAlign = 'center';
        ctx.fillText('M', cx, cy + 6);

        // Undeflected reference
        ctx.setLineDash([8,8]); ctx.strokeStyle = 'rgba(255,255,255,0.3)'; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.moveTo(0, rayY); ctx.lineTo(W, rayY); ctx.stroke();
        ctx.setLineDash([]);

        // Deflected path
        const pathPts = [];
        let x = 0, y = rayY, vy = 0;
        let tAcc = 0, tFlat = 0;
        const step = 2;
        while (x < W) {
            const dx = x - cx, dy = y - cy;
            const r = Math.sqrt(dx*dx + dy*dy + softR*softR);
            const fdFactor = frameDrag ? 2 : 1;
            const cEff = Math.max(0.15, 1 - fdFactor * GM / (r * 200));
            tAcc += step / (cEff * 200);
            tFlat += step / 200;
            const force = GM * (cy - y) / (r*r*r) * (frameDrag ? 1 : 0.5);
            vy += force * step;
            y += vy * step / 200;
            pathPts.push({x, y, cEff});
            x += step;
        }

        // Draw the deflected guideline
        ctx.strokeStyle = 'rgba(6,255,165,0.9)'; ctx.lineWidth = 2.5;
        ctx.beginPath();
        pathPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();

        // Wave packet — rides ON TOP of the deflected path, perpendicular
        const waveX = (t * 120) % (W + 300) - 150;
        const waveHalfW = 60;
        const waveAmp = 18;

        // Build wave vertices along the path
        const topPts = [], botPts = [];
        for (let wx = waveX - waveHalfW; wx <= waveX + waveHalfW; wx += 2) {
            if (wx < 0 || wx >= W) continue;
            const idx = Math.min(Math.max(Math.floor(wx / step), 0), pathPts.length - 2);
            const p0 = pathPts[idx], p1 = pathPts[idx + 1];
            const frac = (wx - p0.x) / (p1.x - p0.x || 1);
            const py = p0.y + (p1.y - p0.y) * frac;
            const cEff = p0.cEff + (p1.cEff - p0.cEff) * frac;

            // path tangent → normal
            const tang_dx = p1.x - p0.x, tang_dy = p1.y - p0.y;
            const tang_len = Math.sqrt(tang_dx * tang_dx + tang_dy * tang_dy) || 1;
            const nx = -tang_dy / tang_len, ny = tang_dx / tang_len;

            const env = Math.exp(-Math.pow(wx - waveX, 2) / (2 * 22 * 22));
            const freq = 0.3 / Math.max(cEff, 0.2);
            const wave = Math.sin(wx * freq) * env * waveAmp;

            topPts.push({ x: wx + nx * wave, y: py + ny * wave, env, cEff });
            botPts.push({ x: wx - nx * wave * 0.15, y: py - ny * wave * 0.15, env, cEff });
        }

        if (topPts.length > 2) {
            // Filled wavelet body (semi-transparent)
            ctx.beginPath();
            topPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
            for (let i = botPts.length - 1; i >= 0; i--) ctx.lineTo(botPts[i].x, botPts[i].y);
            ctx.closePath();
            ctx.fillStyle = 'rgba(6,255,165,0.18)';
            ctx.fill();

            // Bright wavelet outline on the oscillation side
            ctx.strokeStyle = 'rgba(6,255,165,0.95)'; ctx.lineWidth = 2.5;
            ctx.beginPath();
            topPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
            ctx.stroke();

            // Draw small bright dots at wavelet crests for sparkle
            for (const p of topPts) {
                if (p.env < 0.3) continue;
                const r_c = p.cEff < 0.5 ? 255 : 50;
                const g_c = p.cEff > 0.7 ? 255 : 200;
                ctx.fillStyle = `rgba(${r_c},${g_c},80,${p.env * 0.7})`;
                ctx.beginPath();
                ctx.arc(p.x, p.y, 2.5 * p.env, 0, Math.PI * 2);
                ctx.fill();
            }
        }

        // Info
        const shapiroDelay = (tAcc - tFlat) * 60;
        const deflection = Math.abs(pathPts[pathPts.length-1].y - rayY) / H * 4;
        const impactB_val = Math.abs(rayY - cy) / H * 5;

        hudEl.innerHTML =
            '<div class="hud-card"><div class="hud-label">Shapiro Delay</div><div class="hud-value" style="color:#38bdf8">' + shapiroDelay.toFixed(1) + ' \u00B5s</div><div class="hud-sub">extra travel time</div></div>' +
            '<div class="hud-card"><div class="hud-label">Deflection</div><div class="hud-value" style="color:#38bdf8">' + deflection.toFixed(2) + '"</div><div class="hud-sub">arcseconds</div></div>' +
            '<div class="hud-card"><div class="hud-label">Impact b</div><div class="hud-value" style="color:#38bdf8">' + impactB_val.toFixed(1) + ' R\u2609</div><div class="hud-sub">closest approach</div></div>' +
            '<div class="hud-card"><div class="hud-label">Mode</div><div class="hud-value" style="color:#38bdf8">' + (frameDrag ? 'FULL GR' : 'SCALAR') + '</div><div class="hud-sub">' + (frameDrag ? 'refraction + dragging' : 'refraction only') + '</div></div>';

        raf = requestAnimationFrame(draw);
    }
    draw();

    const onResize = () => resize();
    window.addEventListener('resize', onResize);

    return {
        destroy() {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', onResize);
            window.removeEventListener('scroll', onScroll);
            canvas.remove();
        }
    };
}
