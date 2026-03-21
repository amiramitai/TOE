// Bjerknes Acoustic Radiation Force — UHF Part I
// Two pulsating spheres in superfluid: phase controls attraction/repulsion
// F = -(4πρ₀ω²R₁³R₂³ε₁ε₂ / d²) cos(Δφ)
export function init(viewport, controlsEl, hudEl) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%!important;height:100%!important;';
    viewport.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let W, H, dpr, raf;
    let phase = 0;        // Δφ in degrees
    let separation = 200; // pixels
    let time = 0;
    const omega = 2.5;    // pulsation angular frequency (visual)
    const eps = 0.25;     // pulsation amplitude fraction
    const baseR = 28;     // base sphere radius (px)

    function resize() {
        dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        W = rect.width; H = rect.height;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    // Controls
    controlsEl.innerHTML =
        '<div style="flex:0 0 100%;display:flex;flex-direction:column;gap:6px">' +
        '  <div style="display:flex;justify-content:space-between;align-items:center">' +
        '    <span class="ctrl-label">PHASE DIFFERENCE Δφ</span>' +
        '    <span class="ctrl-value" id="bj-phase-val" style="color:#4ade80">0° (in-phase)</span>' +
        '  </div>' +
        '  <input type="range" class="ctrl-slider" min="0" max="360" step="1" value="0" id="bj-phase">' +
        '  <div style="display:flex;justify-content:space-between;font:9px JetBrains Mono,monospace;color:rgba(200,200,220,0.5);margin-top:-2px">' +
        '    <span>0° attract</span><span>90° neutral</span><span>180° repel</span><span>360°</span>' +
        '  </div>' +
        '  <div style="display:flex;justify-content:space-between;align-items:center;margin-top:4px">' +
        '    <span class="ctrl-label">SEPARATION d</span>' +
        '    <span class="ctrl-value" id="bj-sep-val" style="color:#22d3ee">200 px</span>' +
        '  </div>' +
        '  <input type="range" class="ctrl-slider" min="80" max="400" step="1" value="200" id="bj-sep">' +
        '</div>';

    const phaseSlider = controlsEl.querySelector('#bj-phase');
    const phaseVal = controlsEl.querySelector('#bj-phase-val');
    const sepSlider = controlsEl.querySelector('#bj-sep');
    const sepVal = controlsEl.querySelector('#bj-sep-val');

    phaseSlider.oninput = function () {
        phase = parseInt(this.value);
        const cosP = Math.cos(phase * Math.PI / 180);
        const label = cosP > 0.01 ? 'attract' : cosP < -0.01 ? 'repel' : 'neutral';
        phaseVal.textContent = phase + '° (' + label + ')';
        phaseVal.style.color = cosP > 0.01 ? '#4ade80' : cosP < -0.01 ? '#f472b6' : '#5a5e6a';
    };
    sepSlider.oninput = function () {
        separation = parseInt(this.value);
        sepVal.textContent = separation + ' px';
    };

    // Wave ring pool
    const waves1 = [], waves2 = [];
    const maxWaves = 12;
    let lastEmit = 0;

    function draw() {
        ctx.clearRect(0, 0, W, H);
        const cx = W / 2, cy = H / 2;
        const dt = 0.025;
        time += dt;

        const phaseRad = phase * Math.PI / 180;
        const cosP = Math.cos(phaseRad);
        const r1 = baseR * (1 + eps * Math.sin(omega * time * 2 * Math.PI));
        const r2 = baseR * (1 + eps * Math.sin(omega * time * 2 * Math.PI + phaseRad));

        const x1 = cx - separation / 2;
        const x2 = cx + separation / 2;

        // Emit concentric pressure waves
        if (time - lastEmit > 0.12) {
            lastEmit = time;
            waves1.push({ x: x1, y: cy, r: r1, born: time, phase: omega * time * 2 * Math.PI });
            waves2.push({ x: x2, y: cy, r: r2, born: time, phase: omega * time * 2 * Math.PI + phaseRad });
            if (waves1.length > maxWaves) waves1.shift();
            if (waves2.length > maxWaves) waves2.shift();
        }

        // Draw pressure waves
        for (const pool of [waves1, waves2]) {
            for (const w of pool) {
                const age = time - w.born;
                const waveR = w.r + age * 120;
                const alpha = Math.max(0, 0.35 - age * 0.06);
                if (alpha <= 0) continue;
                ctx.beginPath();
                ctx.arc(w.x, w.y, waveR, 0, Math.PI * 2);
                ctx.strokeStyle = 'rgba(100,200,255,' + alpha.toFixed(3) + ')';
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }

        // Force calculation (normalized for display)
        const forceNorm = -cosP / Math.pow(separation / 100, 2);
        const forceMag = Math.abs(forceNorm);
        const forceDir = forceNorm < 0 ? -1 : forceNorm > 0 ? 1 : 0; // -1 = attract (inward)

        // Draw force arrows between spheres
        if (Math.abs(forceDir) > 0) {
            const arrowLen = Math.min(forceMag * 40, separation / 2 - baseR - 10);
            const arrowColor = forceDir < 0 ? '#4ade80' : '#f472b6';
            ctx.strokeStyle = arrowColor;
            ctx.fillStyle = arrowColor;
            ctx.lineWidth = 2.5;
            // Arrow from sphere1 toward/away sphere2
            const a1start = x1 + r1 + 6;
            const a1end = a1start + forceDir * -1 * arrowLen; // inward if attract
            drawArrow(ctx, a1start, cy, a1end, cy, 8);
            // Arrow from sphere2 toward/away sphere1
            const a2start = x2 - r2 - 6;
            const a2end = a2start + forceDir * arrowLen;
            drawArrow(ctx, a2start, cy, a2end, cy, 8);
        }

        // Draw spheres
        for (const [sx, sr, c] of [[x1, r1, '#4ade80'], [x2, r2, '#22d3ee']]) {
            const grad = ctx.createRadialGradient(sx, cy, sr * 0.1, sx, cy, sr);
            grad.addColorStop(0, c);
            grad.addColorStop(1, 'rgba(0,0,0,0.3)');
            ctx.beginPath();
            ctx.arc(sx, cy, sr, 0, Math.PI * 2);
            ctx.fillStyle = grad;
            ctx.fill();
            // Glow
            ctx.beginPath();
            ctx.arc(sx, cy, sr + 8, 0, Math.PI * 2);
            const glow = ctx.createRadialGradient(sx, cy, sr, sx, cy, sr + 16);
            glow.addColorStop(0, c.replace(')', ',0.3)').replace('rgb', 'rgba'));
            glow.addColorStop(1, 'transparent');
            ctx.fillStyle = glow;
            ctx.fill();
        }

        // Title
        ctx.fillStyle = '#4ade80';
        ctx.font = 'bold 14px JetBrains Mono';
        ctx.textAlign = 'center';
        ctx.fillText('BJERKNES ACOUSTIC RADIATION FORCE', cx, 25);
        ctx.fillStyle = 'rgba(200,200,220,0.4)';
        ctx.font = '11px JetBrains Mono';
        ctx.fillText('F = -(4\u03C0\u03C1\u2080\u03C9\u00B2R\u2081\u00B3R\u2082\u00B3\u03B5\u00B2/d\u00B2) cos(\u0394\u03C6)', cx, 42);

        // Force label
        const forceLabel = cosP > 0.01 ? 'ATTRACTIVE' : cosP < -0.01 ? 'REPULSIVE' : 'NEUTRAL';
        const forceColor = cosP > 0.01 ? '#4ade80' : cosP < -0.01 ? '#f472b6' : '#5a5e6a';
        ctx.fillStyle = forceColor;
        ctx.font = 'bold 13px JetBrains Mono';
        ctx.fillText(forceLabel, cx, cy + separation / 4 + 30);

        // 1/d² scaling badge
        ctx.fillStyle = 'rgba(200,200,220,0.3)';
        ctx.font = '10px JetBrains Mono';
        ctx.fillText('F \u221D 1/d\u00B2 \u00B7 cos(\u0394\u03C6)  |  gravity = in-phase Bjerknes force', cx, H - 15);

        // HUD
        hudEl.innerHTML =
            '<div class="hud-card"><div class="hud-label">Force</div><div class="hud-value" style="color:' + forceColor + '">' + forceLabel + '</div><div class="hud-sub">cos(\u0394\u03C6) = ' + cosP.toFixed(3) + '</div></div>' +
            '<div class="hud-card"><div class="hud-label">Phase \u0394\u03C6</div><div class="hud-value" style="color:#a78bfa">' + phase + '\u00B0</div><div class="hud-sub">0\u00B0 = gravity</div></div>' +
            '<div class="hud-card"><div class="hud-label">Separation</div><div class="hud-value" style="color:#22d3ee">' + separation + '</div><div class="hud-sub">F \u221D 1/d\u00B2</div></div>' +
            '<div class="hud-card"><div class="hud-label">UHF Insight</div><div class="hud-value" style="color:#4ade80">' + (cosP > 0.99 ? 'GRAVITY' : 'GENERAL') + '</div><div class="hud-sub">' + (cosP > 0.99 ? 'all matter phase-locked' : 'phase-dependent') + '</div></div>';

        raf = requestAnimationFrame(draw);
    }
    draw();

    function drawArrow(ctx, x1, y1, x2, y2, headLen) {
        const dx = x2 - x1, dy = y2 - y1;
        const angle = Math.atan2(dy, dx);
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.lineTo(x2, y2);
        ctx.stroke();
        ctx.beginPath();
        ctx.moveTo(x2, y2);
        ctx.lineTo(x2 - headLen * Math.cos(angle - 0.4), y2 - headLen * Math.sin(angle - 0.4));
        ctx.lineTo(x2 - headLen * Math.cos(angle + 0.4), y2 - headLen * Math.sin(angle + 0.4));
        ctx.closePath();
        ctx.fill();
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
