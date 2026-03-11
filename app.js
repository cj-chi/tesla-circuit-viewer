/* =====================================================
   Tesla Circuit Explorer — app.js
   ===================================================== */
'use strict';

// ── State ──────────────────────────────────────────────
let DATA = null;           // circuit_data.json
let simulation = null;     // D3 force simulation (System Graph)
let explorerSim = null;    // D3 force simulation (Entity Explorer)
let currentView = 'graph';
let currentPdf = null;
let currentPage = 1;
let selectedNode = null;

// Explorer State
let entityGraph = { nodes: new Map(), links: [] }; // The global entity relationship network
let explorerHistory = []; // Array of entity IDs for breadcrumb
let currentExplorerCenter = null;
let activeFilters = new Set();  // Set of allowed signal names for the current explorer view
let showWeakLinks = true;       // Whether to show links with no shared signal

// 系統分類
const GROUPS = {
  'Audio':         { color: '#ec4899', pdfs: ['audio'] },
  'Body Ctrl':     { color: '#f59e0b', pdfs: ['body_controller'] },
  'CAN Bus':       { color: '#3b82f6', pdfs: ['can_'] },
  'Charging':      { color: '#06b6d4', pdfs: ['charge_port'] },
  'Doors/Seats':   { color: '#84cc16', pdfs: ['door', 'doors_', 'seats_'] },
  'Drivetrain':    { color: '#ef4444', pdfs: ['drive_inverter'] },
  'ADAS':          { color: '#a78bfa', pdfs: ['driver_assist'] },
  'Safety':        { color: '#f97316', pdfs: ['restraint', 'ecall', 'security'] },
  'HV System':     { color: '#fbbf24', pdfs: ['hv_'] },
  'HVAC':          { color: '#34d399', pdfs: ['hvac_'] },
  'Power Dist':    { color: '#60a5fa', pdfs: ['power_dist'] },
  'RF/Cables':     { color: '#c084fc', pdfs: ['rf_special'] },
  'Steering':      { color: '#fb923c', pdfs: ['steering'] },
  'Index':         { color: '#6b7280', pdfs: ['index'] },
};

function getGroup(filename) {
  const fn = filename.toLowerCase();
  for (const [name, g] of Object.entries(GROUPS)) {
    if (g.pdfs.some(p => fn.includes(p))) return { name, color: g.color };
  }
  return { name: 'Other', color: '#64748b' };
}

// ── Init ────────────────────────────────────────────────
window.addEventListener('DOMContentLoaded', async () => {
  try {
    const res = await fetch('circuit_data.json');
    if (!res.ok) throw new Error('找不到 circuit_data.json，請先執行 parse_pdfs.py');
    DATA = await res.json();
    document.getElementById('loading').style.display = 'none';
    initApp();
  } catch (e) {
    document.getElementById('loadingText').textContent = '❌ ' + e.message;
  }
});

function initApp() {
  buildEntityGraph(); // Build the entity relationship network first
  updateStats();
  renderSidebar();
  renderGraph();
  renderGrid();
  initSearch();
  initExplorerEvents();
}

function buildEntityGraph() {
  const nodes = entityGraph.nodes;
  const linksMap = new Map(); // source|target -> { source, target, signals: Set, weak: bool }

  // 1. First Pass: Create all Connector nodes
  DATA.diagrams.forEach(d => {
    Object.entries(d.connectors).forEach(([cid, instances]) => {
      let node = nodes.get(cid);
      if (!node) {
        node = { id: cid, type: 'connector', details: [] };
        nodes.set(cid, node);
      }
      instances.forEach(inst => {
        node.details.push({
          file: d.file,
          pdfName: d.name,
          page: inst.page,
          pin: inst.pin,
          context_signals: inst.context_signals || []
        });
      });
    });
  });

  // 2. Second Pass: Build Edges (Signals) between Connectors
  // Map signal -> Set of CIDs
  const signalToConns = new Map();
  
  DATA.diagrams.forEach(d => {
    Object.entries(d.connectors).forEach(([cid, instances]) => {
      instances.forEach(inst => {
        (inst.context_signals || []).forEach(sig => {
          if (!signalToConns.has(sig)) signalToConns.set(sig, new Set());
          signalToConns.get(sig).add(cid);
        });
      });
    });
  });

  // Generate links based on shared signals
  signalToConns.forEach((cidsSet, sig) => {
    const cids = Array.from(cidsSet);
    for (let i = 0; i < cids.length; i++) {
        for (let j = i + 1; j < cids.length; j++) {
            const [a, b] = [cids[i], cids[j]].sort();
            const edgeKey = `${a}|${b}`;
            if (!linksMap.has(edgeKey)) {
                linksMap.set(edgeKey, { source: a, target: b, signals: new Set([sig]), weak: false });
            } else {
                linksMap.get(edgeKey).signals.add(sig);
            }
        }
    }
  });

  // 3. Optional: Build weak links between connectors on the SAME PDF if they have no explicit signal connection
  DATA.diagrams.forEach(d => {
    const cids = Object.keys(d.connectors);
    for (let i = 0; i < cids.length; i++) {
      for (let j = i + 1; j < cids.length; j++) {
        const [a, b] = [cids[i], cids[j]].sort();
        const edgeKey = `${a}|${b}`;
        if (!linksMap.has(edgeKey)) {
          linksMap.set(edgeKey, { source: a, target: b, signals: new Set(), weak: true });
        }
      }
    }
  });

  entityGraph.links = Array.from(linksMap.values()).map(l => ({
    ...l,
    signals: Array.from(l.signals) // Convert Set to Array
  }));
}

