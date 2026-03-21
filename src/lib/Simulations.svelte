<script>
import { onMount, onDestroy } from 'svelte';

const sims = [
  { id: 'mermin',     label: 'Non-Locality',    short: 'Mermin' },
  { id: 'lensing',    label: 'Lensing',         short: 'Lens' },
  { id: 'vortex',     label: 'Vortex Atom',     short: 'Vortex' },
  { id: 'vacuum',     label: 'Vacuum Energy',   short: 'Vacuum' },
  { id: 'shapiro',    label: 'Shapiro Delay',   short: 'Shapiro' },
  { id: 'mercury',    label: 'Mercury',         short: 'Mercury' },
  { id: 'casimir',    label: 'Casimir',         short: 'Casimir' },
  { id: 'hubble',     label: 'Hubble',          short: 'Hubble' },
  { id: 'cmb',        label: 'CMB Spectrum',    short: 'CMB' },
  { id: 'trefoil',    label: 'Trefoil',         short: 'Trefoil' },
  { id: 'lisa',       label: 'LISA Echo',        short: 'LISA' },
  { id: 'bjerknes',   label: 'Bjerknes Force',  short: 'Bjerknes' },
  { id: 'inertia',    label: 'Emergent Inertia', short: 'Inertia' },
  { id: 'dispersion', label: 'Pip & Tail',      short: 'Pip' },
  { id: 'hawking',    label: 'Hawking Pairs',   short: 'Hawking' },
  { id: 'nanograv',   label: 'NANOGrav Fit',    short: 'NANOGrav' },
  { id: 'collapse',   label: 'Galaxy Formation', short: 'Galaxy' },
  { id: 'alpha',      label: 'Fine Structure',  short: 'α' },
  { id: 'fluxtube',   label: 'Confinement',     short: 'Flux' },
  { id: 'coupling',   label: 'Running αs',       short: 'αs' },
  { id: 'born',       label: 'Born Rule',       short: 'Born' },
];

const loaders = {
  mermin:     () => import('./sims/mermin.js'),
  lensing:    () => import('./sims/lensing.js'),
  vortex:     () => import('./sims/vortex.js'),
  vacuum:     () => import('./sims/vacuum.js'),
  shapiro:    () => import('./sims/shapiro.js'),
  mercury:    () => import('./sims/mercury.js'),
  casimir:    () => import('./sims/casimir.js'),
  hubble:     () => import('./sims/hubble.js'),
  cmb:        () => import('./sims/cmb.js'),
  trefoil:    () => import('./sims/trefoil.js'),
  lisa:       () => import('./sims/lisa.js'),
  bjerknes:   () => import('./sims/bjerknes.js'),
  inertia:    () => import('./sims/inertia.js'),
  dispersion: () => import('./sims/dispersion.js'),
  hawking:    () => import('./sims/hawking.js'),
  nanograv:   () => import('./sims/nanograv.js'),
  collapse:   () => import('./sims/collapse.js'),
  alpha:      () => import('./sims/alpha.js'),
  fluxtube:   () => import('./sims/fluxtube.js'),
  coupling:   () => import('./sims/coupling.js'),
  born:       () => import('./sims/born.js'),
};

let active = 'mermin';
let viewportEl;
let controlsEl;
let hudEl;
let currentInstance = null;
let loading = false;

async function switchTo(id) {
  if (id === active && currentInstance) return;
  loading = true;

  // Destroy current
  if (currentInstance) {
    try { currentInstance.destroy(); } catch(_) {}
    currentInstance = null;
  }

  // Clear DOM
  if (viewportEl)  viewportEl.innerHTML = '';
  if (controlsEl)  controlsEl.innerHTML = '';
  if (hudEl)       hudEl.innerHTML = '';

  active = id;

  try {
    const mod = await loaders[id]();
    currentInstance = mod.init(viewportEl, controlsEl, hudEl);
  } catch (err) {
    console.error(`[Sim:${id}] init failed:`, err);
    if (viewportEl) {
      viewportEl.innerHTML = `<div style="display:flex;align-items:center;justify-content:center;height:100%;color:#5a5e6a;font:12px 'JetBrains Mono',monospace;">Failed to load simulation</div>`;
    }
  }

  loading = false;
}

onMount(() => {
  // DOM is ready, kick off first simulation
  if (viewportEl && controlsEl && hudEl) {
    switchTo('mermin');
  }
});

onDestroy(() => {
  if (currentInstance) {
    try { currentInstance.destroy(); } catch(_) {}
    currentInstance = null;
  }
});
</script>

<div class="glass rounded-2xl overflow-hidden">
  <!-- Tab bar -->
  <div class="sim-radiobar">
    {#each sims as sim}
      <button
        class="sim-tab"
        class:active={active === sim.id}
        on:click={() => switchTo(sim.id)}
      >
        <span class="dot"></span>
        <span class="hidden sm:inline">{sim.label}</span>
        <span class="sm:hidden">{sim.short}</span>
      </button>
    {/each}
  </div>

  <!-- Viewport -->
  <div class="sim-viewport" bind:this={viewportEl}>
    {#if loading}
      <div style="display:flex;align-items:center;justify-content:center;height:100%;">
        <div class="w-3 h-3 rounded-full bg-neon animate-pulse"></div>
      </div>
    {/if}
  </div>

  <!-- Controls bar -->
  <div class="sim-controls" bind:this={controlsEl}></div>

  <!-- HUD -->
  <div class="sim-hud" bind:this={hudEl}></div>
</div>
