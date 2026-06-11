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

// ---------------------------------------------------------------------------
// Inline SVG icon set (stroke = currentColor). Keeps the UI crisp at any size
// and avoids emoji rendering differences across platforms.
// ---------------------------------------------------------------------------
const ICONS = {
  trophy:
    '<path d="M8 21h8M12 17v4M7 4h10v4a5 5 0 0 1-10 0V4Z"/><path d="M17 5h3v2a3 3 0 0 1-3 3M7 5H4v2a3 3 0 0 0 3 3"/>',
  ball:
    '<circle cx="12" cy="12" r="9"/><path d="m12 7 4.7 3.4-1.8 5.5H9.1L7.3 10.4 12 7Z"/>',
  users:
    '<path d="M16 19v-1a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v1"/><circle cx="9" cy="7" r="3"/><path d="M22 19v-1a4 4 0 0 0-3-3.85M16 4.15A4 4 0 0 1 16 11"/>',
  edit:
    '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5Z"/>',
  logout:
    '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="m16 17 5-5-5-5M21 12H9"/>',
  search:
    '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.3-4.3"/>',
  back: '<path d="m15 18-6-6 6-6"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  flame:
    '<path d="M12 2s4 4 4 8a4 4 0 0 1-8 0c0-1 .4-2 1-3-.2 2 1 3 1 3 .5-2-1-4 2-8Z"/>',
  clock:
    '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3.5 2"/>',
};

// Inline SVG markup for a named icon.
export function icon(name, size = 20) {
  const body = ICONS[name] || '';
  return `<svg class="ico" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${body}</svg>`;
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

// 1 / X / 2 outcome pill. Home win / draw / away win get distinct tints so the
// prediction is scannable at a glance.
const ISHOD_TITLE = { '1': 'Domaćin', X: 'Neriješeno', '2': 'Gost' };
export function ishodPill(ishod) {
  const v = (ishod || '').toUpperCase();
  const cls = v === '1' || v === 'X' || v === '2' ? v : 'na';
  return `<span class="ish ish--${cls}" title="${ISHOD_TITLE[v] || ''}">${esc(v || '–')}</span>`;
}

// "11.6." -> "11. lip" style short label for chips. Falls back to raw.
const MONTHS_HR = { '6': 'lip', '7': 'srp' };
export function prettyDate(datum) {
  const m = /^(\d+)\.(\d+)\.?$/.exec(datum || '');
  if (!m) return datum || '';
  const month = MONTHS_HR[m[2]] || m[2] + '.';
  return `${m[1]}. ${month}`;
}

// "4:00" -> "04:00" — zero-pad the hour so kickoff times line up.
export function prettyTime(vrijeme) {
  const m = /^(\d{1,2}):(\d{2})$/.exec(vrijeme || '');
  if (!m) return vrijeme || '';
  return `${m[1].padStart(2, '0')}:${m[2]}`;
}

// Avatar bubble with initials in the player's colour.
export function avatar(meta, size = 32) {
  return `<span class="avatar" style="--c:${meta.color};width:${size}px;height:${size}px;font-size:${Math.round(size * 0.4)}px">${esc(meta.initials)}</span>`;
}