function updateStats() {
  document.getElementById('statPdfs').textContent = DATA.total_pdfs;
  document.getElementById('statLinks').textContent = DATA.connections.length.toLocaleString();
  const allConns = new Set();
  DATA.diagrams.forEach(d => Object.keys(d.connectors).forEach(c => allConns.add(c)));
  document.getElementById('statConns').textContent = allConns.size.toLocaleString();
}

// ── Sidebar ─────────────────────────────────────────────
function renderSidebar() {
  // Tab: Diagrams
  const diagramList = document.getElementById('diagramList');
  const groups = {};
  DATA.diagrams.forEach(d => {
    const g = getGroup(d.file);
    if (!groups[g.name]) groups[g.name] = { color: g.color, items: [] };
    groups[g.name].items.push(d);
  });
  diagramList.innerHTML = Object.entries(groups).map(([gName, g]) => `
    <div class="group-header" onclick="toggleGroup(this)" style="color:${g.color}">
      <span class="arrow">▼</span>
      <span>${gName}</span>
      <span style="margin-left:auto;font-weight:400;color:var(--text-muted)">${g.items.length}</span>
    </div>
    <div class="group-items">
      ${g.items.map(d => `
        <div class="diagram-item" data-file="${d.file}" onclick="focusDiagram('${d.file}')">
          <span style="width:8px;height:8px;border-radius:50%;background:${g.color};flex-shrink:0"></span>
          <span style="flex:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${d.name}</span>
          <span class="conn-count">${Object.keys(d.connectors).length}🔌</span>
        </div>
      `).join('')}
    </div>
  `).join('');

  // Tab: Connectors
  const connMap = {};
  DATA.diagrams.forEach(d => {
    Object.keys(d.connectors).forEach(cid => {
      if (!connMap[cid]) connMap[cid] = [];
      connMap[cid].push(d.file);
    });
  });
  const sortedConns = Object.entries(connMap).sort((a, b) => b[1].length - a[1].length);
  document.getElementById('connectorList').innerHTML = sortedConns.map(([cid, files]) => `
    <div class="connector-item" onclick="openExplorer('${cid}', 'connector')">
      <code>${cid}</code>
      <span style="flex:1;color:var(--text-muted);font-size:11px">出現於 ${files.length} 個圖紙</span>
    </div>
  `).join('');

  // Tab: Signals
  const sigMap = {};
  DATA.diagrams.forEach(d => {
    (d.signals || []).forEach(s => {
      if (!sigMap[s]) sigMap[s] = 0;
      sigMap[s]++;
    });
  });
  const sortedSigs = Object.entries(sigMap)
    .filter(([,n]) => n >= 2)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 200);
  document.getElementById('signalList').innerHTML = sortedSigs.map(([sig, n]) => `
    <div class="signal-item" onclick="openExplorer('${sig}', 'signal')">
      <code>${sig}</code>
      <span class="ref-count">${n}張</span>
    </div>
  `).join('');
}

function toggleGroup(header) {
  header.classList.toggle('collapsed');
  const items = header.nextElementSibling;
  items.style.display = header.classList.contains('collapsed') ? 'none' : 'block';
}

// ── Sidebar Tabs ────────────────────────────────────────
document.querySelectorAll('.tab').forEach(tab => {
  tab.addEventListener('click', () => {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
    tab.classList.add('active');
    document.getElementById(`tab-${tab.dataset.tab}`).classList.add('active');
  });
});

