import * as THREE from 'three';

export function init(viewport, controlsEl, hudEl) {
    const W = viewport.clientWidth, H = viewport.clientHeight;
    
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(50, W / H, 0.1, 100);
    camera.position.set(0, 2, 5);
    camera.lookAt(0, 0, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(W, H);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setClearColor(0x060612, 1);
    viewport.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0x8080c0, 1.2));
    const pl1 = new THREE.PointLight(0x06ffa5, 3.5, 20);
    pl1.position.set(5, 5, 5);
    scene.add(pl1);
    const pl2 = new THREE.PointLight(0x7c3aed, 2.0, 15);
    pl2.position.set(-3, -2, -3);
    scene.add(pl2);

    const grid = new THREE.GridHelper(20, 40, 0x1a1a3a, 0x0d0d24);
    grid.position.y = -3;
    scene.add(grid);

    // Torus knot
    const torusGeo = new THREE.TorusKnotGeometry(1.2, 0.35, 128, 32, 2, 3);
    const torusMat = new THREE.MeshStandardMaterial({
        color: 0x9d5fff,
        emissive: 0x3a0a7c,
        emissiveIntensity: 0.4,
        metalness: 0.3,
        roughness: 0.25,
        transparent: true,
        opacity: 0.92,
    });
    const mesh = new THREE.Mesh(torusGeo, torusMat);
    scene.add(mesh);

    // Kuramoto particles
    let kuraEnabled = false;
    let wireframeMode = false;
    const N = 300;
    const kuraParticles = [];
    const positions = new Float32Array(N * 3);
    const colors = new Float32Array(N * 3);

    for (let i = 0; i < N; i++) {
        kuraParticles.push({
            phase: Math.random() * Math.PI * 2,
            omega: 0.5 + Math.random() * 2,
            radius: 1.5 + Math.random() * 0.8,
            theta: Math.random() * Math.PI * 2,
            phi: Math.random() * Math.PI * 2,
        });
    }

    const particleGeo = new THREE.BufferGeometry();
    particleGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    particleGeo.setAttribute('color', new THREE.BufferAttribute(colors, 3));
    const particleMat = new THREE.PointsMaterial({
        size: 0.04,
        vertexColors: true,
        transparent: true,
        opacity: 0.8,
    });
    const particleSys = new THREE.Points(particleGeo, particleMat);
    scene.add(particleSys);

    // Mouse interaction
    let mouseX = 0, mouseY = 0;
    const onMouseMove = (e) => {
        const rect = viewport.getBoundingClientRect();
        mouseX = ((e.clientX - rect.left) / rect.width - 0.5) * 2;
        mouseY = ((e.clientY - rect.top) / rect.height - 0.5) * 2;
    };
    viewport.addEventListener('mousemove', onMouseMove);

    // Controls
    controlsEl.innerHTML =
        '<button class="ctrl-btn" id="kura-toggle">\u27F3 Kuramoto: OFF</button>' +
        '<span class="ctrl-sep"></span>' +
        '<button class="ctrl-btn" id="wire-toggle">\u25C7 Wireframe</button>';

    const kuraBtn = controlsEl.querySelector('#kura-toggle');
    const wireBtn = controlsEl.querySelector('#wire-toggle');

    kuraBtn.onclick = () => {
        kuraEnabled = !kuraEnabled;
        kuraBtn.textContent = '\u27F3 Kuramoto: ' + (kuraEnabled ? 'ON' : 'OFF');
        kuraBtn.classList.toggle('active', kuraEnabled);
        updateHUD();
    };
    wireBtn.onclick = () => {
        wireframeMode = !wireframeMode;
        torusMat.wireframe = wireframeMode;
        wireBtn.classList.toggle('active', wireframeMode);
    };

    function updateHUD() {
        const orderR = kuraEnabled ? 'computing...' : 'N/A';
        hudEl.innerHTML =
            '<div class="hud-card"><div class="hud-label">Topology</div><div class="hud-value" style="color:#7c3aed">Trefoil (2,3)</div><div class="hud-sub">quantized vortex</div></div>' +
            '<div class="hud-card"><div class="hud-label">Particles</div><div class="hud-value" style="color:#7c3aed">' + N + '</div><div class="hud-sub">phase oscillators</div></div>' +
            '<div class="hud-card"><div class="hud-label">Kuramoto Sync</div><div class="hud-value" style="color:#7c3aed">' + (kuraEnabled ? 'ACTIVE' : 'OFF') + '</div><div class="hud-sub">K=3.0 coupling</div></div>' +
            '<div class="hud-card"><div class="hud-label">Order Param r</div><div class="hud-value" id="kura-r" style="color:#7c3aed">0.00</div><div class="hud-sub">mean-field coherence</div></div>';
    }
    updateHUD();

    let raf;
    let time = 0;

    function animate() {
        time += 0.016;
        mesh.rotation.y = mouseX * 0.5 + time * 0.2;
        mesh.rotation.x = mouseY * 0.3;

        // Update Kuramoto particles
        const K = kuraEnabled ? 3.0 : 0;
        let sinSum = 0, cosSum = 0;

        for (let i = 0; i < N; i++) {
            const p = kuraParticles[i];
            sinSum += Math.sin(p.phase);
            cosSum += Math.cos(p.phase);
        }
        const meanPhase = Math.atan2(sinSum / N, cosSum / N);
        const orderR = Math.sqrt(sinSum * sinSum + cosSum * cosSum) / N;

        for (let i = 0; i < N; i++) {
            const p = kuraParticles[i];
            p.phase += (p.omega + K * orderR * Math.sin(meanPhase - p.phase)) * 0.016;
            p.theta += 0.3 * 0.016;
            p.phi += p.omega * 0.1 * 0.016;

            const r = p.radius + 0.3 * Math.sin(p.phase);
            positions[i * 3] = r * Math.sin(p.theta) * Math.cos(p.phi);
            positions[i * 3 + 1] = r * Math.cos(p.theta);
            positions[i * 3 + 2] = r * Math.sin(p.theta) * Math.sin(p.phi);

            const sync = kuraEnabled ? Math.abs(Math.cos(p.phase - meanPhase)) : 0;
            colors[i * 3] = 0.48 * (1 - sync) + 0.024 * sync;
            colors[i * 3 + 1] = 0.23 * (1 - sync) + 1.0 * sync;
            colors[i * 3 + 2] = 0.93 * (1 - sync) + 0.65 * sync;
        }

        particleGeo.attributes.position.needsUpdate = true;
        particleGeo.attributes.color.needsUpdate = true;

        // Update order parameter display
        const rEl = hudEl.querySelector('#kura-r');
        if (rEl) rEl.textContent = orderR.toFixed(3);

        renderer.render(scene, camera);
        raf = requestAnimationFrame(animate);
    }
    animate();

    const onWindowResize = () => {
        const w = viewport.clientWidth, h = viewport.clientHeight;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h);
    };
    window.addEventListener('resize', onWindowResize);

    return {
        destroy() {
            cancelAnimationFrame(raf);
            window.removeEventListener('resize', onWindowResize);
            viewport.removeEventListener('mousemove', onMouseMove);
            scene.traverse((obj) => {
                if (obj.geometry) obj.geometry.dispose();
                if (obj.material) {
                    if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose());
                    else obj.material.dispose();
                }
            });
            renderer.dispose();
            renderer.forceContextLoss();
            if (renderer.domElement && renderer.domElement.parentNode) {
                renderer.domElement.parentNode.removeChild(renderer.domElement);
            }
        }
    };
}
