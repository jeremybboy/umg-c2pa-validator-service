const NS = 'http://www.w3.org/2000/svg';
const W = 280, H = 190, GAP = 30, LEVEL = 265;
function svgElement(name, attributes = {}, content = '') {
  const el = document.createElementNS(NS, name);
  for (const [key, value] of Object.entries(attributes)) el.setAttribute(key, value);
  if (content) el.textContent = content;
  return el;
}
const short = (value, n) => value.length > n ? `${value.slice(0, n - 1)}…` : value;
export class ProvenanceGraph {
  constructor(svg, detail, zoomLabel, onDetails) {
    Object.assign(this, { svg, detail, zoomLabel, onDetails });
    this.collapsed = new Set(); this.camera = { x: 0, y: 0, scale: 1 }; this.positions = [];
    svg.addEventListener('wheel', event => {
      event.preventDefault();
      if (event.ctrlKey || event.metaKey) this.zoom(Math.exp(-event.deltaY * .009), event.offsetX, event.offsetY);
      else { this.camera.x -= event.deltaX; this.camera.y -= event.deltaY; this.transform(); }
    }, { passive: false });
    svg.addEventListener('pointerdown', event => {
      this.drag = { x: event.clientX, y: event.clientY, total: 0 };
      svg.setPointerCapture(event.pointerId);
    });
    svg.addEventListener('pointermove', event => {
      if (!this.drag) return;
      const dx = event.clientX - this.drag.x, dy = event.clientY - this.drag.y;
      this.drag.total += Math.abs(dx) + Math.abs(dy);
      this.camera.x += dx; this.camera.y += dy; this.drag.x = event.clientX; this.drag.y = event.clientY;
      this.transform();
    });
    svg.addEventListener('pointerup', event => {
      const moved = this.drag?.total ?? 0; this.drag = null;
      if (moved > 4) return;
      const rect = svg.getBoundingClientRect();
      const x = (event.clientX - rect.left - this.camera.x) / this.camera.scale;
      const y = (event.clientY - rect.top - this.camera.y) / this.camera.scale;
      const found = this.positions.find(p => x >= p.x && x <= p.x + W && y >= p.y && y <= p.y + H);
      if (found) this.select(found.node);
    });
    svg.addEventListener('pointercancel', () => { this.drag = null; });
    svg.addEventListener('keydown', event => {
      if (event.key === '+' || event.key === '=') this.zoom(1.2);
      else if (event.key === '-') this.zoom(1 / 1.2);
      else if (event.key.toLowerCase() === 'f') this.fit();
      else return;
      event.preventDefault();
    });
    new ResizeObserver(() => { if (this.root) this.fit(); }).observe(svg);
  }
  setRoot(root) {
    this.root = root; this.collapsed.clear(); this.selected = root;
    this.layout(); this.draw(); this.fit(); this.showDetail(root);
  }
  layout() {
    const span = node => !node.children.length || this.collapsed.has(node.id) ? W
      : Math.max(W, node.children.reduce((sum, c) => sum + span(c) + GAP, -GAP));
    this.positions = [];
    const place = (node, left, top, parent) => {
      const width = span(node), current = { node, x: left + (width - W) / 2, y: top, parent };
      this.positions.push(current);
      if (!this.collapsed.has(node.id)) for (const child of node.children) {
        place(child, left, top + LEVEL, current); left += span(child) + GAP;
      }
    };
    place(this.root, 0, 0, null);
  }
  draw() {
    this.svg.replaceChildren(); this.layer = svgElement('g'); this.svg.append(this.layer);
    for (const p of this.positions) {
      if (!p.parent) continue;
      const x1 = p.parent.x + W / 2, y1 = p.parent.y + H, x2 = p.x + W / 2, y2 = p.y;
      this.layer.append(svgElement('path', { d: `M${x1},${y1} C${x1},${y1 + 40} ${x2},${y2 - 40} ${x2},${y2}`, fill: 'none', stroke: '#777', 'stroke-width': 1.2, 'stroke-dasharray': '4 4' }));
      this.layer.append(svgElement('text', { x: x2, y: y2 - 11, 'text-anchor': 'middle', fill: '#999', 'font-size': 11 },
        p.node.relationship === 'componentOf' ? 'Component of' : p.node.relationship === 'parentOf' ? 'Parent ingredient' : p.node.relationship));
    }
    for (const p of this.positions) {
      const node = p.node, group = svgElement('g', { transform: `translate(${p.x},${p.y})`, role: 'button', tabindex: 0, 'aria-label': `Inspect ${node.title}` });
      group.addEventListener('keydown', event => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); this.select(node); } });
      group.append(svgElement('title', {}, node.title));
      group.append(svgElement('rect', { width: W, height: H, rx: 6, fill: '#222', stroke: this.selected === node ? '#b5d7ff' : node.hasManifest ? '#438aff' : '#666', 'stroke-width': this.selected === node ? 2.5 : 1.5 }));
      for (let i = 0; i < 5; i++) {
        const height = [7, 16, 23, 12, 6][i];
        group.append(svgElement('line', { x1: 18 + i * 4, x2: 18 + i * 4, y1: 25 - height / 2, y2: 25 + height / 2, stroke: '#a8cfff', 'stroke-width': 2 }));
      }
      group.append(svgElement('text', { x: 49, y: 29, fill: '#b9b9b9', 'font-size': 10, 'letter-spacing': 1 }, p.parent ? 'AUDIO INGREDIENT' : 'SELECTED AUDIO'));
      group.append(svgElement('text', { x: 16, y: 58, fill: '#f3f3f3', 'font-size': 15, 'font-weight': 600 }, short(node.title, 31)));
      group.append(svgElement('text', { x: 16, y: 84, fill: '#c4c4c4', 'font-size': 11 }, short(node.generator || (node.hasManifest ? 'Generator not reported' : 'Credentials unavailable'), 38)));
      const labels = node.sources.length ? node.sources.slice(0, 2).map(s => s.label) : ['Source type not declared'];
      labels.forEach((label, i) => {
        group.append(svgElement('rect', { x: 12, y: 97 + i * 25, width: W - 24, height: 21, rx: 9, fill: '#102039' }));
        group.append(svgElement('text', { x: 21, y: 111 + i * 25, fill: '#a8ceff', 'font-size': 11, 'font-weight': 600 }, short(label, 39)));
      });
      group.append(svgElement('text', { x: 16, y: 160, fill: '#aaa', 'font-size': 10 }, p.parent ? 'Declared ingredient history' : 'Validation shown above'));
      if (node.children.length) group.append(svgElement('text', { x: 16, y: 178, fill: '#a8cfff', 'font-size': 10 }, this.collapsed.has(node.id) ? '+ Branch collapsed' : '− Contributions expanded'));
      this.layer.append(group);
    }
    this.transform();
  }
  select(node) { this.selected = node; this.draw(); this.showDetail(node); }
  showDetail(node) {
    this.detail.replaceChildren();
    const add = (tag, value, className) => { const element = document.createElement(tag); element.textContent = value; if (className) element.className = className; this.detail.append(element); return element; };
    add('p', 'SELECTED CONTRIBUTION', 'eyebrow'); add('h3', node.title);
    add('p', node.generator || 'Claim generator not reported');
    for (const source of node.sources) add('div', source.label, 'pill source');
    if (node.instrument) add('p', `Instrument: ${node.instrument}`);
    add('p', node.availability);
    if (node.children.length) {
      const button = add('button', this.collapsed.has(node.id) ? 'Expand branch' : 'Collapse branch');
      button.addEventListener('click', () => { if (!this.collapsed.delete(node.id)) this.collapsed.add(node.id); this.layout(); this.draw(); this.fit(); this.showDetail(node); });
    }
    const details = add('button', 'Declared actions / details');
    details.addEventListener('click', () => this.onDetails(node.title, { manifestId: node.manifestId, relationship: node.relationship, sources: node.sources, actions: node.actions, availability: node.availability, note: 'Source labels are declarations. Ingredient audio has not been separately supplied or independently checked.', ingredient: node.original }));
  }
  fit() {
    if (!this.positions.length) return;
    const width = Math.max(...this.positions.map(p => p.x + W));
    const height = Math.max(...this.positions.map(p => p.y + H));
    const vw = this.svg.clientWidth, vh = this.svg.clientHeight;
    const scale = Math.max(.08, Math.min(1, (vw - 44) / width, (vh - 44) / height));
    this.camera = { scale, x: (vw - width * scale) / 2, y: (vh - height * scale) / 2 }; this.transform();
  }
  zoom(factor, x = this.svg.clientWidth / 2, y = this.svg.clientHeight / 2) {
    const c = this.camera, scale = Math.max(.08, Math.min(3, c.scale * factor)), ratio = scale / c.scale;
    c.x = x - (x - c.x) * ratio; c.y = y - (y - c.y) * ratio; c.scale = scale; this.transform();
  }
  expandAll() { this.collapsed.clear(); this.layout(); this.draw(); this.fit(); this.showDetail(this.selected); }
  transform() {
    const c = this.camera; this.layer?.setAttribute('transform', `translate(${c.x},${c.y}) scale(${c.scale})`);
    this.zoomLabel.textContent = `${Math.round(c.scale * 100)}%`;
  }
}