// ── Graph View ──────────────────────────────────────────
function renderGraph() {
  const svg = d3.select('#graphSvg');
  svg.selectAll('*').remove();

  const w = document.getElementById('graphSvg').clientWidth;
  const h = document.getElementById('graphSvg').clientHeight;

  // Zoom
  const g = svg.append('g');
  svg.call(d3.zoom().scaleExtent([0.1, 4]).on('zoom', e => g.attr('transform', e.transform)));

  // Filter links
  const showConn = document.getElementById('showConnectors').checked;
  const showSig = document.getElementById('showSignals').checked;

  // Aggregate connections (collapse multiple between same pair)
  const linkAgg = {};
  DATA.connections.forEach(c => {
    if (!showConn && c.type === 'connector') return;
    if (!showSig && c.type === 'signal') return;
    const key = [c.source, c.target].sort().join('|||');
    if (!linkAgg[key]) linkAgg[key] = { source: c.source, target: c.target, connectors: [], signals: [] };
    if (c.type === 'connector') linkAgg[key].connectors.push(c.label);
    else linkAgg[key].signals.push(c.label);
  });
  const links = Object.values(linkAgg);

  // Nodes
  const nodeSet = new Set([...links.map(l => l.source), ...links.map(l => l.target)]);
  const nodes = DATA.diagrams.filter(d => nodeSet.has(d.file)).map(d => ({
    id: d.file,
    name: d.name,
    group: getGroup(d.file),
    connCount: Object.keys(d.connectors).length,
    sigCount: (d.signals || []).length,
    linkCount: links.filter(l => l.source === d.file || l.target === d.file).length,
  }));

  const nodeById = {};
  nodes.forEach(n => nodeById[n.id] = n);

  // Resolve link objects
  const resolvedLinks = links.map(l => ({
    ...l,
    source: nodeById[l.source],
    target: nodeById[l.target],
    type: l.connectors.length > 0 ? 'connector' : 'signal',
    weight: l.connectors.length * 3 + l.signals.length,
  })).filter(l => l.source && l.target);

  const strength = parseInt(document.getElementById('linkStrength').value);

  simulation = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(resolvedLinks).id(d => d.id).distance(d => Math.max(60, 180 - d.weight * strength * 2)).strength(0.4))
    .force('charge', d3.forceManyBody().strength(-300))
    .force('center', d3.forceCenter(w/2, h/2))
    .force('collision', d3.forceCollide().radius(30));

  // Draw links
  const link = g.append('g').selectAll('line')
    .data(resolvedLinks).enter().append('line')
    .attr('class', d => `graph-link ${d.type}`)
    .attr('stroke-width', d => Math.min(1 + d.weight * 0.15, 4))
    .on('mouseenter', (event, d) => showLinkTooltip(event, d))
    .on('mouseleave', hideTooltip);

  // Draw nodes
  const node = g.append('g').selectAll('.graph-node')
    .data(nodes).enter().append('g').attr('class', 'graph-node')
    .call(d3.drag()
      .on('start', (e, d) => { if (!e.active) simulation.alphaTarget(0.3).restart(); d.fx=d.x; d.fy=d.y; })
      .on('drag', (e, d) => { d.fx=e.x; d.fy=e.y; })
      .on('end', (e, d) => { if (!e.active) simulation.alphaTarget(0); d.fx=null; d.fy=null; }))
    .on('click', (e, d) => { e.stopPropagation(); selectNode(d, node, link); })
    .on('dblclick', (e, d) => { e.stopPropagation(); openPdf(d.id); })
    .on('mouseenter', (event, d) => showNodeTooltip(event, d))
    .on('mouseleave', hideTooltip);

  node.append('circle')
    .attr('r', d => 10 + Math.sqrt(d.linkCount) * 3)
    .attr('fill', d => d.group.color + '33')
    .attr('stroke', d => d.group.color);

  node.append('text')
    .attr('dy', d => 14 + Math.sqrt(d.linkCount) * 3)
    .text(d => d.name.split(' ').slice(0, 3).join(' '));

  simulation.on('tick', () => {
    link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
        .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });

  // Click background to deselect
  svg.on('click', () => { resetHighlight(node, link); selectedNode = null; });
}

function selectNode(d, node, link) {
  selectedNode = d.id;
  node.classed('highlighted', n => n.id === d.id);
  node.style('opacity', n => {
    if (n.id === d.id) return 1;
    const connected = DATA.connections.some(c =>
      (c.source === d.id && c.target === n.id) ||
      (c.target === d.id && c.source === n.id)
    );
    return connected ? 1 : 0.2;
  });
  link.style('opacity', l => (l.source.id === d.id || l.target.id === d.id) ? 1 : 0.05);

  // Highlight sidebar item
  document.querySelectorAll('.diagram-item').forEach(el => {
    el.classList.toggle('active', el.dataset.file === d.id);
  });
}

function resetHighlight(node, link) {
  node.classed('highlighted', false).style('opacity', 1);
  link.style('opacity', null);
  document.querySelectorAll('.diagram-item').forEach(el => el.classList.remove('active'));
}

