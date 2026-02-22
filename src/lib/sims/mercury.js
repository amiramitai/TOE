export function init(viewport, controlsEl, hudEl) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%!important;height:100%!important;';
    viewport.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let W, H, dpr, raf;
    let advection = 1.0;
    let theta = 0, omega = 0;
    const trail = [];
    const maxTrail = 5000;
    const e = 0.4, aFrac = 0.35, precVis = 0.05;

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
        '  <div style="display:flex;justify-content:space-between;align-items:center">' +
        '    <span class="ctrl-label">ADVECTION (v\u00B7\u2207)v</span>' +
        '    <span class="ctrl-value" id="merc-adv-val" style="color:#f472b6">1.00\u00D7 (GR)</span>' +
        '  </div>' +
        '  <input type="range" class="ctrl-slider" min="0" max="800" step="1" value="100" id="merc-adv">' +
        '  <div style="position:relative;width:100%;height:28px">' +
        '<style>.merc-tick{position:absolute;transform:translateX(-50%);font:9px JetBrains Mono,monospace;color:rgba(200,200,220,0.5);text-align:center;white-space:nowrap;top:2px;line-height:1.3}</style>' +
        '    <span class="merc-tick" style="left:0%">0×<br><span style="font-size:8px;opacity:0.7">Newton</span></span>' +
        '    <span class="merc-tick" style="left:12.5%;color:rgba(244,114,182,0.8)">1×<br><span style="font-size:8px">GR</span></span>' +
        '    <span class="merc-tick" style="left:25%">2×</span>' +
        '    <span class="merc-tick" style="left:50%">4×</span>' +
        '    <span class="merc-tick" style="left:100%">8×</span>' +
        '  </div>' +
        '</div>';

    const advSlider = controlsEl.querySelector('#merc-adv');
    const advVal = controlsEl.querySelector('#merc-adv-val');

    advSlider.oninput = function() {
        advection = parseInt(this.value) / 100;
        advVal.textContent = advection.toFixed(2) + '\u00D7' + (advection === 1 ? ' (GR)' : advection === 0 ? ' (Newton)' : '');
        trail.length = 0;
        omega = 0;
    };

    function orbR(th) {
        const a = Math.min(W, H) * aFrac;
        return a * (1 - e * e) / (1 + e * Math.cos(th));
    }

    function draw() {
        ctx.clearRect(0, 0, W, H);
        const cx = W * 0.5, cy = H * 0.5;
        const dTh = 0.04;
        theta += dTh;
        omega += precVis * advection * dTh / (2 * Math.PI);

        const r = orbR(theta);
        const px = cx + r * Math.cos(theta + omega);
        const py = cy + r * Math.sin(theta + omega);
        trail.push({ x: px, y: py, theta: theta + omega });
        if (trail.length > maxTrail) trail.shift();

        // Grid
        ctx.strokeStyle = 'rgba(26,26,58,0.3)'; ctx.lineWidth = 0.5;
        for (let gx = 0; gx < W; gx += 60) { ctx.beginPath(); ctx.moveTo(gx, 0); ctx.lineTo(gx, H); ctx.stroke(); }
        for (let gy = 0; gy < H; gy += 60) { ctx.beginPath(); ctx.moveTo(0, gy); ctx.lineTo(W, gy); ctx.stroke(); }

        // Newtonian reference ellipse
        ctx.setLineDash([4, 4]); ctx.strokeStyle = 'rgba(255,255,255,0.12)'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2; a += 0.02) {
            const rr = orbR(a);
            const xx = cx + rr * Math.cos(a);
            const yy = cy + rr * Math.sin(a);
            a === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy);
        }
        ctx.closePath(); ctx.stroke();
        ctx.setLineDash([]);

        // Trail
        const bandCount = 12;
        const bandSize = Math.ceil(trail.length / bandCount);
        for (let b = 0; b < bandCount; b++) {
            const start = b * bandSize;
            const end = Math.min(start + bandSize, trail.length);
            if (start >= trail.length) break;
            const hue = 330 + (b / bandCount) * 40;
            const baseAlpha = 0.1 + (b / bandCount) * 0.5;
            ctx.beginPath();
            for (let i = start; i < end; i++) {
                i === start ? ctx.moveTo(trail[i].x, trail[i].y) : ctx.lineTo(trail[i].x, trail[i].y);
            }
            ctx.strokeStyle = `hsla(${hue}, 80%, 65%, ${baseAlpha})`;
            ctx.lineWidth = 1.5;
            ctx.stroke();
        }

        // Current ellipse
        ctx.strokeStyle = 'rgba(244,114,182,0.4)'; ctx.lineWidth = 1;
        ctx.beginPath();
        for (let a = 0; a <= Math.PI * 2; a += 0.02) {
            const rr = orbR(a);
            const xx = cx + rr * Math.cos(a + omega);
            const yy = cy + rr * Math.sin(a + omega);
            a === 0 ? ctx.moveTo(xx, yy) : ctx.lineTo(xx, yy);
        }
        ctx.closePath(); ctx.stroke();

        // Perihelion line
        ctx.setLineDash([3, 3]); ctx.strokeStyle = 'rgba(6,255,165,0.3)'; ctx.lineWidth = 1;
        const periR = Math.min(W, H) * 0.45;
        ctx.beginPath(); ctx.moveTo(cx, cy);
        ctx.lineTo(cx + periR * Math.cos(omega), cy + periR * Math.sin(omega));
        ctx.stroke(); ctx.setLineDash([]);

        // Sun
        const sunGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 20);
        sunGrad.addColorStop(0, 'rgba(255,200,50,0.9)');
        sunGrad.addColorStop(0.5, 'rgba(255,140,0,0.4)');
        sunGrad.addColorStop(1, 'transparent');
        ctx.fillStyle = sunGrad;
        ctx.fillRect(cx - 20, cy - 20, 40, 40);
        ctx.beginPath(); ctx.arc(cx, cy, 6, 0, Math.PI * 2);
        ctx.fillStyle = '#ffcc00'; ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = '10px JetBrains Mono'; ctx.textAlign = 'center';
        ctx.fillText('\u2609', cx, cy + 3);

        // Mercury
        ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2);
        ctx.fillStyle = '#f472b6'; ctx.fill();
        ctx.strokeStyle = 'rgba(244,114,182,0.3)'; ctx.lineWidth = 8;
        ctx.beginPath(); ctx.arc(px, py, 4, 0, Math.PI * 2); ctx.stroke();

        // Title
        const prec = (42.98 * advection).toFixed(2);
        ctx.fillStyle = '#f472b6'; ctx.font = 'bold 14px JetBrains Mono'; ctx.textAlign = 'center';
        ctx.fillText('MERCURY PERIHELION: ' + prec + '"/century', W / 2, 25);
        ctx.fillStyle = 'rgba(200,200,220,0.4)'; ctx.font = '11px JetBrains Mono';
        ctx.fillText('advective (v\u00B7\u2207)v \u2192 1/r\u00B3 correction \u2192 rosette orbit', W / 2, 42);

        hudEl.innerHTML =
            '<div class="hud-card"><div class="hud-label">Precession</div><div class="hud-value" style="color:#f472b6">' + prec + '"/cy</div><div class="hud-sub">obs: 42.98"/cy</div></div>' +
            '<div class="hud-card"><div class="hud-label">Advection</div><div class="hud-value" style="color:#f472b6">' + advection.toFixed(2) + '\u00D7</div><div class="hud-sub">1\u00D7 = GR</div></div>' +
            '<div class="hud-card"><div class="hud-label">Status</div><div class="hud-value" style="color:' + (Math.abs(advection - 1) < 0.1 ? '#06ffa5' : '#5a5e6a') + '">' + (Math.abs(advection - 1) < 0.1 ? 'GR MATCH' : 'EXPLORING') + '</div><div class="hud-sub">' + (Math.abs(advection - 1) < 0.1 ? 'UHF = Einstein' : 'vary to see effect') + '</div></div>';

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
