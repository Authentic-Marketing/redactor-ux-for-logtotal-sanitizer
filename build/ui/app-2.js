
// ---------- running ----------
function changed() {
  // Compare like with like. configObject wraps configOf with logtotalSanitizerUi, library
  // and a freshly stamped exportedAt, so the old comparison could never be true and the
  // badge stuck on 'modified' from the first change onward, including after Reset all.
  $('#cfgState').textContent = JSON.stringify(configOf(state)) === JSON.stringify(configOf(defaultState())) ? 'defaults' : 'modified';
  persist(); renderIntegration(); scheduleRun();
}
function scheduleRun() {
  clearTimeout(runTimer);
  if (srcFile && srcFile.size > 4 * 1048576) { $('#runMeta').textContent = 'Press Sanitize to re-run'; return; }
  runTimer = setTimeout(run, 180);
}
function makeSanitizer() {
  try { const s = L.createSanitizer(buildOptions()); showErr($('#cfgErr'), ''); showErr($('#keyErr'), ''); return s; }
  catch (e) {
    if (L.isSanitizerError(e) && e.code === 'INVALID_KEY') showErr($('#keyErr'), errMessage(e)); else showErr($('#cfgErr'), errMessage(e));
    return null;
  }
}
function engineActive() { return state.engine === 'local' && bridge.ok ? 'local' : 'bundled'; }
function isLoopback(u) { try { const h = new URL(u).hostname; return h === '127.0.0.1' || h === 'localhost' || h === '::1' || h === '[::1]'; } catch (e) { return false; } }
function bridgeBase() { const u = String(state.bridgeUrl || '').trim().replace(/\/+$/, ''); return isLoopback(u) ? u : ''; }
async function bridgeHealth() {
  if (!bridgeBase()) { bridge.ok = false; bridge.checked = false; stopPolling(); return false; }
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 2500);
  try {
    const r = await fetch(bridgeBase() + '/health', { signal: ctl.signal, cache: 'no-store' }); const j = await r.json();
    bridge.ok = Boolean(r.ok && j && j.name === LIB.name); bridge.version = j.version || null; bridge.node = j.node || null; bridge.maxBytes = Number(j.maxBytes) || 0;
  } catch (e) { bridge.ok = false; } finally { clearTimeout(t); bridge.checked = true; }
  if (bridge.ok) { bridge.lost = false; stopPolling(); } else if (state.engine === 'local') startPolling();
  renderEngine(); return bridge.ok;
}
function stopPolling() { if (poll) { clearInterval(poll); poll = null; } }
function startPolling() {
  if (poll) return; let n = 0;
  poll = setInterval(async () => {
    n += 1;
    if (state.engine !== 'local' || bridge.ok || n > 100 || !bridgeBase()) { stopPolling(); renderEngine(); return; }
    const ok = await bridgeHealth();
    if (ok) changed();
  }, 3000);
}
function renderEngine() {
  const local = state.engine === 'local'; $('#localPanel').hidden = !local;
  $$('input[name="engine"]').forEach((r) => { r.checked = r.value === state.engine; });
  $('#bridgeUrl').value = state.bridgeUrl;
  const st = $('#bridgeStatus');
  const offLoop = local && !bridgeBase();
  st.hidden = !(local && (bridge.checked || offLoop));
  if (offLoop) st.textContent = 'Address refused: the bridge runs on 127.0.0.1 or localhost';
  else if (bridge.ok) st.textContent = 'Connected ' + bridge.version + ', Node ' + bridge.node;
  else if (bridge.lost) st.textContent = 'Stopped';
  else st.textContent = 'Not detected';
  st.classList.toggle('solid', local && bridge.ok);
  $('#bridgeSetup').hidden = !(local && bridge.checked && !bridge.ok) || offLoop;
  const port = (/:(\d+)\/?$/.exec(bridgeBase()) || [])[1]; $('#startCmd').textContent = 'node sanitizer-bridge.mjs' + (port && port !== '7412' ? ' ' + port : '');
  const active = engineActive();
  $('#badgeText').textContent = active === 'local' ? 'Runs on this machine. ' : 'Runs in this tab. ';
  $('#badgeNet').innerHTML = active === 'local' ? 'Bridge <strong>' + esc(bridgeBase().replace(/^https?:\/\//, '')) + '</strong>' : 'External <span class="long">requests</span>: <strong>' + netExternal + '</strong>';
}
async function runLocal() {
  let text;
  if (srcFile) {
    if (bridge.maxBytes && srcFile.size > bridge.maxBytes) { showErr($('#cfgErr'), 'The bridge accepts up to ' + fmtBytes(bridge.maxBytes) + '. Run the CLI on a file this large (Integrate, CLI).'); return; }
    text = await srcFile.text();
  } else text = $('#inputText').value;
  if (!text) { last = null; renderResults(); return; }
  let options; try { options = buildOptions(true); } catch (e) { showErr($('#cfgErr'), errMessage(e)); return; }
  $('#runMeta').textContent = 'Sanitizing';
  const t0 = performance.now();
  try {
    const r = await fetch(bridgeBase() + '/sanitize', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ text, options }) });
    const j = await r.json();
    if (!r.ok) { showErr($('#cfgErr'), j.error || ('Bridge answered ' + r.status)); return; }
    showErr($('#cfgErr'), ''); showErr($('#keyErr'), '');
    last = { output: state.ci.dryRun ? '' : j.output, report: j.report, ms: performance.now() - t0, source: srcFile ? 'file' : 'text', name: srcFile ? srcFile.name : 'pasted.log', inputChars: text.length, engine: 'local ' + (j.version || bridge.version) };
    renderResults();
  } catch (e) {
    bridge.ok = false; bridge.lost = true; startPolling(); renderEngine();
    run();
    showErr($('#cfgErr'), 'Bridge not answering. Result from the bundled copy.');
  }
}
function run() {
  if (engineActive() === 'local') return runLocal();
  if (srcFile) return runFile();
  const text = $('#inputText').value;
  const s = makeSanitizer(); if (!s) return;
  if (!text) { last = null; renderResults(); return; }
  const t0 = performance.now();
  let res; try { res = s.sanitizeText(text); } catch (e) { showErr($('#cfgErr'), errMessage(e)); return; }
  last = { output: res.output, report: res.report, ms: performance.now() - t0, source: 'text', name: 'pasted.log', inputChars: text.length, engine: 'bundled ' + LIB.version };
  renderResults();
}
async function runFile() {
  if (abort) { abort.abort(); }
  const s = makeSanitizer(); if (!s) return;
  const file = srcFile; const ctl = new AbortController(); abort = ctl;
  const sink = state.ci.dryRun ? L.toNullSink() : L.toStringSink();
  const prog = $('#progress'); prog.hidden = false; $('#stopBtn').hidden = false; $('#runBtn').disabled = true;
  const bar = $('#progBar'); const txt = $('#progText'); bar.style.width = '0%'; txt.textContent = 'starting';
  const t0 = performance.now();
  try {
    const report = await s.sanitizeStream(L.fromBlob(file), sink, {
      signal: ctl.signal,
      onProgress: (p) => { const pct = Math.min(100, Math.round(100 * p.charsRead / Math.max(1, file.size))); bar.style.width = pct + '%'; txt.textContent = pct + '%  ' + fmtInt(p.report.lineCount) + ' lines  ' + fmtInt(p.report.totalMatches) + ' matches'; }
    });
    if (ctl !== abort) return;
    last = { output: state.ci.dryRun ? '' : sink.text, report, ms: performance.now() - t0, source: 'file', name: file.name, inputChars: file.size, engine: 'bundled ' + LIB.version };
    renderResults();
  } catch (e) {
    if (L.isSanitizerError(e) && e.code === 'ABORTED') { $('#runMeta').textContent = 'Stopped.'; }
    else showErr($('#cfgErr'), errMessage(e));
  } finally {
    if (ctl === abort) { abort = null; prog.hidden = true; $('#stopBtn').hidden = true; $('#runBtn').disabled = false; }
  }
}
function setFile(file) {
  srcFile = file; $('#srcFile').hidden = !file;
  $('#inputText').hidden = Boolean(file);
  if (file) { $('#srcName').textContent = file.name; $('#srcSize').textContent = fmtBytes(file.size); $('#inputMeta').textContent = 'Streaming'; }
  else updateInputMeta();
  scheduleRun();
}
function updateInputMeta() {
  const v = $('#inputText').value; const n = v ? v.split(/\r?\n/).length : 0;
  $('#inputMeta').textContent = fmtInt(n) + ' line' + (n === 1 ? '' : 's') + ', ' + fmtInt(v.length) + ' characters';
}