// Tooltip
function showNodeTooltip(event, d) {
  const t = document.getElementById('tooltip');
  const connLinks = DATA.connections.filter(c => (c.source === d.id || c.target === d.id) && c.type === 'connector');
  const peers = new Set([...connLinks.map(c => c.source === d.id ? c.target : c.source)]);
  t.innerHTML = `
    <div class="tt-title">📄 ${d.name}</div>
    <div class="tt-row"><strong>接頭數</strong>${d.connCount} 個</div>
    <div class="tt-row"><strong>連線</strong>${d.linkCount} 條</div>
    <div class="tt-row"><strong>相鄰</strong>${peers.size} 張圖紙</div>
    <div style="color:var(--text-muted);margin-top:6px;font-size:11px">雙擊開啟 PDF</div>
  `;
  positionTooltip(event, t);
}

function showLinkTooltip(event, d) {
  const t = document.getElementById('tooltip');
  const connList = d.connectors.slice(0, 5).join(', ') + (d.connectors.length > 5 ? '...' : '');
  const sigList = d.signals.slice(0, 5).join(', ') + (d.signals.length > 5 ? '...' : '');
  t.innerHTML = `
    <div class="tt-title">🔗 連線</div>
    <div class="tt-row"><strong>來源</strong>${getShortName(d.source.id)}</div>
    <div class="tt-row"><strong>目標</strong>${getShortName(d.target.id)}</div>
    ${d.connectors.length ? `<div class="tt-row"><strong>接頭</strong><span style="color:var(--connector-color)">${connList}</span></div>` : ''}
    ${d.signals.length ? `<div class="tt-row"><strong>訊號</strong><span style="color:var(--signal-color)">${sigList}</span></div>` : ''}
  `;
  positionTooltip(event, t);
}

function positionTooltip(event, t) {
  t.style.display = 'block';
  const x = event.pageX + 12, y = event.pageY - 40;
  const rect = t.getBoundingClientRect();
  const svgRect = document.getElementById('graphSvg').getBoundingClientRect();
  t.style.left = Math.min(x, svgRect.right - rect.width - 10) + 'px';
  t.style.top = Math.max(y, svgRect.top + 10) + 'px';
}

function hideTooltip() {
  document.getElementById('tooltip').style.display = 'none';
}

function getShortName(file) {
  const d = DATA.diagrams.find(x => x.file === file);
  return d ? d.name : file;
}

// ── Grid View ───────────────────────────────────────────
function renderGrid() {
  const grid = document.getElementById('gridContent');
  grid.innerHTML = DATA.diagrams.map((d, i) => {
    const g = getGroup(d.file);
    return `
    <div class="grid-card" style="animation-delay:${i*0.02}s;border-top:2px solid ${g.color}22"
         onclick="openPdf('${d.file}')">
      <div class="card-name">${d.name}</div>
      <div class="card-meta">
        <span class="card-tag pages">📄 ${d.pages}頁</span>
        <span class="card-tag conns">🔌 ${Object.keys(d.connectors).length}接頭</span>
        <span class="card-tag sigs">📡 ${(d.signals||[]).length}訊號</span>
      </div>
      <button class="card-btn">開啟電路圖 →</button>
    </div>`;
  }).join('');
}

// ── PDF Viewer ──────────────────────────────────────────
function openPdf(file, page = 1) {
  currentPdf = DATA.diagrams.find(d => d.file === file);
  if (!currentPdf) return;
  currentPage = page;
  switchView('pdf');

  document.getElementById('pdfTitle').textContent = currentPdf.name;
  document.getElementById('pdfOpen').href = currentPdf.file;
  updatePdfPage();

  // Show connectors
  const info = document.getElementById('pdfConnInfo');
  const conns = Object.keys(currentPdf.connectors);
  if (conns.length) {
    info.innerHTML = '<span style="margin-right:8px;color:var(--text-muted)">接頭：</span>' +
      conns.map(c => `<span class="conn-pill" title="探索此接頭關聯" onclick="openExplorer('${c}', 'connector')">${c}</span>`).join('');
  } else {
    info.textContent = '（無識別出接頭）';
  }

  // Sidebar highlight
  document.querySelectorAll('.diagram-item').forEach(el =>
    el.classList.toggle('active', el.dataset.file === file));
}

function updatePdfPage() {
  if (!currentPdf) return;
  const frame = document.getElementById('pdfFrame');
  frame.src = `${currentPdf.file}#page=${currentPage}`;
  document.getElementById('pageInfo').textContent = `第 ${currentPage} / ${currentPdf.pages} 頁`;
}

function prevPage() { if (currentPage > 1) { currentPage--; updatePdfPage(); } }
function nextPage() { if (currentPdf && currentPage < currentPdf.pages) { currentPage++; updatePdfPage(); } }
function closePdf() { switchView(currentExplorerCenter ? 'explorer' : 'graph'); currentPdf = null; }

