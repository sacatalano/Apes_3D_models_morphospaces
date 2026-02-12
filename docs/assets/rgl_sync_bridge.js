 (function () {
  // --- Helpers ---
  function getRglInstance() {
    const el = document.querySelector(".rglWebGL");
    return el && el.rglinstance ? el.rglinstance : null;
  }

  function pickPar3d(par3d) {
    if (!par3d) return null;
    // Mandamos lo mínimo necesario para “ver lo mismo”
    const keys = [
      "userMatrix",
      "userProjection",
      "zoom",
      "FOV",
      "scale",
      "bbox",
      "viewport",
      "listeners"
    ];
    const out = {};
    for (const k of keys) if (par3d[k] != null) out[k] = par3d[k];
    return out;
  }

  function getPar3d(inst) {
    // rglwidget suele tener scene.par3d
    const p = inst?.scene?.par3d;
    return pickPar3d(p);
  }

  function applyPar3d(inst, state) {
    if (!inst || !state) return;
    // Intento 1: API (si existe)
    if (typeof inst.setpar3d === "function") {
      inst.setpar3d(state);
      return;
    }
    // Intento 2: escribir en scene.par3d
    if (inst.scene && inst.scene.par3d) {
      Object.assign(inst.scene.par3d, state);
      if (typeof inst.drawScene === "function") inst.drawScene();
      return;
    }
  }

  // --- Sync state ---
  let applyingRemote = false;
  let lastSent = "";
  let lastActiveTs = 0;

  // Avisar cuál visor está “activo” (última interacción)
  function markActive() {
    lastActiveTs = Date.now();
    window.parent?.postMessage({ type: "RGL_ACTIVE", ts: lastActiveTs }, "*");
  }

  // Detectar interacciones
  ["pointerdown", "mousedown", "touchstart", "wheel"].forEach((ev) => {
    window.addEventListener(ev, markActive, { capture: true, passive: true });
  });

  // Enviar cámara periódicamente (throttle)
  function tick() {
    const inst = getRglInstance();
    if (inst && !applyingRemote) {
      const state = getPar3d(inst);
      if (state) {
        const sig = JSON.stringify(state);
        if (sig !== lastSent) {
          lastSent = sig;
          window.parent?.postMessage({ type: "RGL_CAM", state }, "*");
        }
      }
    }
    window.requestAnimationFrame(tick);
  }
  window.requestAnimationFrame(tick);

  // Recibir cámara desde el parent
  window.addEventListener("message", (e) => {
    if (!e?.data) return;
    if (e.data.type !== "RGL_SET_CAM") return;

    const inst = getRglInstance();
    if (!inst) return;

    applyingRemote = true;
    try {
      applyPar3d(inst, e.data.state);
    } finally {
      // Evita loop (deja respirar 1 frame)
      setTimeout(() => (applyingRemote = false), 0);
    }
  });
})();