// ---------- results ----------
let origToToken = new Map();
function renderResults() {
  const has = Boolean(last);
  $('#empty').hidden = has; $('#stats').hidden = !has; $('#resultTabs').hidden = !has;
  ['#panelBA', '#panelReport', '#panelOutput'].forEach((s) => { $(s).hidden = true; });
  if (!has) { $('#runMeta').textContent = ''; $('#ciBadge').hidden = true; return; }
  const rep = last.report; const counts = rep.counts || {};
  $('#stMatches').textContent = fmtInt(rep.totalMatches);
  $('#stDistinct').textContent = state.report.replacements ? fmtInt(rep.replacements.length) + (rep.replacementsTruncated ? '+' : '') : 'off';
  $('#stRules').textContent = Object.keys(counts).filter((k) => counts[k] > 0).length;
  $('#stLines').textContent = fmtInt(rep.lineCount);
  $('#stTime').textContent = (last.ms < 10 ? last.ms.toFixed(1) : Math.round(last.ms)) + ' ms';
  $('#runMeta').textContent = (last.source === 'file' ? last.name + ', ' + fmtBytes(last.inputChars) : fmtInt(last.inputChars) + ' characters') + (state.ci.dryRun ? ', report only' : '');
  const badge = $('#ciBadge');
  if (state.ci.failOnMatch) { const fail = rep.totalMatches > 0; badge.hidden = false; badge.textContent = fail ? 'CI exit code 1: matches found' : 'CI exit code 0: clean'; badge.classList.toggle('dashed', fail); } else badge.hidden = true;
  origToToken = new Map(); (rep.replacements || []).forEach((r) => origToToken.set(r.original, r.replacement));
  renderPanes(rep); renderReport(rep); renderOutput();
  const tab = $('#resultTabs [aria-selected="true"]') || $('#tabBA'); selectTab(tab.id);
}
function selectTab(id) {
  $$('#resultTabs [role="tab"]').forEach((b) => b.setAttribute('aria-selected', String(b.id === id)));
  $('#panelBA').hidden = id !== 'tabBA'; $('#panelReport').hidden = id !== 'tabReport'; $('#panelOutput').hidden = id !== 'tabOutput';
  $('#tabOutput').disabled = state.ci.dryRun; if (state.ci.dryRun && id === 'tabOutput') selectTab('tabBA');
}
function renderPanes(rep) {
  const before = rep.preview.before || [], after = rep.preview.after || [];
  // A source log line is the unit both panes agree on, so the segment list is cut at every
  // newline first and each line becomes its own cell. Segments keep their changed flag across
  // the cut, so a span that straddles a line break still marks on both of its lines.
  const toLines = (segs) => {
    const out = [[]];
    segs.forEach((s) => {
      String(s.text).split(/\r?\n/).forEach((part, i) => {
        if (i) out.push([]);
        if (part) out[out.length - 1].push({ text: part, changed: s.changed });
      });
    });
    while (out.length > 1 && !out[out.length - 1].length) out.pop();
    return out;
  };
  // The row number rides on --r, which the stylesheet reads as the cell's grid row, so the
  // before and after halves of one line land on one row and share its height.
  const cell = (pieces, side, row) => {
    const d = document.createElement('div');
    d.className = 'ba-line'; d.style.setProperty('--r', String(row));
    pieces.forEach((s) => {
      if (!s.changed) { d.append(s.text); return; }
      const m = document.createElement('mark'); m.textContent = s.text;
      const tok = side === 'after' ? s.text : (origToToken.get(s.text) || '');
      m.dataset.token = tok; m.className = 'tok' + (/^<R:/.test(tok) ? ' mask' : ''); m.tabIndex = 0; m.title = side === 'after' ? 'token' : 'original, replaced by ' + (tok || 'a token');
      d.append(m);
    });
    return d;
  };
  const pb = $('#paneBefore'), pa = $('#paneAfter');
  if (!before.length && !after.length) {
    pb.replaceChildren(); pa.replaceChildren(); $('#previewNote').textContent = state.report.previewBytes > 0 ? 'Preview is empty.' : 'Preview disabled in Report detail.';
  } else {
    const bl = toLines(before), al = toLines(after);
    const fb = document.createDocumentFragment(), fa = document.createDocumentFragment();
    for (let i = 0; i < Math.max(bl.length, al.length); i += 1) {
      fb.append(cell(bl[i] || [], 'before', i + 2)); fa.append(cell(al[i] || [], 'after', i + 2));
    }
    pb.replaceChildren(fb); pa.replaceChildren(fa);
    const total = (last.output || '').length; const shown = after.reduce((n, s) => n + s.text.length, 0);
    $('#previewNote').textContent = shown < total ? 'Preview: first ' + fmtInt(shown) + ' of ' + fmtInt(total) + ' characters. Full result under Sanitized output.' : '';
  }
  $('#beforeMeta').textContent = before.filter((s) => s.changed).length + ' spans'; $('#afterMeta').textContent = after.filter((s) => s.changed).length + ' tokens';
  pinned = null; highlight(null);
}
function highlight(token) {
  const marks = $$('#panelBA mark.tok'); let n = 0;
  marks.forEach((m) => { const hit = Boolean(token) && m.dataset.token === token; m.classList.toggle('hit', hit); if (hit && m.closest('#paneAfter')) n += 1; });
  const c = $('#corr');
  if (!token) c.innerHTML = '<span class="mut">Hover a token to see every occurrence. Click to pin.</span>';
  else c.innerHTML = '<code>' + esc(token) + '</code><span><b>' + n + '</b> occurrence' + (n === 1 ? '' : 's') + '</span>' + (pinned ? '<span class="chip">pinned</span>' : '');
}
function wirePanes() {
  const root = $('#panelBA');
  const tokOf = (e) => { const m = e.target.closest && e.target.closest('mark.tok'); return m ? m.dataset.token : null; };
  root.addEventListener('mouseover', (e) => { const t = tokOf(e); if (t && !pinned) highlight(t); });
  root.addEventListener('mouseout', (e) => { if (tokOf(e) && !pinned) highlight(null); });
  root.addEventListener('focusin', (e) => { const t = tokOf(e); if (t && !pinned) highlight(t); });
  root.addEventListener('focusout', (e) => { if (tokOf(e) && !pinned) highlight(null); });
  root.addEventListener('click', (e) => { const t = tokOf(e); if (!t) { pinned = null; highlight(null); return; } pinned = pinned === t ? null : t; highlight(pinned || t); });
  root.addEventListener('keydown', (e) => { if (e.key === 'Escape') { pinned = null; highlight(null); } });
}
function renderReport(rep) {
  const counts = rep.counts || {}; const ids = state.rules.map((r) => r.id).concat(Object.keys(counts).filter((k) => !state.rules.some((r) => r.id === k)));
  const rows = ids.filter((id) => counts[id] > 0); const max = Math.max(1, ...rows.map((id) => counts[id]));
  const bars = $('#bars'); bars.replaceChildren();
  if (!rows.length) bars.innerHTML = '<p class="small mut">No rule matched.</p>';
  rows.forEach((id) => {
    const r = state.rules.find((x) => x.id === id); const label = r ? ruleInfo(r).label : (id === 'custom' ? 'Always redact (custom)' : id);
    const d = document.createElement('div'); d.className = 'barrow';
    d.innerHTML = '<span class="n" title="' + esc(id) + '">' + esc(label) + '</span><span class="b"><i style="width:' + Math.round(100 * counts[id] / max) + '%"></i></span><span class="c">' + fmtInt(counts[id]) + '</span>';
    bars.appendChild(d);
  });
  const body = $('#replBody'); body.replaceChildren();
  const list = (rep.replacements || []).slice().sort((a, b) => b.count - a.count); const cap = 2000;
  list.slice(0, cap).forEach((x) => {
    const tr = document.createElement('tr');
    const ctx = (x.contextBefore !== undefined) ? esc(x.contextBefore) + '<b>[value]</b>' + esc(x.contextAfter) : '';
    tr.innerHTML = '<td>' + esc(x.ruleId) + '</td><td class="mono"><span class="orig">' + esc(x.original) + '</span></td><td class="mono">' + esc(x.replacement) + '</td><td class="mono">' + fmtInt(x.count) + '</td><td class="ctx">' + ctx + '</td>';
    body.appendChild(tr);
  });
  const note = $('#replNote');
  if (!state.report.replacements) note.textContent = 'Distinct values are off. Counts stay complete.';
  else if (rep.replacementsTruncated) note.textContent = 'Capped by Max values per rule. Counts stay complete. Contains original values, keep it local.';
  else if (list.length > cap) note.textContent = 'First ' + fmtInt(cap) + ' of ' + fmtInt(list.length) + ' shown. The downloaded report has all, and contains originals.';
  else note.textContent = 'Contains original values. Keep it local.';
}
function renderOutput() {
  const out = last.output || ''; const cap = 2 * 1048576; const pre = $('#outPre');
  if (state.ci.dryRun) { pre.textContent = ''; $('#outMeta').textContent = 'Report only: no output was produced.'; return; }
  pre.textContent = out.length > cap ? out.slice(0, cap) : out;
  $('#outMeta').textContent = fmtInt(out.length) + ' characters' + (out.length > cap ? ', first 2 MB shown here' : '');
}