// ── View Switching ──────────────────────────────────────
function switchView(view) {
  currentView = view;
  document.getElementById('graphView').style.display = view === 'graph' ? 'flex' : 'none';
  document.getElementById('explorerView').style.display = view === 'explorer' ? 'flex' : 'none';
  document.getElementById('gridView').style.display  = view === 'grid'  ? 'block' : 'none';
  document.getElementById('pdfView').style.display   = view === 'pdf'   ? 'flex'  : 'none';

  document.getElementById('btnGraph').classList.toggle('active', view === 'graph');
  document.getElementById('btnExplorer').classList.toggle('active', view === 'explorer');
  document.getElementById('btnGrid').classList.toggle('active', view === 'grid');
  document.getElementById('btnPdf').classList.toggle('active', view === 'pdf');
  
  document.getElementById('btnExplorer').style.display = currentExplorerCenter ? 'inline-block' : 'none';
  document.getElementById('btnPdf').style.display = currentPdf ? 'inline-block' : 'none';
  
  if (view !== 'explorer') {
    if (explorerSim) explorerSim.stop();
  } else {
    if (explorerSim) explorerSim.alphaTarget(0.3).restart();
  }
}

// ── Graph Filters ───────────────────────────────────────
function filterGraph() { renderGraph(); }
function updateForce() { if (simulation) renderGraph(); }

// ── Search ──────────────────────────────────────────────
function initSearch() {
  const input = document.getElementById('searchInput');
  const dropdown = document.getElementById('searchDropdown');

  input.addEventListener('input', () => {
    const q = input.value.trim().toUpperCase();
    if (q.length < 2) { dropdown.classList.remove('show'); return; }

    const results = [];

    // Match diagrams
    DATA.diagrams.forEach(d => {
      if (d.name.toUpperCase().includes(q) || d.file.toUpperCase().includes(q)) {
        results.push({ type: 'diagram', label: d.name, value: d.file });
      }
    });

    // Match connectors
    const connSeen = new Set();
    DATA.diagrams.forEach(d => {
      Object.keys(d.connectors).forEach(c => {
        if (c.toUpperCase().includes(q) && !connSeen.has(c)) {
          connSeen.add(c);
          const files = DATA.diagrams.filter(x => x.connectors[c]).length;
          results.push({ type: 'connector', label: `${c}`, sub: `出現於 ${files} 張圖紙`, value: c });
        }
      });
    });

    // Match signals
    const sigSeen = new Set();
    DATA.diagrams.forEach(d => {
      (d.signals||[]).forEach(s => {
        if (s.includes(q) && !sigSeen.has(s)) {
          sigSeen.add(s);
          results.push({ type: 'signal', label: s, value: s });
        }
      });
    });

    dropdown.innerHTML = results.slice(0, 12).map(r => `
      <div class="search-item" onclick="handleSearchSelect('${r.type}','${r.value}')">
        <span class="badge ${r.type === 'connector' ? 'conn' : r.type === 'signal' ? 'sig' : ''}">
          ${r.type === 'diagram' ? '圖紙' : r.type === 'connector' ? '接頭' : '訊號'}
        </span>
        <span>${r.label}${r.sub ? ` <small style="color:var(--text-muted)">${r.sub}</small>` : ''}</span>
      </div>
    `).join('') || '<div class="search-item" style="color:var(--text-muted)">無結果</div>';
    dropdown.classList.add('show');
  });

  document.addEventListener('click', e => {
    if (!e.target.closest('.search-box')) dropdown.classList.remove('show');
  });
}

function handleSearchSelect(type, value) {
  document.getElementById('searchDropdown').classList.remove('show');
  document.getElementById('searchInput').value = '';
  if (type === 'diagram') { openPdf(value); }
  else { 
    // Signal or Connector -> Route to Explorer!
    openExplorer(value, type); 
  }
}

function searchAndHighlight(type, value) {
  // Switch to graph view and highlight relevant nodes
  if (currentView !== 'graph') switchView('graph');

  setTimeout(() => {
    let relevantFiles;
    if (type === 'connector') {
      relevantFiles = new Set(DATA.diagrams.filter(d => d.connectors[value]).map(d => d.file));
    } else {
      relevantFiles = new Set(DATA.diagrams.filter(d => (d.signals||[]).includes(value)).map(d => d.file));
    }

    d3.selectAll('.graph-node')
      .classed('highlighted', d => relevantFiles.has(d.id))
      .style('opacity', d => relevantFiles.size === 0 || relevantFiles.has(d.id) ? 1 : 0.2);

    d3.selectAll('.graph-link')
      .style('opacity', d => {
        return (relevantFiles.has(d.source.id) && relevantFiles.has(d.target.id)) ? 1 : 0.05;
      });
  }, 100);
}

function focusDiagram(file) {
  if (currentView === 'pdf') {
    openPdf(file);
  } else {
    searchAndHighlight('diagram', file);
    document.querySelectorAll('.diagram-item').forEach(el =>
      el.classList.toggle('active', el.dataset.file === file));
  }
}

