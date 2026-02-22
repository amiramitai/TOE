export function init(viewport, controlsEl, hudEl) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%!important;height:100%!important;';
    viewport.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let W, H, dpr, raf;
    let impactB = 0.5;
    let frameDrag = true;
    let t = 0;
    const GM = 4000, softR = 30, massR = 22;

    function resize() {
        dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        W = rect.width; H = rect.height;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    controlsEl.innerHTML =
        '<span class="ctrl-label">IMPACT b</span>' +
        '<input type="range" class="ctrl-slider" min="0.1" max="1" step="0.01" value="0.5" id="shap-b">' +
        '<span class="ctrl-value" id="shap-b-val">2.5 R\u2609</span>' +
        '<span class="ctrl-sep"></span>' +
        '<button class="ctrl-btn active" id="shap-fd">\u27F3 Frame-Dragging: ON</button>';

    const bSlider = controlsEl.querySelector('#shap-b');
    const bVal = controlsEl.querySelector('#shap-b-val');
    const fdBtn = controlsEl.querySelector('#shap-fd');

    bSlider.oninput = function() {
        impactB = parseFloat(this.value);
        bVal.textContent = (impactB * 5).toFixed(1) + ' R\u2609';
    };
    fdBtn.onclick = function() {
        frameDrag = !frameDrag;
        this.textContent = '\u27F3 Frame-Dragging: ' + (frameDrag ? 'ON' : 'OFF');
        this.classList.toggle('active', frameDrag);
    };

    function draw() {
        t += 0.016;
        ctx.clearRect(0, 0, W, H);

        const cx = W * 0.4, cy = H * 0.5;
        const rayY = cy - impactB * H * 0.35;

        // Density grid (warped)
        ctx.strokeStyle = 'rgba(26,26,58,0.3)'; ctx.lineWidth = 0.5;
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

        // Mass body
        const mgrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, massR * 4);
        mgrad.addColorStop(0, 'rgba(124,58,237,0.3)');
        mgrad.addColorStop(0.5, 'rgba(124,58,237,0.05)');
        mgrad.addColorStop(1, 'transparent');
        ctx.fillStyle = mgrad;
        ctx.fillRect(cx - massR*4, cy - massR*4, massR*8, massR*8);
        ctx.beginPath(); ctx.arc(cx, cy, massR, 0, Math.PI*2);
        ctx.fillStyle = 'rgba(124,58,237,0.8)'; ctx.fill();
        ctx.strokeStyle = 'rgba(167,139,250,0.6)'; ctx.lineWidth = 2; ctx.stroke();
        ctx.fillStyle = '#fff'; ctx.font = '12px JetBrains Mono'; ctx.textAlign = 'center';
        ctx.fillText('M\u2609', cx, cy + 4);

        // Undeflected reference
        ctx.setLineDash([6,6]); ctx.strokeStyle = 'rgba(255,255,255,0.25)'; ctx.lineWidth = 1;
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

        ctx.strokeStyle = 'rgba(6,255,165,0.9)'; ctx.lineWidth = 2.5;
        ctx.beginPath();
        pathPts.forEach((p, i) => i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y));
        ctx.stroke();

        // Wave packet
        const waveX = (t * 100) % (W + 200) - 100;
        const waveW = 40;
        for (let wx = waveX - waveW; wx < waveX + waveW; wx += 2) {
            if (wx < 0 || wx >= W) continue;
            const idx = Math.min(Math.floor(wx / step), pathPts.length - 1);
            if (idx < 0) continue;
            const p = pathPts[idx];
            const env = Math.exp(-Math.pow(wx - waveX, 2) / (2 * 15 * 15));
            const freq = 0.3 / Math.max(p.cEff, 0.2);
            const wave = Math.sin(wx * freq) * env * 8;
            const r = p.cEff < 0.5 ? 1 : 0.2;
            const g = p.cEff > 0.7 ? 1 : 0.3;
            const b_c = 0.3;
            ctx.fillStyle = `rgba(${Math.floor(r*255)},${Math.floor(g*255)},${Math.floor(b_c*255)},${env * 0.9})`;
            ctx.fillRect(wx, p.y + wave - 1, 2, 2);
        }

        // Info
        const shapiroDelay = (tAcc - tFlat) * 60;
        const deflection = Math.abs(pathPts[pathPts.length-1].y - rayY) / H * 4;

        hudEl.innerHTML =
            '<div class="hud-card"><div class="hud-label">Shapiro Delay</div><div class="hud-value" style="color:#38bdf8">' + shapiroDelay.toFixed(1) + ' \u00B5s</div><div class="hud-sub">extra travel time</div></div>' +
            '<div class="hud-card"><div class="hud-label">Deflection</div><div class="hud-value" style="color:#38bdf8">' + deflection.toFixed(2) + '"</div><div class="hud-sub">arcseconds</div></div>' +
            '<div class="hud-card"><div class="hud-label">Impact b</div><div class="hud-value" style="color:#38bdf8">' + (impactB * 5).toFixed(1) + ' R\u2609</div><div class="hud-sub">closest approach</div></div>' +
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
            canvas.remove();
        }
    };
}