// ---------- configuration, import, export ----------
function configOf(st) {
  return { rules: st.rules.map((r) => ({ id: r.id, enabled: r.enabled, kind: r.kind })), customRules: Object.values(st.custom).map(materialize), aggressive: st.aggressive, json: st.json, keyEncoding: st.keyEncoding, alwaysRedact: st.always, neverRedact: st.never, report: st.report, lines: st.lines, ci: st.ci, engine: st.engine, bridgeUrl: st.bridgeUrl };
}
function configObject(withKey) {
  const c = Object.assign({ logtotalSanitizerUi: 1, library: LIB, exportedAt: new Date().toISOString() }, configOf(state));
  if (withKey) c.key = key;
  return c;
}
function applyConfig(c) {
  const st = defaultState();
  (c.customRules || []).forEach((d) => { try { L.defineRule(d); st.custom[d.id] = Object.assign({ aggressivePatterns: [], jsonKeys: [], jsonKeyContains: [], token: '' }, d); } catch (e) { toast('Skipped custom rule ' + (d && d.id) + ': ' + errMessage(e)); } });
  if (Array.isArray(c.rules) && c.rules.length) {
    const seen = new Set(); st.rules = [];
    c.rules.forEach((r) => { if (!r || seen.has(r.id)) return; if (L.getBuiltinRule(r.id)) { st.rules.push({ id: r.id, enabled: r.enabled !== false, kind: 'builtin' }); seen.add(r.id); } else if (st.custom[r.id]) { st.rules.push({ id: r.id, enabled: r.enabled !== false, kind: 'custom' }); seen.add(r.id); } });
    L.builtinRuleIds.forEach((id) => { if (!seen.has(id)) st.rules.push({ id, enabled: true, kind: 'builtin' }); });
  }
  // A seed missing from a configuration saved by another build is new to this reader:
  // refreshSeeded places it at its declared position, so it is not appended here.
  const fromOtherBuild = c.seedVersion !== SEED_VERSION && Array.isArray(c.rules) && c.rules.length;
  Object.keys(st.custom).forEach((id) => { if (fromOtherBuild && SEEDED_IDS.includes(id)) return; if (!st.rules.some((r) => r.id === id)) st.rules.push({ id, enabled: true, kind: 'custom' }); });
  st.aggressive = Boolean(c.aggressive); st.json = c.json === 'off' ? 'off' : 'auto'; st.keyEncoding = c.keyEncoding === 'utf8' ? 'utf8' : 'hex';
  if (c.alwaysRedact) st.always = Object.assign(st.always, { values: (c.alwaysRedact.values || []).map(String), patterns: (c.alwaysRedact.patterns || []).map(String), token: c.alwaysRedact.token || 'CUSTOM', mode: c.alwaysRedact.mode === 'mask' ? 'mask' : 'pseudo' });
  if (c.neverRedact) st.never = Object.assign(st.never, { values: (c.neverRedact.values || []).map(String), patterns: (c.neverRedact.patterns || []).map(String), byRule: (c.neverRedact.byRule || []).filter((e) => e && e.ruleId).map((e) => ({ ruleId: e.ruleId, values: (e.values || []).map(String) })) });
  if (c.report) st.report = Object.assign(st.report, c.report); if (c.lines) st.lines = Object.assign(st.lines, c.lines); if (c.ci) st.ci = Object.assign(st.ci, c.ci);
  if (c.engine === 'local') st.engine = 'local'; if (typeof c.bridgeUrl === 'string' && /^https?:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(c.bridgeUrl.trim().replace(/\/+$/, ''))) st.bridgeUrl = c.bridgeUrl.trim();
  state = st; if (typeof c.key === 'string' && c.key) key = c.key;
  syncControls(); changed();
}
function persist() { try { localStorage.setItem(STORE, JSON.stringify(Object.assign({ seedVersion: SEED_VERSION }, configObject(false)))); } catch (e) { /* storage unavailable, the page still works */ } }
function refreshSeeded() {
  // A stored configuration wins over the shipped defaults, which is right for a reader's own
  // edits and wrong for the rules this build ships: a rename or a mode change stayed invisible
  // behind a configuration saved by an older build. When the fingerprint differs, the shipped
  // definition of a SEEDED rule replaces the stored one. Position and on/off are kept, rules
  // the reader wrote themselves are untouched, and a seeded rule this build dropped goes.
  // A seed the reader edited matches no shipped version; it is kept, switched off, as a copy.
  const kept = [];
  SEEDED_IDS.concat(RETIRED_SEED_IDS).forEach((id) => {
    const stored = state.custom[id]; if (!stored) return;
    const h = seedHash(stored); const now = SEEDED_RULES.find((d) => d.id === id);
    if (SHIPPED_SEED_HASHES.includes(h) || (now && seedHash(now) === h)) return;
    let copy = id + '_custom'; while (state.custom[copy]) copy += '_';
    state.custom[copy] = Object.assign({}, stored, { id: copy, label: (stored.label || id) + ' (your edit)' });
    const at = state.rules.findIndex((r) => r.id === id);
    state.rules.splice(at < 0 ? state.rules.length : at + 1, 0, { id: copy, enabled: false, kind: 'custom' });
    kept.push(copy);
  });
  SEEDED_RULES.forEach((d) => { try { L.defineRule(d); state.custom[d.id] = Object.assign({ aggressivePatterns: [], jsonKeys: [], jsonKeyContains: [], token: '' }, d); } catch (e) { /* a bad seed must not stop the page */ } });
  const shipped = new Set(SEEDED_IDS);
  const wasSeeded = (id) => RETIRED_SEED_IDS.includes(id);
  state.rules = state.rules.filter((r) => shipped.has(r.id) || !wasSeeded(r.id) || r.kind === 'builtin');
  Object.keys(state.custom).forEach((id) => { if (wasSeeded(id) && !shipped.has(id)) delete state.custom[id]; });
  // A seed new to this reader goes where DEFAULT_ORDER puts it, ahead of the next rule in that
  // order the reader still has, so it runs with the precedence it was tested at. A seed with no
  // declared place goes first, as before.
  SEEDED_IDS.forEach((id) => {
    if (state.rules.some((r) => r.id === id)) return;
    const next = DEFAULT_ORDER.slice(DEFAULT_ORDER.indexOf(id) + 1).find((n) => state.rules.some((r) => r.id === n));
    const at = DEFAULT_ORDER.includes(id) && next ? state.rules.findIndex((r) => r.id === next) : 0;
    state.rules.splice(at, 0, { id, enabled: true, kind: 'custom' });
  });
  if (kept.length) toast('Shipped rules updated. Your edited copy is kept, switched off: ' + kept.join(', '));
}
function restore() {
  try {
    const raw = localStorage.getItem(STORE);
    if (raw) {
      const c = JSON.parse(raw);
      if (c && c.logtotalSanitizerUi) {
        applyConfig(c);
        if (c.seedVersion !== SEED_VERSION) { refreshSeeded(); syncControls(); changed(); }
        return true;
      }
    }
  } catch (e) { /* ignore a bad stored value */ }
  return false;
}
function stamp() { return new Date().toISOString().slice(0, 10); }
const EXPORTS = {
  config: () => download('sanitizer-config-' + stamp() + '.json', JSON.stringify(configObject(false), null, 2), 'application/json'),
  configKey: () => download('sanitizer-config-with-key-' + stamp() + '.json', JSON.stringify(configObject(true), null, 2), 'application/json'),
  rules: () => { const c = enabledCustom(); if (!c.length) return toast("No enabled custom rules to export"); download('custom-rules.json', JSON.stringify(c, null, 2), 'application/json'); },
  exclude: () => { if (!state.never.values.length) return toast('The never-redact list is empty'); download('never-redact.txt', state.never.values.join('\n') + '\n'); },
  redact: () => { if (!state.always.values.length) return toast('The always-redact list is empty'); download('always-redact.txt', state.always.values.join('\n') + '\n'); },
  key: () => download('sanitizer.key', key + '\n'),
  bridge: () => download('sanitizer-bridge.mjs', BRIDGE_SRC, 'text/javascript'),
  update: () => download('update-page.mjs', UPDATE_SRC, 'text/javascript'),
  output: () => { if (!last || state.ci.dryRun) return toast('Sanitize something first'); download(last.name.replace(/\.[^.]+$/, '') + '.sanitized.log', last.output); },
  report: () => { if (!last) return toast('Sanitize something first'); download('report-' + stamp() + '.json', JSON.stringify(last.report, null, 2), 'application/json'); }
};
async function importFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.key')) { key = (await file.text()).trim(); state.keyEncoding = /^[0-9a-f]+$/i.test(key) && key.length % 2 === 0 ? 'hex' : 'utf8'; syncControls(); changed(); return toast('Key loaded from ' + file.name); }
  if (file.size <= 2 * 1048576) {
    const t = (await file.text()).trim();
    if (t.startsWith('{') || t.startsWith('[')) {
      let parsed = null; try { parsed = JSON.parse(t); } catch (e) { parsed = null; }
      // An export carries its own copy of the seeds; refresh them so an old export cannot pin old rules.
      if (parsed && parsed.logtotalSanitizerUi) { applyConfig(parsed); refreshSeeded(); syncControls(); changed(); return toast('Configuration imported' + (parsed.key ? ' with its key' : '')); }
      const list = Array.isArray(parsed) ? parsed : (parsed ? [parsed] : []);
      if (list.length && list.every((d) => d && typeof d === 'object' && typeof d.id === 'string' && Array.isArray(d.patterns))) {
        let n = 0;
        list.forEach((d) => { try { L.defineRule(d); state.custom[d.id] = Object.assign({ aggressivePatterns: [], jsonKeys: [], jsonKeyContains: [], token: '' }, d); if (!state.rules.some((r) => r.id === d.id)) state.rules.push({ id: d.id, enabled: true, kind: 'custom' }); n += 1; } catch (e) { toast('Skipped a rule: ' + errMessage(e)); } });
        syncControls(); changed(); return toast(n + ' custom rule' + (n === 1 ? '' : 's') + ' imported from ' + file.name);
      }
    }
  }
  setFile(file); toast('Log loaded: ' + file.name);
}
function wireImportExport() {
  const btn = $('#exportBtn'), menu = $('#exportMenu');
  const close = () => { menu.hidden = true; btn.setAttribute('aria-expanded', 'false'); };
  btn.addEventListener('click', () => { menu.hidden = !menu.hidden; btn.setAttribute('aria-expanded', String(!menu.hidden)); if (!menu.hidden) $('button', menu).focus(); });
  document.addEventListener('click', (e) => { if (!e.target.closest('.menu')) close(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
  menu.addEventListener('click', (e) => { const b = e.target.closest('[data-export]'); if (!b) return; EXPORTS[b.dataset.export](); close(); });
  $('#importFile').addEventListener('change', async (e) => { const f = e.target.files[0]; if (f) await importFile(f); e.target.value = ''; });
  $('#dlReport').addEventListener('click', EXPORTS.report); $('#dlOut').addEventListener('click', EXPORTS.output);
  $('#copyOut').addEventListener('click', () => { if (last) copy(last.output, 'Sanitized output copied'); });
  $('#revealBtn').addEventListener('click', (e) => { const t = $('#replTable'); const on = !t.classList.contains('reveal'); t.classList.toggle('reveal', on); e.currentTarget.setAttribute('aria-pressed', String(on)); e.currentTarget.textContent = on ? 'Hide originals' : 'Reveal originals'; });
}