// ── Parser Refresh ──────────────────────────────────────
function runParser() {
  alert('請在終端機執行：\n\nvenv/bin/python parse_pdfs.py\n\n完成後重新整理此頁面。');
}

// ── Entity Explorer (Relational Graph) ──────────────────
function initExplorerEvents() {
  document.getElementById('btnCenterExplorer').addEventListener('click', () => {
    if (currentExplorerCenter) openExplorer(currentExplorerCenter.id, currentExplorerCenter.type);
  });
}

function openExplorer(entityId, type) {
  if (currentView !== 'explorer') switchView('explorer');
  
  // Update state and history
  currentExplorerCenter = { id: entityId, type };
  if (!explorerHistory.includes(entityId)) {
    explorerHistory.push(entityId);
    if (explorerHistory.length > 5) explorerHistory.shift(); 
  } else {
    explorerHistory = explorerHistory.slice(0, explorerHistory.indexOf(entityId) + 1);
  }
  renderBreadcrumb();

  // 1. Gather all possible context signals for the center entity to build filters
  const availableSignals = new Map(); // signal_name -> count of connections
  
  if (type === 'connector') {
    entityGraph.links.forEach(l => {
      if (l.source === entityId || l.target === entityId) {
        if (!l.weak) {
            l.signals.forEach(sig => {
                availableSignals.set(sig, (availableSignals.get(sig) || 0) + 1);
            });
        }
      }
    });
  } else if (type === 'signal') {
    // If we are centered on a signal, we don't necessarily need to filter other signals heavily yet
    availableSignals.set(entityId, Array.from(entityGraph.nodes.values()).filter(n => n.details && n.details.some(d => d.context_signals.includes(entityId))).length);
  }

  // Set default filters (all on)
  activeFilters = new Set(availableSignals.keys());
  
  // Render Checkboxes
  renderFilters(availableSignals);

  // Determine which entities to show and render
  updateExplorerGraph();
  
  if (type === 'connector') {
      showEntityInfo(entityGraph.nodes.get(entityId));
  }
}

function updateExplorerGraph() {
  if (!currentExplorerCenter) return;
  const { id: entityId, type } = currentExplorerCenter;
  
  const egoNodes = new Map();
  const egoLinks = [];

  if (type === 'connector') {
    const node = entityGraph.nodes.get(entityId);
    if (!node) return;
    egoNodes.set(entityId, { ...node, isCenter: true });

    // Filter links connected to this Connector based on activeFilters
    entityGraph.links.forEach(l => {
      if (l.source === entityId || l.target === entityId) {
        if (l.weak) {
            if (!showWeakLinks && (l.source === entityId || l.target === entityId)) return;
            // Add weak link
            const peerId = l.source === entityId ? l.target : l.source;
            const peerNode = entityGraph.nodes.get(peerId);
            if (peerNode) {
              if (!egoNodes.has(peerId)) egoNodes.set(peerId, { ...peerNode, isCenter: false });
              egoLinks.push({ ...l });
            }
        } 
        else {
            // Strong link (has signals)
            const allowedSignals = l.signals.filter(s => activeFilters.has(s));
            if (allowedSignals.length > 0) {
                const peerId = l.source === entityId ? l.target : l.source;
                const peerNode = entityGraph.nodes.get(peerId);
                if (peerNode) {
                  if (!egoNodes.has(peerId)) egoNodes.set(peerId, { ...peerNode, isCenter: false });
                  // Add link with only allowed signals
                  egoLinks.push({ ...l, signals: allowedSignals });
                }
            }
        }
      }
    });
  } 
  else if (type === 'signal') {
    const signalLabel = entityId;
    egoNodes.set(signalLabel, { id: signalLabel, type: 'virtual_signal', isCenter: true });

    entityGraph.nodes.forEach((node, cid) => {
      if (node.details.some(d => d.context_signals.includes(signalLabel))) {
        egoNodes.set(cid, { ...node, isCenter: false });
        egoLinks.push({ source: signalLabel, target: cid, signals: [signalLabel], weak: false });
      }
    });



    showSignalInfo(signalLabel, activeNodes.map(id => egoNodes.get(id)));
  }

  renderExplorerGraph(Array.from(egoNodes.values()), egoLinks);
}

