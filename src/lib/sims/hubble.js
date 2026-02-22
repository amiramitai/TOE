export function init(viewport, controlsEl, hudEl) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText = 'position:absolute;inset:0;width:100%!important;height:100%!important;';
    viewport.appendChild(canvas);
    const ctx = canvas.getContext('2d');
    let W, H, dpr, raf;
    let currentZ = 0.7;

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
        '    <span class="ctrl-label">REDSHIFT z</span>' +
        '    <span class="ctrl-value" id="hub-z-val">z = 0.70</span>' +
        '  </div>' +
        '  <input type="range" class="ctrl-slider" min="0" max="100" step="0.1" value="7.6" id="hub-z">' +
        '  <div style="position:relative;width:100%;height:28px">' +
        '<style>.hub-tick{position:absolute;transform:translateX(-50%);font:9px JetBrains Mono,monospace;color:rgba(200,200,220,0.5);text-align:center;white-space:nowrap;top:2px;line-height:1.3}</style>' +
        '    <span class="hub-tick" style="left:0%">z=0<br><span style="font-size:8px;opacity:0.7">now</span></span>' +
        '    <span class="hub-tick" style="left:7.2%;color:rgba(6,255,165,0.7)">z=0.7<br><span style="font-size:8px">transition</span></span>' +
        '    <span class="hub-tick" style="left:18.6%">z=3<br><span style="font-size:8px;opacity:0.7">matter</span></span>' +
        '    <span class="hub-tick" style="left:33.4%">z=10<br><span style="font-size:8px;opacity:0.7">reion.</span></span>' +
        '    <span class="hub-tick" style="left:100%">z=1100<br><span style="font-size:8px;opacity:0.7">CMB</span></span>' +
        '  </div>' +
        '</div>';

    const zSlider = controlsEl.querySelector('#hub-z');
    const zVal = controlsEl.querySelector('#hub-z-val');
    zSlider.oninput = function() {
        const v = parseFloat(this.value);
        currentZ = Math.exp(v * Math.log(1101) / 100) - 1;
        if (currentZ < 0.01) currentZ = 0;
        zVal.textContent = 'z = ' + currentZ.toFixed(2);
    };

    function draw() {
        ctx.clearRect(0, 0, W, H);
        const now = performance.now() / 1000;

        const sigma = 1 / (1 + Math.exp(-(currentZ - 0.7) / 0.3));
        const H0 = 67.4 + (73.0 - 67.4) * (1 - sigma);
        const a = 1 / (1 + currentZ);

        // Grid section (left)
        const gridW = W * 0.55, gridH = H * 0.7;
        const gridX = W * 0.05, gridY = H * 0.15;
        const gridN = 7;

        for (let i = 0; i < gridN; i++) {
            for (let j = 0; j < gridN; j++) {
                const baseX = gridX + (i / (gridN - 1)) * gridW;
                const baseY = gridY + (j / (gridN - 1)) * gridH;

                // Wobble in viscous regime
                const wobX = sigma > 0.5 ? Math.sin(now * 2 + i * j) * sigma * 4 : 0;
                const wobY = sigma > 0.5 ? Math.cos(now * 1.7 + i + j) * sigma * 4 : 0;
                const nx = baseX + wobX;
                const ny = baseY + wobY;

                // Dot color: blue (elastic) to pink (viscous)
                const r = Math.floor(56 + (244 - 56) * sigma);
                const g = Math.floor(189 + (114 - 189) * sigma);
                const b_c = Math.floor(248 + (182 - 248) * sigma);

                ctx.beginPath(); ctx.arc(nx, ny, 3, 0, Math.PI * 2);
                ctx.fillStyle = `rgba(${r},${g},${b_c},0.8)`;
                ctx.fill();

                // Connections to neighbors
                if (i < gridN - 1) {
                    const nnx = gridX + ((i+1) / (gridN-1)) * gridW + (sigma > 0.5 ? Math.sin(now * 2 + (i+1) * j) * sigma * 4 : 0);
                    const nny = baseY + (sigma > 0.5 ? Math.cos(now * 1.7 + (i+1) + j) * sigma * 4 : 0);
                    ctx.strokeStyle = `rgba(${r},${g},${b_c},0.2)`;
                    ctx.lineWidth = sigma > 0.5 ? 0.5 : 1;
                    if (sigma > 0.5) ctx.setLineDash([3, 3]);
                    ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nnx, nny); ctx.stroke();
                    ctx.setLineDash([]);
                }
                if (j < gridN - 1) {
                    const nnx = baseX + (sigma > 0.5 ? Math.sin(now * 2 + i * (j+1)) * sigma * 4 : 0);
                    const nny = gridY + ((j+1) / (gridN-1)) * gridH + (sigma > 0.5 ? Math.cos(now * 1.7 + i + (j+1)) * sigma * 4 : 0);
                    ctx.strokeStyle = `rgba(${r},${g},${b_c},0.2)`;
                    ctx.lineWidth = sigma > 0.5 ? 0.5 : 1;
                    if (sigma > 0.5) ctx.setLineDash([3, 3]);
                    ctx.beginPath(); ctx.moveTo(nx, ny); ctx.lineTo(nnx, nny); ctx.stroke();
                    ctx.setLineDash([]);
                }
            }
        }

        // Expansion arrows
        const arrowCx = gridX + gridW / 2, arrowCy = gridY + gridH / 2;
        const arrowLen = Math.min(gridW, gridH) * 0.15 * (1 + sigma * 0.5);
        ctx.strokeStyle = `rgba(${Math.floor(56 + 188 * sigma)},${Math.floor(189 - 75 * sigma)},${Math.floor(248 - 66 * sigma)},0.3)`;
        ctx.lineWidth = 1.5;
        for (let a_ = 0; a_ < 8; a_++) {
            const ang = (a_ / 8) * Math.PI * 2;
            const ex = arrowCx + Math.cos(ang) * arrowLen;
            const ey = arrowCy + Math.sin(ang) * arrowLen;
            ctx.beginPath(); ctx.moveTo(arrowCx + Math.cos(ang) * 15, arrowCy + Math.sin(ang) * 15);
            ctx.lineTo(ex, ey); ctx.stroke();
            // Arrow head
            const headLen = 6;
            ctx.beginPath();
            ctx.moveTo(ex, ey);
            ctx.lineTo(ex - headLen * Math.cos(ang - 0.4), ey - headLen * Math.sin(ang - 0.4));
            ctx.lineTo(ex - headLen * Math.cos(ang + 0.4), ey - headLen * Math.sin(ang + 0.4));
            ctx.closePath();
            ctx.fillStyle = ctx.strokeStyle;
            ctx.fill();
        }

        // Phase label
        const phaseLabel = sigma < 0.3 ? 'ELASTIC' : sigma > 0.7 ? 'VISCOUS' : 'TRANSITION';
        const phaseColor = sigma < 0.3 ? '#38bdf8' : sigma > 0.7 ? '#f472b6' : '#a78bfa';
        ctx.fillStyle = phaseColor; ctx.font = 'bold 12px JetBrains Mono'; ctx.textAlign = 'center';
        ctx.fillText(phaseLabel, arrowCx, gridY - 8);

        // H0 bar chart (right side)
        const chartX = W * 0.65, chartW2 = W * 0.3;
        const chartY = H * 0.25, chartH2 = H * 0.5;
        const bars = [
            { label: 'Planck', value: 67.4, color: '#38bdf8' },
            { label: 'UHF(z)', value: H0, color: '#06ffa5' },
            { label: 'SH0ES', value: 73.0, color: '#f472b6' },
        ];
        const barW = chartW2 / (bars.length * 2);
        const maxH0 = 80;

        // Axes
        ctx.strokeStyle = 'rgba(200,200,220,0.15)'; ctx.lineWidth = 1;
        ctx.beginPath(); ctx.moveTo(chartX, chartY); ctx.lineTo(chartX, chartY + chartH2); ctx.lineTo(chartX + chartW2, chartY + chartH2); ctx.stroke();

        ctx.fillStyle = 'rgba(200,200,220,0.3)'; ctx.font = '9px JetBrains Mono'; ctx.textAlign = 'right';
        for (let v = 60; v <= 80; v += 5) {
            const y = chartY + chartH2 - ((v - 55) / (maxH0 - 55)) * chartH2;
            ctx.fillText(v.toString(), chartX - 5, y + 3);
            ctx.strokeStyle = 'rgba(200,200,220,0.05)';
            ctx.beginPath(); ctx.moveTo(chartX, y); ctx.lineTo(chartX + chartW2, y); ctx.stroke();
        }

        bars.forEach((bar, i) => {
            const bx = chartX + 15 + i * (barW + 20);
            const bh = ((bar.value - 55) / (maxH0 - 55)) * chartH2;
            const by = chartY + chartH2 - bh;

            const isActive = (bar.label === 'Planck' && sigma < 0.3) ||
                             (bar.label === 'SH0ES' && sigma > 0.7) ||
                             bar.label === 'UHF(z)';

            ctx.fillStyle = isActive ? bar.color : 'rgba(90,94,106,0.3)';
            ctx.fillRect(bx, by, barW, bh);
            if (isActive) {
                ctx.fillStyle = bar.color.replace(')', ',0.15)').replace('rgb', 'rgba');
                ctx.fillRect(bx - 2, by - 2, barW + 4, bh + 4);
            }

            ctx.fillStyle = isActive ? bar.color : 'rgba(90,94,106,0.5)';
            ctx.font = 'bold 11px JetBrains Mono'; ctx.textAlign = 'center';
            ctx.fillText(bar.value.toFixed(1), bx + barW / 2, by - 8);
            ctx.font = '9px JetBrains Mono';
            ctx.fillText(bar.label, bx + barW / 2, chartY + chartH2 + 15);
        });

        ctx.fillStyle = 'rgba(200,200,220,0.3)'; ctx.font = '10px JetBrains Mono'; ctx.textAlign = 'center';
        ctx.fillText('H\u2080 (km/s/Mpc)', chartX + chartW2 / 2, chartY + chartH2 + 30);

        // Title
        ctx.fillStyle = '#06ffa5'; ctx.font = 'bold 14px JetBrains Mono'; ctx.textAlign = 'center';
        ctx.fillText('VISCOELASTIC COSMIC EXPANSION', W / 2, 25);
        ctx.fillStyle = 'rgba(200,200,220,0.4)'; ctx.font = '11px JetBrains Mono';
        ctx.fillText('Hubble tension resolved: elastic (z>0.7) \u2192 viscous (z<0.7)', W / 2, 42);

        hudEl.innerHTML =
            '<div class="hud-card"><div class="hud-label">H\u2080 at z</div><div class="hud-value">' + H0.toFixed(1) + '</div><div class="hud-sub">km/s/Mpc</div></div>' +
            '<div class="hud-card"><div class="hud-label">Regime</div><div class="hud-value" style="color:' + phaseColor + '">' + phaseLabel + '</div><div class="hud-sub">\u03C3=' + sigma.toFixed(2) + '</div></div>' +
            '<div class="hud-card"><div class="hud-label">Redshift</div><div class="hud-value">z = ' + currentZ.toFixed(2) + '</div><div class="hud-sub">a = ' + a.toFixed(4) + '</div></div>' +
            '<div class="hud-card"><div class="hud-label">Scale Factor</div><div class="hud-value">' + a.toFixed(4) + '</div><div class="hud-sub">a = 1/(1+z)</div></div>';

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
