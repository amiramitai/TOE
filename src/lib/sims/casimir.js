export function init(viewport, controlsEl, hudEl) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%!important;height:100%!important;';
    viewport.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let W, H, dpr, raf;
    let plateD = 200; // nm
    let t = 0;
    const hbar = 1.055e-34, c = 3e8;

    // Outside modes
    const outsideModes = [];
    for (let i = 0; i < 24; i++) {
        outsideModes.push({
            lambda: 20 + Math.random() * 60,
            amp: 3 + Math.random() * 8,
            xFrac: Math.random(),
            speed: 0.5 + Math.random() * 1.5,
            phaseOff: Math.random() * Math.PI * 2,
            side: i < 12 ? 'left' : 'right',
        });
    }

    function resize() {
        dpr = window.devicePixelRatio || 1;
        const rect = canvas.getBoundingClientRect();
        W = rect.width; H = rect.height;
        canvas.width = W * dpr; canvas.height = H * dpr;
        ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    }
    resize();

    controlsEl.innerHTML =
        '<div style="flex:0 0 100%;display:flex;flex-direction:column;gap:4px">' +
        '  <div style="display:flex;align-items:center">' +
        '    <span class="ctrl-label">PLATE SEPARATION</span>' +
        '  </div>' +
        '  <input type="range" class="ctrl-slider" min="1" max="1000" step="1" value="200" id="cas-d">' +
        '  <div style="position:relative;width:100%;height:28px">' +
        '<style>.cas-tick{position:absolute;transform:translateX(-50%);font:9px JetBrains Mono,monospace;color:rgba(200,200,220,0.5);text-align:center;white-space:nowrap;top:2px;line-height:1.3}</style>' +
        '    <span class="cas-tick" style="left:0%">1 nm<br><span style="font-size:8px;opacity:0.7">min</span></span>' +
        '    <span class="cas-tick" style="left:10%">100 nm</span>' +
        '    <span class="cas-tick" style="left:20%;color:rgba(124,58,237,0.8)">200 nm<br><span style="font-size:8px">default</span></span>' +
        '    <span class="cas-tick" style="left:50%">500 nm</span>' +
        '    <span class="cas-tick" style="left:100%">1\u03bcm</span>' +
        '  </div>' +
        '</div>';

    const dSlider = controlsEl.querySelector('#cas-d');
    dSlider.oninput = function() {
        plateD = parseInt(this.value);
    };

    function drawArrow(x1, y1, x2, y2, color, scale) {
        const dx = x2 - x1, dy = y2 - y1;
        const len = Math.sqrt(dx*dx + dy*dy) * scale;
        const ang = Math.atan2(dy, dx);
        const ex = x1 + len * Math.cos(ang), ey = y1 + len * Math.sin(ang);
        ctx.strokeStyle = color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(ex, ey); ctx.stroke();
        const headLen = 8;
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.moveTo(ex, ey);
        ctx.lineTo(ex - headLen * Math.cos(ang - 0.4), ey - headLen * Math.sin(ang - 0.4));
        ctx.lineTo(ex - headLen * Math.cos(ang + 0.4), ey - headLen * Math.sin(ang + 0.4));
        ctx.closePath(); ctx.fill();
    }

    function draw() {
        t += 0.025;
        ctx.clearRect(0, 0, W, H);

        const cx = W * 0.5;
        const plateSep = Math.max(30, plateD / 1000 * W * 0.3);
        const plateL = cx - plateSep / 2;
        const plateR = cx + plateSep / 2;
        const plateTop = H * 0.10, plateBot = H * 0.92;

        // Outside modes (left side)
        for (const m of outsideModes) {
            const baseX = m.side === 'left' ? plateL * m.xFrac : plateR + (W - plateR) * m.xFrac;
            ctx.strokeStyle = 'rgba(56,189,248,0.25)'; ctx.lineWidth = 1;
            ctx.beginPath();
            for (let y = plateTop; y < plateBot; y += 2) {
                const wave = Math.sin((y / m.lambda + t * m.speed + m.phaseOff) * Math.PI * 2) * m.amp;
                y === plateTop ? ctx.moveTo(baseX + wave, y) : ctx.lineTo(baseX + wave, y);
            }
            ctx.stroke();
        }

        // Interior standing waves
        const nMax = Math.min(Math.floor(plateD / 12), 10);
        for (let n = 1; n <= nMax; n++) {
            const hue = 270 + (n / nMax) * 40;
            ctx.strokeStyle = `hsla(${hue}, 70%, 60%, 0.35)`;
            ctx.lineWidth = 1.5;
            ctx.beginPath();
            for (let y = plateTop; y < plateBot; y += 2) {
                const xNorm = Math.sin(n * Math.PI * (y - plateTop) / (plateBot - plateTop));
                const wave = xNorm * Math.sin(t * (1 + n * 0.5)) * (plateSep * 0.42);
                const x = cx + wave;
                y === plateTop ? ctx.moveTo(x, y) : ctx.lineTo(x, y);
            }
            ctx.stroke();
        }

        // Plates
        const plateW = 6;
        ctx.fillStyle = 'rgba(124,58,237,0.7)';
        ctx.fillRect(plateL - plateW/2, plateTop, plateW, plateBot - plateTop);
        ctx.fillRect(plateR - plateW/2, plateTop, plateW, plateBot - plateTop);
        // Glow
        const lglow = ctx.createLinearGradient(plateL - 20, 0, plateL + 20, 0);
        lglow.addColorStop(0, 'transparent');
        lglow.addColorStop(0.5, 'rgba(124,58,237,0.15)');
        lglow.addColorStop(1, 'transparent');
        ctx.fillStyle = lglow;
        ctx.fillRect(plateL - 20, plateTop, 40, plateBot - plateTop);
        const rglow = ctx.createLinearGradient(plateR - 20, 0, plateR + 20, 0);
        rglow.addColorStop(0, 'transparent');
        rglow.addColorStop(0.5, 'rgba(124,58,237,0.15)');
        rglow.addColorStop(1, 'transparent');
        ctx.fillStyle = rglow;
        ctx.fillRect(plateR - 20, plateTop, 40, plateBot - plateTop);

        // Caps
        ctx.fillStyle = 'rgba(167,139,250,0.5)';
        ctx.fillRect(plateL - 10, plateTop - 3, 20, 6);
        ctx.fillRect(plateL - 10, plateBot - 3, 20, 6);
        ctx.fillRect(plateR - 10, plateTop - 3, 20, 6);
        ctx.fillRect(plateR - 10, plateBot - 3, 20, 6);

        // Pressure arrows
        const d_m = plateD * 1e-9;
        const pressure = Math.PI * Math.PI * hbar * c / (240 * Math.pow(d_m, 4));
        const logP = Math.log10(1 + pressure);
        const arrowScale = Math.min(logP / 2.32, 1);

        drawArrow(plateL - 40, H * 0.4, plateL - 5, H * 0.4, '#f472b6', arrowScale);
        drawArrow(plateR + 40, H * 0.4, plateR + 5, H * 0.4, '#f472b6', arrowScale);
        drawArrow(plateL - 40, H * 0.6, plateL - 5, H * 0.6, '#f472b6', arrowScale);
        drawArrow(plateR + 40, H * 0.6, plateR + 5, H * 0.6, '#f472b6', arrowScale);

        // Separation indicator (dashed line only, no label — shown in HUD)
        ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(200,200,220,0.2)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(plateL, plateBot + 14); ctx.lineTo(plateR, plateBot + 14); ctx.stroke();
        ctx.setLineDash([]);

        // Title
        ctx.fillStyle = '#7c3aed'; ctx.font = 'bold 14px JetBrains Mono'; ctx.textAlign = 'center';
        ctx.fillText('SUB-PLANCKIAN CASIMIR EFFECT: P \u221D d\u207B\u2074', W / 2, 25);
        ctx.fillStyle = 'rgba(200,200,220,0.4)'; ctx.font = '11px JetBrains Mono';
        ctx.fillText('phonon modes excluded between plates \u2192 acoustic radiation pressure', W / 2, 42);

        // Mode info
        if (nMax < 5) {
            ctx.fillStyle = 'rgba(244,114,182,0.6)'; ctx.font = '10px JetBrains Mono';
            ctx.fillText(nMax + ' mode' + (nMax !== 1 ? 's' : '') + ' fit \u2014 strong exclusion', cx, plateTop - 10);
        }

        hudEl.innerHTML =
            '<div class="hud-card"><div class="hud-label">Casimir Pressure</div><div class="hud-value" style="color:#7c3aed">' + pressure.toExponential(2) + '</div><div class="hud-sub">Pa</div></div>' +
            '<div class="hud-card"><div class="hud-label">Separation</div><div class="hud-value" style="color:#7c3aed">' + plateD + ' nm</div><div class="hud-sub">plate gap</div></div>' +
            '<div class="hud-card"><div class="hud-label">Interior Modes</div><div class="hud-value" style="color:#7c3aed">' + nMax + '</div><div class="hud-sub">standing waves</div></div>' +
            '<div class="hud-card"><div class="hud-label">Excluded</div><div class="hud-value" style="color:#7c3aed">' + Math.max(0, 24 - nMax) + '</div><div class="hud-sub">modes removed</div></div>';

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