function renderFilters(availableSignals) {
  const filterDiv = document.getElementById('exCardFilters');
  const listDiv = document.getElementById('filterList');
  
  if (availableSignals.size === 0) {
      filterDiv.style.display = 'none';
      return;
  }
  
  filterDiv.style.display = 'flex';
  
  // Sort signals by count descending, then alphabetical
  const sorted = Array.from(availableSignals.entries()).sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
  
  listDiv.innerHTML = `
    <label class="filter-item" style="border-bottom: 1px solid rgba(255,255,255,0.1); padding-bottom: 4px;">
      <input type="checkbox" id="chkShowWeak" ${showWeakLinks ? 'checked' : ''} onchange="toggleWeakLinks(this.checked)">
      <span style="color:var(--text-dim)">顯示未標明訊號的鄰近接頭 (同圖紙)</span>
    </label>
  ` + sorted.map(([sig, count]) => `
    <label class="filter-item">
      <input type="checkbox" checked onchange="toggleFilter('${sig}', this.checked)">
      <span class="sig-tag" style="background:none;padding:0;cursor:pointer">${sig}</span>
      <span class="count">${count} 條</span>
    </label>
  `).join('');
}

function toggleFilter(sig, isChecked) {
    if (isChecked) activeFilters.add(sig);
    else activeFilters.delete(sig);
    updateExplorerGraph();
}

function toggleWeakLinks(isChecked) {
    showWeakLinks = isChecked;
    updateExplorerGraph();
}

function toggleAllFilters(selectAll) {
    const checkboxes = document.querySelectorAll('#filterList input[type="checkbox"]:not(#chkShowWeak)');
    checkboxes.forEach(cb => {
        cb.checked = selectAll;
        const sig = cb.nextElementSibling.textContent;
        if (selectAll) activeFilters.add(sig);
        else activeFilters.delete(sig);
    });
    updateExplorerGraph();
}

function renderBreadcrumb() {
  const bc = document.getElementById('breadcrumb');
  bc.innerHTML = explorerHistory.map((id, i) => {
    const isLast = i === explorerHistory.length - 1;
    let type = 'connector';
    if (!entityGraph.nodes.has(id)) type = 'signal';
    const icon = type === 'connector' ? '🔌' : '📡';
    
    return `
      <div class="bc-item ${isLast ? 'active' : ''}" onclick="openExplorer('${id}', '${type}')">
        ${icon} ${id}
      </div>
      ${!isLast ? '<span class="bc-sep">▶</span>' : ''}
    `;
  }).join('');
}

