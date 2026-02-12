(function () {
  const iframes = Array.from(document.querySelectorAll("iframe"));
  if (iframes.length < 2) return;

  // Asumimos: 1º iframe = MIN, 2º iframe = MAX (ajustable)
  const A = iframes[0];
  const B = iframes[1];

  let active = "A"; // quién manda: A o B
  let lastActiveA = 0, lastActiveB = 0;

  function setActiveFrom(sender, ts) {
    if (sender === "A") lastActiveA = ts;
    if (sender === "B") lastActiveB = ts;
    active = lastActiveA >= lastActiveB ? "A" : "B";
  }

  window.addEventListener("message", (e) => {
    const d = e.data;
    if (!d || !d.type) return;

    const sender = (e.source === A.contentWindow) ? "A"
                 : (e.source === B.contentWindow) ? "B"
                 : null;
    if (!sender) return;

    if (d.type === "RGL_ACTIVE") {
      setActiveFrom(sender, d.ts || Date.now());
      return;
    }

    if (d.type === "RGL_CAM") {
      // Solo reenvía el que está activo (evita pelea)
      if (sender !== active) return;

      const target = sender === "A" ? B : A;
      target.contentWindow?.postMessage({ type: "RGL_SET_CAM", state: d.state }, "*");
    }
  });
})();

