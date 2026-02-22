import * as THREE from 'three';

export function init(viewport, controlsEl, hudEl) {
    const W0 = viewport.clientWidth, H0 = viewport.clientHeight;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(55, W0 / H0, 0.1, 100);
    camera.position.set(0, 3, 8);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setSize(W0, H0);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x06060e, 1);
    viewport.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x1a1a4e, 0.4));
    const pl1 = new THREE.PointLight(0x38bdf8, 2, 20); pl1.position.set(3, 5, 3); scene.add(pl1);
    const pl2 = new THREE.PointLight(0x06ffa5, 1, 15); pl2.position.set(-3, -2, -3); scene.add(pl2);
    const grid = new THREE.GridHelper(20, 40, 0x1a1a3a, 0x0d0d24); grid.position.y = -3; scene.add(grid);

    let decay = 1.0;
    let tube = null;
    let time = 0;
    let camSpeed = 0.15;
    let conservation = 0;
    let raf;

    // ── Phonon Particle System ──
    const N_PHONONS = 250;
    const phPositions = new Float32Array(N_PHONONS * 3);
    const phColors    = new Float32Array(N_PHONONS * 3);
    const phVelocities = [];
    for (let i = 0; i < N_PHONONS; i++) {
        const t0 = Math.random() * Math.PI * 2;
        phPositions[i*3]   = (Math.sin(t0) + 2*Math.sin(2*t0)) + (Math.random()-0.5)*0.5;
        phPositions[i*3+1] = (Math.cos(t0) - 2*Math.cos(2*t0)) + (Math.random()-0.5)*0.5;
        phPositions[i*3+2] = -Math.sin(3*t0) + (Math.random()-0.5)*0.5;
        phVelocities.push(new THREE.Vector3(
            (Math.random()-0.5)*0.04,
            (Math.random()-0.5)*0.04,
            (Math.random()-0.5)*0.04
        ));
        phColors[i*3]   = 0.22; phColors[i*3+1] = 0.74; phColors[i*3+2] = 0.97;
    }
    const phGeo = new THREE.BufferGeometry();
    phGeo.setAttribute('position', new THREE.BufferAttribute(phPositions, 3));
    phGeo.setAttribute('color',    new THREE.BufferAttribute(phColors, 3));
    const phMat = new THREE.PointsMaterial({ size: 0.06, vertexColors: true, transparent: true, opacity: 0.75 });
    const phSystem = new THREE.Points(phGeo, phMat);
    scene.add(phSystem);

    function generateTrefoil(d) {
        const N = 150, pts = [];
        for (let i = 0; i < N; i++) {
            const t = (i / N) * 2 * Math.PI;
            let x = (Math.sin(t) + 2 * Math.sin(2 * t)) * d;
            let y = (Math.cos(t) - 2 * Math.cos(2 * t)) * d;
            let z = (-Math.sin(3 * t)) * d;
            if (d < 1) {
                const dd = 1 - d;
                x += dd * 1.5 * Math.sin(7*t + dd*5) * (0.5 + 0.5*Math.cos(3*t));
                y += dd * 1.5 * Math.cos(5*t + dd*3) * (0.5 + 0.5*Math.sin(4*t));
                z += dd * 2.0 * Math.sin(9*t + dd*7) * Math.cos(2*t);
                if (dd > 0.4) {
                    x += dd*dd * Math.sin(23*t) * 0.8;
                    y += dd*dd * Math.cos(19*t) * 0.8;
                    z += dd*dd * Math.sin(17*t) * 0.8;
                }
            }
            pts.push(new THREE.Vector3(x, y, z));
        }
        return pts;
    }

    function computeH(pts) {
        const N = pts.length;
        let H = 0, H0 = 0;
        for (let i = 0; i < N; i++) {
            const p = pts[i], pn = pts[(i+1) % N];
            H += p.distanceToSquared(pn);
            const t0 = (i / N) * 2 * Math.PI, t1 = ((i+1) / N) * 2 * Math.PI;
            const x0 = Math.sin(t0)+2*Math.sin(2*t0), x1 = Math.sin(t1)+2*Math.sin(2*t1);
            const y0 = Math.cos(t0)-2*Math.cos(2*t0), y1 = Math.cos(t1)-2*Math.cos(2*t1);
            const z0 = -Math.sin(3*t0), z1 = -Math.sin(3*t1);
            H0 += (x1-x0)*(x1-x0)+(y1-y0)*(y1-y0)+(z1-z0)*(z1-z0);
        }
        return ((H - H0) / H0) * 100;
    }

    function buildTube(pts, d) {
        if (tube) { tube.geometry.dispose(); tube.material.dispose(); scene.remove(tube); }
        const curve = new THREE.CatmullRomCurve3(pts, true);
        const radius = 0.08 * d + 0.02;
        const geo = new THREE.TubeGeometry(curve, Math.min(pts.length, 200), radius, 8, true);
        const mat = new THREE.MeshPhongMaterial({
            color: 0x38bdf8, emissive: 0x0a1a3a, transparent: true,
            opacity: 0.3 + 0.6 * d, shininess: 80
        });
        tube = new THREE.Mesh(geo, mat);
        scene.add(tube);
    }

    function updateHUD() {
        const topo = decay > 0.5 ? 'TREFOIL 3\u2081' : decay > 0.1 ? 'DISSOLVING' : 'PHONON GAS';
        hudEl.innerHTML =
            '<div class="hud-card"><div class="hud-label">Hamiltonian \u0394H/H\u2080</div><div class="hud-value" style="color:#38bdf8">' + conservation.toFixed(2) + '%</div><div class="hud-sub">energy deviation</div></div>' +
            '<div class="hud-card"><div class="hud-label">Decay Factor</div><div class="hud-value" style="color:#38bdf8">' + decay.toFixed(2) + '</div><div class="hud-sub">1.00 = intact</div></div>' +
            '<div class="hud-card"><div class="hud-label">Topology</div><div class="hud-value" style="color:#38bdf8">' + topo + '</div><div class="hud-sub">non-axiomatic Beltrami</div></div>' +
            '<div class="hud-card"><div class="hud-label">Dissipation</div><div class="hud-value" style="color:#38bdf8">' + ((1-decay)*100).toFixed(0) + '%</div><div class="hud-sub">knot \u2192 phonon</div></div>';
    }

    // Initial build
    let pts = generateTrefoil(1.0);
    buildTube(pts, 1.0);
    conservation = computeH(pts);

    // Controls
    controlsEl.innerHTML =
        '<span class="ctrl-label">DISSIPATION</span>' +
        '<input type="range" class="ctrl-slider" min="0" max="100" step="1" value="0" id="trefoil-decay">' +
        '<span class="ctrl-value" id="trefoil-decay-val" style="color:#38bdf8">0%</span>' +
        '<span class="ctrl-sep"></span>' +
        '<span class="ctrl-label">CAMERA</span>' +
        '<input type="range" class="ctrl-slider" min="0" max="100" step="1" value="30" id="trefoil-cam">';

    controlsEl.querySelector('#trefoil-decay').oninput = function() {
        const pct = parseInt(this.value);
        decay = 1.0 - pct / 100;
        controlsEl.querySelector('#trefoil-decay-val').textContent = pct + '%';
        pts = generateTrefoil(decay);
        buildTube(pts, decay);
        conservation = computeH(pts);
        updateHUD();
    };
    controlsEl.querySelector('#trefoil-cam').oninput = function() {
        camSpeed = parseInt(this.value) / 200;
    };

    updateHUD();

    function animate() {
        time += 0.016;
        camera.position.x = 8 * Math.cos(time * camSpeed);
        camera.position.z = 8 * Math.sin(time * camSpeed);
        camera.position.y = 3 + Math.sin(time * camSpeed * 0.7);
        camera.lookAt(0, 0, 0);

        // ── Update phonon particles ──
        const dispersion = 1 - decay; // 0=intact knot, 1=full phonon gas
        for (let i = 0; i < N_PHONONS; i++) {
            const v = phVelocities[i];
            // When knot is intact: particles orbit around it tightly
            // When decayed: they scatter outward as free phonons
            const px = phPositions[i*3], py = phPositions[i*3+1], pz = phPositions[i*3+2];
            const rr = Math.sqrt(px*px + py*py + pz*pz);

            if (dispersion < 0.7) {
                // Attraction toward knot tube
                const attractF = 0.002 * (1 - dispersion);
                v.x += -px / rr * attractF;
                v.y += -py / rr * attractF;
                v.z += -pz / rr * attractF;
                // Orbital tangential kick
                v.x += (-py + pz) * 0.0005;
                v.y += (px  + pz) * 0.0005;
                v.z += (-px - py) * 0.0005;
                // Speed clamp when bound
                const spd = Math.sqrt(v.x*v.x + v.y*v.y + v.z*v.z);
                if (spd > 0.05) { v.x *= 0.05/spd; v.y *= 0.05/spd; v.z *= 0.05/spd; }
            } else {
                // Free expansion
                v.x += (Math.random()-0.5)*0.002 * dispersion;
                v.y += (Math.random()-0.5)*0.002 * dispersion;
                v.z += (Math.random()-0.5)*0.002 * dispersion;
            }

            // Boundary: reset if too far
            if (rr > 6) {
                const t0 = Math.random() * Math.PI * 2;
                phPositions[i*3]   = (Math.sin(t0) + 2*Math.sin(2*t0))*decay + (Math.random()-0.5)*0.5;
                phPositions[i*3+1] = (Math.cos(t0) - 2*Math.cos(2*t0))*decay + (Math.random()-0.5)*0.5;
                phPositions[i*3+2] = -Math.sin(3*t0)*decay + (Math.random()-0.5)*0.5;
                v.set((Math.random()-0.5)*0.04, (Math.random()-0.5)*0.04, (Math.random()-0.5)*0.04);
            } else {
                phPositions[i*3]   += v.x;
                phPositions[i*3+1] += v.y;
                phPositions[i*3+2] += v.z;
            }

            // Color: cyan (bound) → green (phonon)
            phColors[i*3]   = 0.22 * (1-dispersion) + 0.024*dispersion;
            phColors[i*3+1] = 0.74 * (1-dispersion) + 1.0*dispersion;
            phColors[i*3+2] = 0.97 * (1-dispersion) + 0.65*dispersion;
        }
        phGeo.attributes.position.needsUpdate = true;
        phGeo.attributes.color.needsUpdate = true;
        phMat.opacity = 0.5 + 0.4*dispersion;

        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
    }
    animate();

    function onResize() {
        const w = viewport.clientWidth, h = viewport.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    }
    window.addEventListener('resize', onResize);

    return {
        destroy() {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', onResize);
            if (tube) { tube.geometry.dispose(); tube.material.dispose(); scene.remove(tube); }
            phGeo.dispose(); phMat.dispose();
            pl1.dispose(); pl2.dispose();
            grid.geometry.dispose(); grid.material.dispose();
            renderer.dispose();
            renderer.forceContextLoss();
            renderer.domElement.remove();
        }
    };
}
