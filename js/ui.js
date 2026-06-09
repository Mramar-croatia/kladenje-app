// Tiny DOM helpers + shared render snippets used across views.

// Create an element from a tag, props and children.
export function el(tag, props = {}, children = []) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(props)) {
    if (v == null) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k === 'text') node.textContent = v;
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k.startsWith('on') && typeof v === 'function') {
      node.addEventListener(k.slice(2).toLowerCase(), v);
    } else node.setAttribute(k, v);
  }
  (Array.isArray(children) ? children : [children]).forEach((c) => {
    if (c == null) return;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  });
  return node;
}

// Escape user/data-derived text destined for innerHTML templates.
export function esc(s) {
  return String(s).replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

// Inline status icon for a scoring kind.
export function statusIcon(kind) {
  const map = {
    perfect: { sym: '★', cls: 'perfect', title: 'Točan rezultat (+3)' },
    correct: { sym: '✓', cls: 'correct', title: 'Točan ishod (+1)' },
    wrong: { sym: '✕', cls: 'wrong', title: 'Promašaj (0)' },
    pending: { sym: '·', cls: 'pending', title: 'Nije odigrano' },
  };
  const m = map[kind] || map.pending;
  return `<span class="status status--${m.cls}" title="${m.title}">${m.sym}</span>`;
}

// "11.6." -> "11. lip" style short label for chips. Falls back to raw.
const MONTHS_HR = { '6': 'lip', '7': 'srp' };
export function prettyDate(datum) {
  const m = /^(\d+)\.(\d+)\.?$/.exec(datum || '');
  if (!m) return datum || '';
  const month = MONTHS_HR[m[2]] || m[2] + '.';
  return `${m[1]}. ${month}`;
}

// Avatar bubble with initials in the player's colour.
export function avatar(meta, size = 32) {
  return `<span class="avatar" style="--c:${meta.color};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.4)}px">${esc(meta.initials)}</span>`;
}
