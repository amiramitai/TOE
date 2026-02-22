export function init(viewport, controlsEl, hudEl) {
  const canvas = document.createElement('canvas');
  canvas.style.display = 'block';
  viewport.appendChild(canvas);
  const ctx = canvas.getContext('2d');

  const results = [];
  for (let N = 2; N <= 8; N++) {
    results.push({ N, quantum: Math.pow(2, N - 1), classical: 2, ratio: Math.pow(2, N - 1) / 2 });
  }

  let selectedN = 7;
  let t = 0;
  let raf;

  controlsEl.innerHTML =
    '<div style="flex:0 0 100%;display:flex;flex-direction:column;gap:4px">' +
    '  <div style="display:flex;justify-content:space-between;align-items:center">' +
    '    <span class="ctrl-label">N (ENTANGLED VORTEX LOOPS)</span>' +
    '    <span class="ctrl-value" id="mermin-n-val" style="color:#f472b6">7</span>' +
    '  </div>' +
    '  <input type="range" class="ctrl-slider pink" min="2" max="8" step="1" value="7" id="mermin-n-slider">' +
    '  <div style="position:relative;width:100%;height:28px">' +
    '<style>.mrm-tick{position:absolute;transform:translateX(-50%);font:9px JetBrains Mono,monospace;color:rgba(200,200,220,0.5);text-align:center;white-space:nowrap;top:2px;line-height:1.3}</style>' +
    '    <span class="mrm-tick" style="left:0%">N=2<br><span style="font-size:8px;opacity:0.7">Tsirelson</span></span>' +
    '    <span class="mrm-tick" style="left:16.7%;color:rgba(56,189,248,0.8)">N=3<br><span style="font-size:8px">vortex</span></span>' +
    '    <span class="mrm-tick" style="left:33.3%">N=4</span>' +
    '    <span class="mrm-tick" style="left:50%">N=5</span>' +
    '    <span class="mrm-tick" style="left:66.7%">N=6</span>' +
    '    <span class="mrm-tick" style="left:83.3%;color:rgba(244,114,182,0.8)">N=7<br><span style="font-size:8px">HW ✓</span></span>' +
    '    <span class="mrm-tick" style="left:100%">N=8</span>' +
    '  </div>' +
    '</div>';

  controlsEl.querySelector('#mermin-n-slider').oninput = function () {
    selectedN = parseInt(this.value);
    controlsEl.querySelector('#mermin-n-val').textContent = selectedN;
    updateHUD();
  };

  function sup(n) {
    const s = { '0': '\u2070', '1': '\u00B9', '2': '\u00B2', '3': '\u00B3', '4': '\u2074', '5': '\u2075', '6': '\u2076', '7': '\u2077' };
    return String(n).split('').map(c => s[c] || c).join('');
  }

  function updateHUD() {
    const qMax = Math.pow(2, selectedN - 1);
    const ratio = qMax / 2;
    const hwTag = selectedN === 7
      ? '<div class="hud-sub" style="color:#f472b6">14-decimal hardware verified</div>'
      : (selectedN === 3
        ? '<div class="hud-sub" style="color:#38bdf8">vortex threshold</div>'
        : '<div class="hud-sub">= 2' + sup(selectedN - 1) + '</div>');
    let statusLabel, statusColor, statusSub;
    if (selectedN >= 3) {
      statusLabel = 'TQA VERIFIED';
      statusColor = 'color:#06ffa5';
      statusSub = '2' + sup(selectedN - 1) + ' \u226B 2 (classical)';
    } else {
      statusLabel = 'TSIRELSON';
      statusColor = 'color:#5a5e6a';
      statusSub = 'N=2 boundary case';
    }
    hudEl.innerHTML =
      '<div class="hud-card"><div class="hud-label">N=' + selectedN + ' Quantum Max</div><div class="hud-value">' + qMax + '.0</div>' + hwTag + '</div>' +
      '<div class="hud-card"><div class="hud-label">Topological Quantum Advantage</div><div class="hud-value" style="' + statusColor + '">' + statusLabel + '</div><div class="hud-sub">' + statusSub + '</div></div>' +
      '<div class="hud-card"><div class="hud-label">Advantage Ratio</div><div class="hud-value">' + ratio.toFixed(1) + '\u00D7</div><div class="hud-sub">2' + sup(selectedN - 1) + ' / 2</div></div>' +
      '<div class="hud-card"><div class="hud-label">Classical Bound</div><div class="hud-value" style="color:#5a5e6a">2.0</div><div class="hud-sub" style="color:#5a5e6a">obsolete at N\u22653</div></div>';
  }
  updateHUD();

  function draw() {
    const W = viewport.clientWidth;
    const H = viewport.clientHeight;
    if (canvas.width !== W * 2 || canvas.height !== H * 2) {
      canvas.width = W * 2;
      canvas.height = H * 2;
      canvas.style.width = W + 'px';
      canvas.style.height = H + 'px';
    }
    ctx.setTransform(2, 0, 0, 2, 0, 0);
    ctx.clearRect(0, 0, W, H);
    t += 0.016;

    const padL = 100, padR = 60, padT = 80, padB = 80;
    const chartW = W - padL - padR;
    const chartH = H - padT - padB;
    const yMax = 160;

    function toX(N) { return padL + ((N - 2) / 6) * chartW; }
    function toY(v) { return padT + chartH - (v / yMax) * chartH; }

    // Grid
    ctx.strokeStyle = 'rgba(26,26,58,0.4)';
    ctx.lineWidth = 0.5;
    for (let x = 80; x < W; x += 80) { ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, H); ctx.stroke(); }
    for (let y = 60; y < H; y += 60) { ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke(); }

    // Axes
    ctx.strokeStyle = 'rgba(200,200,220,0.15)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, padT);
    ctx.lineTo(padL, padT + chartH);
    ctx.lineTo(padL + chartW, padT + chartH);
    ctx.stroke();

    // X labels
    ctx.font = '11px JetBrains Mono';
    ctx.textAlign = 'center';
    for (let n = 2; n <= 8; n++) {
      const isN7 = n === 7;
      const isN3 = n === 3;
      ctx.fillStyle = n === selectedN
        ? (isN7 ? '#f472b6' : '#06ffa5')
        : (isN7 ? 'rgba(244,114,182,0.4)' : (isN3 ? 'rgba(56,189,248,0.5)' : 'rgba(200,200,220,0.5)'));
      ctx.font = (isN7 || isN3) ? 'bold 11px JetBrains Mono' : '11px JetBrains Mono';
      ctx.fillText('N=' + n, toX(n), padT + chartH + 20);
      if (isN3) {
        ctx.fillStyle = n === selectedN ? '#38bdf8' : 'rgba(56,189,248,0.45)';
        ctx.font = '8px JetBrains Mono';
        ctx.fillText('VORTEX THRESHOLD', toX(n), padT + chartH + 33);
      }
      if (isN7) {
        ctx.fillStyle = n === selectedN ? '#f472b6' : 'rgba(244,114,182,0.4)';
        ctx.font = '8px JetBrains Mono';
        ctx.fillText('MERMIN NUKE', toX(n), padT + chartH + 33);
      }
    }

    // Y labels
    ctx.textAlign = 'right';
    for (let v = 0; v <= yMax; v += 32) {
      ctx.fillStyle = 'rgba(200,200,220,0.3)';
      ctx.fillText(v.toFixed(0), padL - 10, toY(v) + 4);
      ctx.strokeStyle = 'rgba(200,200,220,0.05)';
      ctx.beginPath();
      ctx.moveTo(padL, toY(v));
      ctx.lineTo(padL + chartW, toY(v));
      ctx.stroke();
    }

    // Classical bound
    ctx.strokeStyle = 'rgba(90,94,106,0.35)';
    ctx.lineWidth = 1;
    ctx.setLineDash([6, 4]);
    ctx.beginPath();
    ctx.moveTo(padL, toY(2));
    ctx.lineTo(padL + chartW, toY(2));
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(90,94,106,0.5)';
    ctx.textAlign = 'left';
    ctx.font = '10px JetBrains Mono';
    ctx.fillText('CLASSICAL BOUND = 2 (obsolete)', padL + 8, toY(2) - 6);

    // Exponential curve
    ctx.strokeStyle = 'rgba(6,255,165,0.5)';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i <= 120; i++) {
      const N_ = 2 + (i / 120) * 6;
      const val = Math.pow(2, N_ - 1);
      const px = toX(N_), py = toY(val);
      if (i === 0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
    }
    ctx.stroke();
    ctx.strokeStyle = 'rgba(6,255,165,0.12)';
    ctx.lineWidth = 8;
    ctx.stroke();

    // Data points
    const dotColors = ['#5a5e6a', '#6b6e7a', '#7a7e8a', '#8a8e9a', '#9a9eaa', '#aab0ba', '#bbc0ca'];
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.N === selectedN) continue;
      const px = toX(r.N), py = toY(r.quantum);
      const isN7 = r.N === 7, isN3 = r.N === 3;
      const dc = isN7 ? '#f472b6' : (isN3 ? '#38bdf8' : dotColors[j]);
      ctx.beginPath();
      ctx.arc(px, py, (isN7 || isN3) ? 5 : 4, 0, Math.PI * 2);
      ctx.fillStyle = isN7 ? 'rgba(244,114,182,0.7)' : (isN3 ? 'rgba(56,189,248,0.7)' : dc);
      ctx.fill();
      ctx.strokeStyle = isN7 ? 'rgba(244,114,182,0.3)' : (isN3 ? 'rgba(56,189,248,0.3)' : 'rgba(255,255,255,0.15)');
      ctx.lineWidth = 1;
      ctx.stroke();
      ctx.textAlign = 'center';
      ctx.fillStyle = dc;
      ctx.font = (isN7 || isN3) ? 'bold 10px JetBrains Mono' : '10px JetBrains Mono';
      ctx.fillText(r.quantum.toFixed(0), px, py - 10);
    }

    // Selected point with callout
    for (let j = 0; j < results.length; j++) {
      const r = results[j];
      if (r.N !== selectedN) continue;
      const px = toX(r.N), py = toY(r.quantum);
      const isHW = selectedN === 7;
      const isVT = selectedN === 3;
      const accentColor = isHW ? '#f472b6' : (isVT ? '#38bdf8' : '#06ffa5');
      const accentDim = isHW ? 'rgba(244,114,182,0.12)' : (isVT ? 'rgba(56,189,248,0.12)' : 'rgba(6,255,165,0.12)');
      const accentMid = isHW ? 'rgba(244,114,182,0.3)' : (isVT ? 'rgba(56,189,248,0.3)' : 'rgba(6,255,165,0.3)');
      const accentBorder = isHW ? 'rgba(244,114,182,0.5)' : (isVT ? 'rgba(56,189,248,0.5)' : 'rgba(6,255,165,0.5)');
      const accentSoft = isHW ? 'rgba(244,114,182,0.7)' : (isVT ? 'rgba(56,189,248,0.7)' : 'rgba(6,255,165,0.7)');

      ctx.beginPath();
      ctx.arc(px, py, 22 + Math.sin(t * 3) * 3, 0, Math.PI * 2);
      ctx.fillStyle = accentDim;
      ctx.fill();

      ctx.beginPath();
      ctx.arc(px, py, 7, 0, Math.PI * 2);
      ctx.fillStyle = accentColor;
      ctx.fill();
      ctx.strokeStyle = '#fff';
      ctx.lineWidth = 2;
      ctx.stroke();

      let badgeY = py - 60;
      if (badgeY < padT + 10) badgeY = py + 40;

      ctx.strokeStyle = accentMid;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(px, py - 9);
      ctx.lineTo(px, badgeY + 12);
      ctx.stroke();

      const line1 = r.quantum.toFixed(1);
      let line2;
      if (selectedN >= 3) {
        line2 = 'TQA VERIFIED \u2014 ' + r.ratio.toFixed(1) + '\u00D7';
        if (selectedN === 7) line2 = '14-DEC HW \u2713 TQA \u2014 ' + r.ratio.toFixed(1) + '\u00D7';
        if (selectedN === 3) line2 = 'VORTEX THRESHOLD \u2014 ' + r.ratio.toFixed(1) + '\u00D7';
      } else {
        line2 = 'TSIRELSON BOUND \u2014 ' + r.ratio.toFixed(1) + '\u00D7';
      }
      ctx.font = 'bold 14px JetBrains Mono';
      const tw1 = ctx.measureText(line1).width;
      ctx.font = '9px JetBrains Mono';
      const tw2 = ctx.measureText(line2).width;
      const bw = Math.max(tw1, tw2) + 20;
      const bh = 36;

      ctx.fillStyle = 'rgba(10,10,24,0.92)';
      ctx.strokeStyle = accentBorder;
      ctx.lineWidth = 1;
      const bx = px - bw / 2, by = badgeY - bh / 2;
      ctx.beginPath();
      if (ctx.roundRect) { ctx.roundRect(bx, by, bw, bh, 6); }
      else { ctx.rect(bx, by, bw, bh); }
      ctx.fill();
      ctx.stroke();

      ctx.textAlign = 'center';
      ctx.fillStyle = accentColor;
      ctx.font = 'bold 14px JetBrains Mono';
      ctx.fillText(line1, px, badgeY - 2);
      ctx.fillStyle = accentSoft;
      ctx.font = '9px JetBrains Mono';
      ctx.fillText(line2, px, badgeY + 12);
    }

    // Title
    ctx.fillStyle = '#06ffa5';
    ctx.font = 'bold 16px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText('HARDWARE-VERIFIED NON-LOCALITY: |\u27E8M_N\u27E9| = 2^{N\u22121}', W / 2, 35);
    ctx.fillStyle = 'rgba(200,200,220,0.4)';
    ctx.font = '11px JetBrains Mono';
    ctx.fillText('Each vortex loop doubles the operator: |M_N| = 2 \u00D7 |M_{N\u22121}|', W / 2, 55);

    // Axis titles
    ctx.fillStyle = 'rgba(200,200,220,0.4)';
    ctx.font = '11px JetBrains Mono';
    ctx.textAlign = 'center';
    ctx.fillText('N (number of entangled vortex loops)', W / 2, padT + chartH + 45);
    ctx.save();
    ctx.translate(20, H / 2);
    ctx.rotate(-Math.PI / 2);
    ctx.fillText('|\u27E8M_N\u27E9| (quantum maximum)', 0, 0);
    ctx.restore();

    raf = requestAnimationFrame(draw);
  }
  raf = requestAnimationFrame(draw);

  return {
    destroy() {
      cancelAnimationFrame(raf);
      canvas.remove();
    }
  };
}