function renderExplorerGraph(nodes, links) {
  const svg = d3.select('#explorerSvg');
  svg.selectAll('*').remove();

  const container = document.getElementById('explorerSvg');
  const w = container.clientWidth;
  const h = container.clientHeight;

  const g = svg.append('g');
  const zoom = d3.zoom().scaleExtent([0.3, 4]).on('zoom', e => g.attr('transform', e.transform));
  svg.call(zoom);

  if (explorerSim) explorerSim.stop();

  // Create a defs block for arrowhead markers
  svg.append("defs").append("marker")
      .attr("id", "arrowhead")
      .attr("viewBox", "-0 -5 10 10")
      .attr("refX", 25)
      .attr("refY", 0)
      .attr("orient", "auto")
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("xoverflow", "visible")
      .append("svg:path")
      .attr("d", "M 0,-5 L 10 ,0 L 0,5")
      .attr("fill", "var(--text-muted)");

  // Provide longer links when we have labels
  explorerSim = d3.forceSimulation(nodes)
    .force('link', d3.forceLink(links).id(d => d.id).distance(d => d.signals && d.signals.length > 0 ? 150 : 80).strength(0.5))
    .force('charge', d3.forceManyBody().strength(-800))
    .force('center', d3.forceCenter(w / 2, h / 2))
    .force('collide', d3.forceCollide().radius(40));

  // Link groups
  const linkGroup = g.append('g').selectAll('.entity-link-group')
    .data(links).enter().append('g')
    .attr('class', 'entity-link-group');

  // Link lines
  const linkLine = linkGroup.append('line')
    .attr('class', 'entity-link')
    .attr('stroke-width', d => d.weak ? 1 : Math.min(2 + (d.signals?.length || 0), 5))
    .attr('stroke-dasharray', d => d.weak ? '4,4' : 'none');

  // Link labels (Signal names)
  const linkLabel = linkGroup.filter(d => d.signals?.length > 0).append('text')
    .attr('class', 'entity-link-label')
    .attr('text-anchor', 'middle')
    .attr('dy', -4)
    .style('font-family', "'JetBrains Mono', monospace")
    .style('font-size', '10px')
    .style('fill', 'var(--signal-color)')
    .style('pointer-events', 'none')
    .text(d => d.signals.slice(0, 2).join(', ') + (d.signals.length > 2 ? ' ...' : ''));

  // Node groups
  const node = g.append('g').selectAll('.entity-node')
    .data(nodes).enter().append('g')
    .attr('class', d => `entity-node ${d.isCenter ? 'highlighted' : ''}`)
    .call(d3.drag()
      .on('start', (e, d) => { if (!e.active) explorerSim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
      .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
      .on('end', (e, d) => { if (!e.active) explorerSim.alphaTarget(0); d.fx = null; d.fy = null; }))
    .on('click', (e, d) => {
      e.stopPropagation();
      openExplorer(d.id, d.type === 'virtual_signal' ? 'signal' : 'connector');
    });

  // Circle background
  node.append('circle')
    .attr('r', d => d.isCenter ? 26 : (d.type === 'virtual_signal' ? 20 : 16))
    .attr('fill', d => d.type === 'virtual_signal' ? 'rgba(16,185,129,0.2)' : 'rgba(245,158,11,0.2)')
    .attr('stroke', d => d.type === 'virtual_signal' ? '#10b981' : '#f59e0b');

  // ID Text
  node.append('text')
    .attr('dy', d => d.isCenter ? 40 : 32)
    .style('fill', d => d.type === 'virtual_signal' ? 'var(--signal-color)' : 'var(--text)')
    .text(d => d.id);

  // Icon Text
  node.append('text')
    .attr('dy', 5)
    .style('font-size', d => d.isCenter ? '20px' : '12px')
    .text(d => d.type === 'virtual_signal' ? '📡' : '🔌');

  explorerSim.on('tick', () => {
    linkLine.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
            .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
            
    linkLabel.attr('x', d => (d.source.x + d.target.x) / 2)
             .attr('y', d => (d.source.y + d.target.y) / 2)
             // Auto-rotate text to match line angle
             .attr('transform', d => {
                 let x = (d.source.x + d.target.x) / 2;
                 let y = (d.source.y + d.target.y) / 2;
                 let angle = Math.atan2(d.target.y - d.source.y, d.target.x - d.source.x) * 180 / Math.PI;
                 if (angle > 90 || angle < -90) angle += 180; // Keep text upright
                 return `rotate(${angle}, ${x}, ${y})`;
             });

    node.attr('transform', d => `translate(${d.x},${d.y})`);
  });

  svg.transition().duration(500).call(zoom.transform, d3.zoomIdentity);
}

function showEntityInfo(node) {
  const card = document.getElementById('explorerInfoCard');
  card.style.display = 'flex';
  
  document.getElementById('exCardTitle').textContent = `🔌 接頭 ${node.id}`;
  
  const pdfs = new Set(node.details.map(d => d.file));
  document.getElementById('exCardMeta').innerHTML = `
    <span class="card-tag pages">出現於 ${pdfs.size} 張圖紙</span>
    <span class="card-tag conns">${node.details.length} 個腳位紀錄</span>
  `;

  let html = '';
  const byPdf = {};
  node.details.forEach(d => {
    if (!byPdf[d.file]) byPdf[d.file] = { name: d.pdfName, page: d.page, pins: [] };
    byPdf[d.file].pins.push(d);
  });

  for (const [file, info] of Object.entries(byPdf)) {
    html += `<div class="info-row">
      <strong style="color:var(--text);display:block;margin-bottom:4px">📄 ${info.name} (P${info.page})</strong>
      ${info.pins.map(p => `
        <div style="margin-left:8px;margin-bottom:6px">
          <span style="color:var(--accent)">Pin ${p.pin || '?'}</span> 
          ${p.context_signals.length > 0 ? 
            `<div style="margin-top:2px">${p.context_signals.map(s => `<span class="sig-tag" style="cursor:pointer" onclick="openExplorer('${s}','signal')">${s}</span>`).join('')}</div>` 
            : '<span style="color:var(--text-muted);font-size:10px">無解析出相鄰訊號</span>'}
          <button class="btn-refresh" style="padding:2px 6px;font-size:10px;margin-top:4px" onclick="openPdf('${file}', ${p.page})">開原圖 (P${p.page})</button>
        </div>
      `).join('')}
    </div>`;
  }
  document.getElementById('exCardContent').innerHTML = html;
}

function showSignalInfo(signal, connectedNodes) {
    const card = document.getElementById('explorerInfoCard');
    card.style.display = 'flex';
    
    document.getElementById('exCardTitle').textContent = `📡 訊號 ${signal}`;
    
    document.getElementById('exCardMeta').innerHTML = `
      <span class="card-tag sigs">連線到 ${connectedNodes.length} 個接頭</span>
    `;
    
    let html = `<div class="info-row">這是在線路中傳遞的訊號，連接以下實體端點：</div>`;
    connectedNodes.forEach(n => {
        html += `<div class="info-row" style="display:flex;justify-content:space-between;align-items:center;cursor:pointer" onclick="openExplorer('${n.id}', 'connector')">
            <span style="color:var(--connector-color);font-family:'JetBrains Mono'">🔌 ${n.id}</span>
            <span style="font-size:10px;color:var(--text-muted)">→ 查看</span>
        </div>`;
    });

    document.getElementById('exCardContent').innerHTML = html;
}
