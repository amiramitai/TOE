// Color Confinement — Vortex Flux Tube (Paper 5/6)
// σ_QCD ≈ (440 MeV)² ≈ 0.88 GeV/fm — linear potential V(r) = σr
// Drag quarks apart → string breaks via pair creation
export function init(viewport, controlsEl, hudEl) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%!important;height:100%!important;';
    viewport.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let W, H, dpr, raf;
    let time = 0;
    let separation = 0.5; // fm
    let broken = false;
    let breakTime = 0;
    let newPairAlpha = 0;

    const sigma = 0.88; // GeV/fm (string tension)
    const breakThreshold = 1.8; // fm → V ≈ 2 × constituent quark mass

    function resize() {
        dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        W = rect.width; H = rect.height;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    controlsEl.innerHTML =
        '<div style="flex:0 0 100%;display:flex;flex-direction:column;gap:6px">' +
        '  <div style="display:flex;justify-content:space-between;align-items:center">' +
        '    <span class="ctrl-label">QUARK SEPARATION r</span>' +
        '    <span class="ctrl-value" id="ft-sep-val" style="color:#f472b6">0.50 fm</span>' +
        '  </div>' +
        '  <input type="range" class="ctrl-slider" min="5" max="300" step="1" value="50" id="ft-sep">' +
        '  <div style="display:flex;justify-content:space-between;font:9px JetBrains Mono,monospace;color:rgba(200,200,220,0.5);margin-top:-2px">' +
        '    <span>0.05 fm</span><span style="color:rgba(244,114,182,0.7)">~1.8 fm (break)</span><span>3.0 fm</span>' +
        '  </div>' +
        '</div>';

    const sepSlider = controlsEl.querySelector('#ft-sep');
    const sepVal = controlsEl.querySelector('#ft-sep-val');

    sepSlider.oninput = function () {
        separation = parseInt(this.value) / 100;
        sepVal.textContent = separation.toFixed(2) + ' fm';
        if (separation >= breakThreshold && !broken) {
            broken = true;
            breakTime = time;
            newPairAlpha = 0;
        } else if (separation < breakThreshold) {
            broken = false;
            newPairAlpha = 0;
        }
    };

    function draw() {
        ctx.clearRect(0, 0, W, H);
        time += 0.016;

        const cy = H * 0.38;
        const maxPixSep = W * 0.7;
        const pixSep = (separation / 3.0) * maxPixSep;
        const qL = W / 2 - pixSep / 2;
        const qR = W / 2 + pixSep / 2;
        const V = sigma * separation;

        // === FLUX TUBE ===
        if (!broken) {
            // Tube with oscillating internal structure
            const tubeH = 14 + separation * 3;
            const grad = ctx.createLinearGradient(qL, cy, qR, cy);
            grad.addColorStop(0, 'rgba(255,50,50,0.5)');
            grad.addColorStop(0.5, 'rgba(255,150,50,0.3)');
            grad.addColorStop(1, 'rgba(50,50,255,0.5)');

            // Flux lines
            const nLines = 8;
            for (let i = 0; i < nLines; i++) {
                const yOff = (i / (nLines - 1) - 0.5) * tubeH;
                ctx.strokeStyle = grad;
                ctx.lineWidth = 1.5;
                ctx.globalAlpha = 0.4 + 0.3 * Math.sin(time * 3 + i);
                ctx.beginPath();
                for (let x = qL; x <= qR; x += 3) {
                    const t = (x - qL) / (qR - qL);
                    const wiggle = Math.sin(t * 8 * Math.PI + time * 4 + i) * 3 * (1 - Math.abs(t - 0.5) * 2) * Math.min(1, separation);
                    if (x === qL) ctx.moveTo(x, cy + yOff + wiggle);
                    else ctx.lineTo(x, cy + yOff + wiggle);
                }
                ctx.stroke();
            }
            ctx.globalAlpha = 1;

            // Gluon field glow
            const tubGlow = ctx.createRadialGradient(W / 2, cy, 0, W / 2, cy, pixSep / 2);
            tubGlow.addColorStop(0, 'rgba(255,150,50,0.08)');
            tubGlow.addColorStop(1, 'transparent');
            ctx.fillStyle = tubGlow;
            ctx.fillRect(qL, cy - tubeH, pixSep, tubeH * 2);
        } else {
            // Broken string — two shorter tubes + new pair
            newPairAlpha = Math.min(1, newPairAlpha + 0.02);
            const midX = W / 2;
            const newSep = 12 + newPairAlpha * 20;

            // Left fragment
            drawTubeFragment(ctx, qL, midX - newSep, cy, time);
            // Right fragment
            drawTubeFragment(ctx, midX + newSep, qR, cy, time);

            // New quark-antiquark pair
            ctx.globalAlpha = newPairAlpha;
            drawQuark(ctx, midX - newSep, cy, '#55f', 8, 'q\u0304');
            drawQuark(ctx, midX + newSep, cy, '#f55', 8, 'q');
            ctx.globalAlpha = 1;

            // Break flash
            if (time - breakTime < 0.5) {
                const flash = 1 - (time - breakTime) / 0.5;
                ctx.beginPath();
                ctx.arc(midX, cy, 20 * flash + 5, 0, Math.PI * 2);
                ctx.fillStyle = 'rgba(255,255,200,' + (flash * 0.6).toFixed(2) + ')';
                ctx.fill();
            }
        }

        // === QUARKS ===
        drawQuark(ctx, qL, cy, '#ff3333', 12, 'q');
        drawQuark(ctx, qR, cy, '#3333ff', 12, 'q\u0304');

        // === POTENTIAL ENERGY PLOT (bottom) ===
        const plotL = 50, plotR = W - 30, plotT = H * 0.6, plotB = H - 35;
        const plotW = plotR - plotL, plotH = plotB - plotT;

        ctx.strokeStyle = 'rgba(200,200,220,0.2)';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(plotL, plotB); ctx.lineTo(plotR, plotB); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(plotL, plotB); ctx.lineTo(plotL, plotT); ctx.stroke();

        ctx.fillStyle = 'rgba(200,200,220,0.4)';
        ctx.font = '9px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText('r (fm)', (plotL + plotR) / 2, plotB + 16);
        ctx.save();
        ctx.translate(plotL - 16, (plotT + plotB) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.fillText('V(r) (GeV)', 0, 0);
        ctx.restore();

        // Linear potential V = σr
        const rMax = 3.0, vMax = sigma * rMax * 1.1;
        ctx.strokeStyle = '#f472b6';
        ctx.lineWidth = 2;
        ctx.beginPath();
        for (let i = 0; i <= 200; i++) {
            const r = (i / 200) * rMax;
            const v = sigma * r;
            const x = plotL + (r / rMax) * plotW;
            const y = plotB - (v / vMax) * plotH;
            if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();

        // Coulombic part at short range (−4αs/3r)
        ctx.strokeStyle = 'rgba(34,211,238,0.5)';
        ctx.setLineDash([4, 3]);
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        for (let i = 1; i <= 100; i++) {
            const r = 0.05 + (i / 100) * 1.5;
            const vCoul = -0.3 / r + sigma * r; // Cornell potential
            const x = plotL + (r / rMax) * plotW;
            const y = plotB - (vCoul / vMax) * plotH;
            if (y < plotT || y > plotB) continue;
            if (i === 1) ctx.moveTo(x, y); else ctx.lineTo(x, y);
        }
        ctx.stroke();
        ctx.setLineDash([]);

        // Current position marker
        const curX = plotL + (separation / rMax) * plotW;
        const curY = plotB - (V / vMax) * plotH;
        ctx.beginPath();
        ctx.arc(curX, Math.max(plotT, Math.min(plotB, curY)), 5, 0, Math.PI * 2);
        ctx.fillStyle = '#fbbf24';
        ctx.fill();

        // Break threshold line
        const breakX = plotL + (breakThreshold / rMax) * plotW;
        ctx.strokeStyle = 'rgba(255,80,80,0.4)';
        ctx.setLineDash([3, 3]);
        ctx.beginPath(); ctx.moveTo(breakX, plotT); ctx.lineTo(breakX, plotB); ctx.stroke();
        ctx.setLineDash([]);
        ctx.fillStyle = 'rgba(255,80,80,0.5)';
        ctx.font = '8px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText('string break', breakX, plotT - 3);

        // Legend
        ctx.font = '9px JetBrains Mono';
        ctx.textAlign = 'left';
        ctx.fillStyle = '#f472b6';
        ctx.fillText('\u2500 V = \u03C3r (linear)', plotL + 5, plotT + 12);
        ctx.fillStyle = 'rgba(34,211,238,0.5)';
        ctx.fillText('--- Cornell (\u22124\u03B1s/3r + \u03C3r)', plotL + 5, plotT + 24);

        // Title
        ctx.fillStyle = '#f472b6';
        ctx.font = 'bold 14px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText('COLOR CONFINEMENT: VORTEX FLUX TUBE', W / 2, 25);
        ctx.fillStyle = 'rgba(200,200,220,0.4)';
        ctx.font = '11px JetBrains Mono';
        ctx.fillText('V(r) = \u03C3r  |  \u03C3 = (440 MeV)\u00B2 = 0.88 GeV/fm  |  vortex cannot terminate in bulk', W / 2, 42);

        // HUD
        hudEl.innerHTML =
            '<div class="hud-card"><div class="hud-label">V(r)</div><div class="hud-value" style="color:#f472b6">' + V.toFixed(2) + ' GeV</div><div class="hud-sub">\u03C3 \u00D7 r</div></div>' +
            '<div class="hud-card"><div class="hud-label">Separation</div><div class="hud-value" style="color:#22d3ee">' + separation.toFixed(2) + ' fm</div><div class="hud-sub">quark distance</div></div>' +
            '<div class="hud-card"><div class="hud-label">\u03C3</div><div class="hud-value" style="color:#fbbf24">0.88</div><div class="hud-sub">GeV/fm (lattice: 0.88\u00B10.03)</div></div>' +
            '<div class="hud-card"><div class="hud-label">Status</div><div class="hud-value" style="color:' + (broken ? '#f472b6' : '#06ffa5') + '">' + (broken ? 'BROKEN' : 'CONFINED') + '</div><div class="hud-sub">' + (broken ? 'pair created' : 'topologically stable') + '</div></div>';

        raf = requestAnimationFrame(draw);
    }
    draw();

    function drawQuark(ctx, x, y, color, r, label) {
        const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
        grad.addColorStop(0, color);
        grad.addColorStop(1, 'rgba(0,0,0,0.3)');
        ctx.beginPath();
        ctx.arc(x, y, r, 0, Math.PI * 2);
        ctx.fillStyle = grad;
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = 'bold 10px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText(label, x, y + 3);
    }

    function drawTubeFragment(ctx, x1, x2, y, t) {
        if (x2 - x1 < 5) return;
        const nLines = 5;
        for (let i = 0; i < nLines; i++) {
            const yOff = (i / (nLines - 1) - 0.5) * 10;
            ctx.strokeStyle = 'rgba(255,150,50,0.25)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            for (let x = x1; x <= x2; x += 3) {
                const tt = (x - x1) / Math.max(1, x2 - x1);
                const wiggle = Math.sin(tt * 6 * Math.PI + t * 4 + i) * 2;
                if (x === x1) ctx.moveTo(x, y + yOff + wiggle);
                else ctx.lineTo(x, y + yOff + wiggle);
            }
            ctx.stroke();
        }
    }

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
