// Paste into the page (or eval via devtools). Returns { path: { prop: value } } for every element.
// Posts the result to the local receiver when called as captureStyles('<name>').
(function () {
  const PROPS = [
    'display', 'position', 'marginTop', 'marginRight', 'marginBottom', 'marginLeft',
    'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'gap',
    'color', 'backgroundColor', 'backgroundImage',
    'borderTopColor', 'borderRightColor', 'borderBottomColor', 'borderLeftColor', 'borderTopWidth',
    'borderTopLeftRadius', 'borderTopRightRadius', 'borderBottomLeftRadius', 'borderBottomRightRadius',
    'boxShadow', 'outlineColor', 'fontFamily', 'fontSize', 'fontWeight', 'lineHeight',
    'letterSpacing', 'opacity', 'backdropFilter', 'zIndex',
  ];
  const SKIP = new Set(['SCRIPT', 'STYLE', 'CANVAS', 'LINK', 'META', 'NOSCRIPT']);
  const half = (n) => Math.round(n * 2) / 2;

  function capture() {
    const out = {};
    const counters = new Map();
    const walk = (el, parentPath) => {
      if (SKIP.has(el.tagName)) return;
      const tag = el.tagName.toLowerCase();
      const key = parentPath + '>' + tag;
      const n = (counters.get(key) ?? 0) + 1;
      counters.set(key, n);
      const path = `${key}:${n}`;
      const cs = getComputedStyle(el);
      const rec = {};
      for (const p of PROPS) rec[p] = cs[p];
      const r = el.getBoundingClientRect();
      rec.width = String(half(r.width));
      rec.height = String(half(r.height));
      out[path] = rec;
      if (el.tagName === 'CANVAS' || el.tagName === 'svg') return;
      for (const c of el.children) walk(c, path);
    };
    for (const c of document.body.children) walk(c, 'body');
    return out;
  }

  window.captureStyles = async function (name, port = 5199) {
    const data = capture();
    const res = await fetch(`http://localhost:${port}/snap/${encodeURIComponent(name)}`, {
      method: 'POST', body: JSON.stringify(data),
    });
    return `${name}: ${Object.keys(data).length} elements, receiver ${res.status}`;
  };
  window.__captureRaw = capture;
})();
