<body data-view="sanitize">
<header class="topbar">
  <div class="brand">
    <h1 class="title" title="Redactor UX for LogTotal Sanitizer">Redactor UX for LogTotal Sanitizer</h1>
    <code class="pkg" title="npm package name">@socprime/logtotal-sanitizer</code>
  </div>
  <div class="topbar-right">
    <p class="local" hidden title="Nothing leaves this tab. The count is measured by this page."><span class="dot" aria-hidden="true"></span><span class="t" id="badgeText">Runs in this tab. </span><span id="badgeNet">Network requests: <strong>measuring</strong></span></p>
    <a class="btn ghost tb" id="ghLink" hidden href="https://github.com/socprime/logtotal-sanitizer" target="_blank" rel="noopener"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 22v-4a4.8 4.8 0 0 0-1-3.5c3 0 6-2 6-5.5.08-1.25-.27-2.48-1-3.5.28-1.15.28-2.35 0-3.5 0 0-1 0-3 1.5-2.64-.5-5.36-.5-8 0C6 2 5 2 5 2c-.3 1.15-.3 2.35 0 3.5A5.4 5.4 0 0 0 4 9c0 3.5 3 5.5 6 5.5-.39.49-.68 1.05-.85 1.65-.17.6-.22 1.23-.15 1.85v4"/><path d="M9 18c-4.51 2-5-2-7-2"/></svg>GitHub</a>
    <button class="btn ghost tb" id="themeBtn" type="button">Light theme</button>
  </div>
</header>
<nav class="viewtabs" aria-label="Sections">
  <button type="button" data-view="sanitize" aria-pressed="true"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m7 21-4.3-4.3c-1-1-1-2.5 0-3.4l9.6-9.6c1-1 2.5-1 3.4 0l5.6 5.6c1 1 1 2.5 0 3.4L13 21"/><path d="M22 21H7"/><path d="m5 11 9 9"/></svg>Sanitize</button>
  <button type="button" data-view="configure" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>Settings</button>
  <button type="button" data-view="integrate" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 22v-5"/><path d="M9 8V2"/><path d="M15 8V2"/><path d="M18 8v5a4 4 0 0 1-4 4h-4a4 4 0 0 1-4-4V8Z"/></svg>Integrate</button>
  <button type="button" data-view="how" aria-pressed="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="8" height="8" x="3" y="3" rx="2"/><path d="M7 11v4a2 2 0 0 0 2 2h4"/><rect width="8" height="8" x="13" y="13" rx="2"/></svg>How it works</button>
</nav>

<div class="workspace">
<aside class="rail" aria-label="Configuration">
  <h2 class="sr">Configuration</h2>

  <details class="sec">
    <summary>Engine<span class="secval" data-engine="bundled">Bundled in this page</span><span class="secval" data-engine="local">Local installation</span></summary>
    <div class="sec-body">
      <label class="radio"><input type="radio" name="engine" value="bundled" aria-label="Bundled in this page" checked><span class="small"><b>Bundled in this page</b></span></label>
      <div id="bundledPanel">
        <div class="row between"><span class="small mono" id="bundledVersion"></span><button class="btn sm ghost" id="checkUpdate" type="button">Check for update</button></div>
        <p class="status" id="updateStatus" role="status" hidden></p>
        <div id="updateSetup" hidden>
          <div class="cmdrow"><span class="lbl">Update</span><code id="updateCmd"></code><span class="acts"><button class="btn sm ghost" id="updateCopy" type="button">Copy</button><button class="btn sm ghost" id="updateDownload" type="button">Script</button></span></div>
        </div>
        <div id="newPageSetup" hidden>
          <p class="small">A newer version of this page is published. Your rules and settings export from the Export menu and import into it.</p>
          <p class="small"><a id="newPageLink" href="#" rel="noreferrer noopener" target="_blank">Download the newer page</a></p>
        </div>
        <label class="switch"><input type="checkbox" id="autoCheck" aria-label="Check for updates when this page opens"><span class="sw"></span><span class="small"><b>Check when this page opens</b> <span class="mut">off by default, at most once a day, one request to GitHub, nothing about your logs</span></span></label>
      </div>
      <label class="radio"><input type="radio" name="engine" value="local" aria-label="Local installation"><span class="small"><b>Local installation</b></span></label>
      <div id="localPanel" hidden>
        <div class="row"><input class="input mono grow" id="bridgeUrl" value="http://127.0.0.1:7412" spellcheck="false" aria-label="Bridge address"><button class="btn sm" id="bridgeConnect" type="button">Connect</button></div>
        <p class="status" id="bridgeStatus" role="status" hidden></p>
        <div id="bridgeSetup" hidden>
          <div class="cmdrow"><span class="lbl">Install</span><code>npm install @socprime/logtotal-sanitizer</code><span class="acts"><button class="btn sm ghost" type="button" data-copy="npm install @socprime/logtotal-sanitizer">Copy</button></span></div>
          <div class="cmdrow"><span class="lbl">Start</span><code id="startCmd">node sanitizer-bridge.mjs</code><span class="acts"><button class="btn sm ghost" id="startCopy" type="button">Copy</button><button class="btn sm ghost" id="bridgeDownload" type="button">Script</button></span></div>
        </div>
      </div>
    </div>
  </details>

  <details class="sec" open>
    <summary>Rules and priority <span class="count" id="rulesOn">11</span></summary>
    <div class="sec-body">
      <ol class="rules" id="ruleList"></ol>
      <!-- JJ ruling 14: the Add custom rule and Reset order row leaves view, losses accepted.
           Both buttons keep their ids and their handlers; the row's hidden attribute is what
           removes them, and the page's reset already carries display:none !important. -->
      <div class="row" hidden>
        <button class="btn sm" id="addRuleBtn" type="button"><svg class="ico" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 12h14"/><path d="M12 5v14"/></svg>Add custom rule</button>
        <button class="btn sm ghost" id="resetOrder" type="button"><svg class="ico" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>Reset order</button>
      </div>
      <details class="editor-wrap">
        <summary><h3 id="rf-title">New custom rule</h3></summary>
        <form class="editor" id="ruleEditor" autocomplete="off">
        <div class="two">
          <div class="field"><label for="rf-id">Identifier</label><input class="input mono" id="rf-id" placeholder="agent_keys" spellcheck="false"></div>
          <div class="field"><label for="rf-label">Label</label><input class="input" id="rf-label" placeholder="Agent keys"></div>
        </div>
        <div class="field"><label for="rf-desc">Description</label><input class="input" id="rf-desc" placeholder="Vendor API keys. Swap in your own prefixes."></div>
        <div class="two">
          <div class="field"><label for="rf-mode">Mode</label><select id="rf-mode"><option value="pseudo">pseudo: keeps a type prefix</option><option value="mask">mask: hides the kind of value</option></select></div>
          <div class="field"><label for="rf-token">Token prefix</label><input class="input mono" id="rf-token" placeholder="AGENTKEY" spellcheck="false"></div>
        </div>
        <div class="two">
          <div class="field"><label for="rf-patterns">Patterns, one per line</label><textarea id="rf-patterns" placeholder="\bsk-ant-[A-Za-z0-9_-]{20,}&#10;\bsk-proj-[A-Za-z0-9_-]{20,}&#10;\bAIza[0-9A-Za-z_-]{35}&#10;\bgsk_[A-Za-z0-9]{52}&#10;\bxai-[A-Za-z0-9]{80}" spellcheck="false"></textarea></div>
          <div class="field"><label for="rf-aggr">Aggressive patterns</label><textarea id="rf-aggr" placeholder="\bvcp_[A-Za-z0-9]{24}\b&#10;\bsb_secret_[A-Za-z0-9]{32}\b&#10;\bsk-or-v1-[0-9a-f]{64}\b&#10;\br8_[A-Za-z0-9]{37}\b&#10;\bhf_[A-Za-z0-9]{34,40}\b" spellcheck="false"></textarea></div>
        </div>
        <div class="two">
          <div class="field"><label for="rf-jsonKeys">JSON keys, comma separated</label><input class="input mono" id="rf-jsonKeys" placeholder="ticketId, caseNumber" spellcheck="false"></div>
          <div class="field"><label for="rf-jsonContains">JSON key contains, comma separated</label><input class="input mono" id="rf-jsonContains" placeholder="ticket" spellcheck="false"></div>
        </div>
        <div class="err" id="rf-err" role="alert"></div>
        <div class="row">
          <button class="btn sm primary" id="rf-save" type="submit">Save rule</button>
          <button class="btn sm" id="rf-test" type="button">Test on current input</button>
          <button class="btn sm ghost" id="rf-cancel" type="button">Cancel</button>
          <span class="small mut" id="rf-testOut"></span>
        </div>
      </form>
      </details>
    </div>
  </details>

  <details class="sec" open>
    <summary>Matching<label class="switch"><input type="checkbox" id="aggressive"><span class="sw"></span><span class="small"><b>Aggressive mode</b></span></label></summary>
    <div class="sec-body">
      <div class="field"><label for="jsonMode">JSON lines</label><select id="jsonMode"><option value="auto">auto: redact named fields, scan the rest</option><option value="off">off: plain-text scan only</option></select></div>
    </div>
  </details>

  <details class="sec" open>
    <summary>HMAC key</summary>
    <div class="sec-body">
      <div class="field">
        <div class="row"><input class="input mono grow" id="keyInput" aria-label="HMAC key" type="password" spellcheck="false" autocomplete="off"><button class="btn icon" id="keyShow" type="button" aria-pressed="false" aria-label="Show key">o</button></div>
      </div>
      <div class="row">
        <button class="btn sm" id="keyGen" type="button">Generate new key</button>
        <button class="btn sm ghost" id="keyCopy" type="button">Copy</button>
        <select id="keyEnc" class="grow" aria-label="Key encoding" style="max-width:190px"><option value="hex">hex (generated)</option><option value="utf8">utf8 (passphrase)</option></select>
      </div>
      <div class="err" id="keyErr"></div>
    </div>
  </details>

  <details class="sec">
    <summary>Always redact <span class="count" id="alwaysCount">0</span></summary>
    <div class="sec-body">
      <div class="field"><label for="alwaysValues">Exact values, one per line</label><textarea id="alwaysValues" placeholder="acme-internal-host&#10;project-falcon" spellcheck="false"></textarea></div>
      <div class="field"><label for="alwaysPatterns">Patterns, one per line</label><textarea id="alwaysPatterns" placeholder="CASE-\d{6}" spellcheck="false"></textarea></div>
      <div class="row">
        <div class="field grow"><label for="alwaysToken">Token prefix</label><input class="input mono" id="alwaysToken" value="CUSTOM" spellcheck="false"></div>
        <div class="field grow"><label for="alwaysMode">Mode</label><select id="alwaysMode"><option value="pseudo">pseudo</option><option value="mask">mask</option></select></div>
      </div>
      <label class="btn sm ghost file-btn">Load a --redact-file list<input type="file" id="alwaysFile" class="cover" aria-label="Load an always-redact list file" accept=".txt,text/plain"></label>
    </div>
  </details>

  <details class="sec">
    <summary>Never redact <span class="count" id="neverCount">0</span></summary>
    <div class="sec-body">
      <div class="field"><label for="neverValues">Exact values, one per line</label><textarea id="neverValues" placeholder="127.0.0.1&#10;localhost" spellcheck="false"></textarea></div>
      <div class="field"><label for="neverPatterns">Patterns that must match the whole value, one per line</label><textarea id="neverPatterns" placeholder="10\.0\.0\.\d+" spellcheck="false"></textarea></div>
      <div class="field"><span class="lbl">Keep a value for one rule only</span>
        <div class="row"><select id="neverRuleSel" aria-label="Rule" style="max-width:190px"></select><input class="input mono grow" id="neverRuleValues" placeholder="values, comma separated" spellcheck="false"></div>
      </div>
      <label class="btn sm ghost file-btn">Load an --exclude-file list<input type="file" id="neverFile" class="cover" aria-label="Load a never-redact list file" accept=".txt,text/plain"></label>
    </div>
  </details>

  <details class="sec">
    <summary>Report detail</summary>
    <div class="sec-body">
      <label class="switch"><input type="checkbox" id="collectRepl" checked><span class="sw"></span><span class="small"><b>List distinct replaced values</b></span></label>
      <div class="row">
        <div class="field grow"><label for="ctxChars">Context characters</label><input class="input mono" id="ctxChars" type="number" min="0" max="200" value="24"></div>
        <div class="field grow"><label for="maxPerRule">Max values per rule</label><input class="input mono" id="maxPerRule" type="number" min="1" placeholder="unlimited"></div>
      </div>
      <div class="field"><label for="previewBytes">Before-and-after preview window, characters</label><input class="input mono" id="previewBytes" type="number" min="0" step="1024" value="262144"></div>
    </div>
  </details>

  <details class="sec">
    <summary>Long lines</summary>
    <div class="sec-body">
      <div class="row">
        <div class="field grow"><label for="maxLine">Max line characters</label><input class="input mono" id="maxLine" type="number" min="1" value="1048576"></div>
        <div class="field grow"><label for="overlap">Overlap characters</label><input class="input mono" id="overlap" type="number" min="0" value="1024"></div>
      </div>
    </div>
  </details>

  <details class="sec">
    <summary>Run mode</summary>
    <div class="sec-body">
      <label class="switch"><input type="checkbox" id="dryRun"><span class="sw"></span><span class="small"><b>Report only</b> <span class="mut mono">--dry-run</span></span></label>
      <label class="switch"><input type="checkbox" id="failOnMatch"><span class="sw"></span><span class="small"><b>Fail on match</b> <span class="mut mono">--fail-on-match</span></span></label>
    </div>
  </details>

  <div class="sec"><div class="sec-body reset-row" style="padding-top:12px"><button class="btn sm ghost" id="resetAll" type="button">Reset to defaults</button><span class="small mut" id="cfgState">defaults</span></div></div>
</aside>

<main class="main">
  <section class="card dropzone" id="inputCard" aria-labelledby="inputTitle">
    <div class="card-head">
      <h2 id="inputTitle">Import or paste</h2>
      <div class="row" style="margin-left:auto">
        <select id="sampleSel" aria-label="Sample log"></select>
        <button class="btn sm" id="loadSample" type="button"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M16 13H8"/><path d="M16 17H8"/><path d="M10 9H8"/></svg>Load sample</button>
        <label class="btn sm file-btn"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>Open file<input type="file" id="openFile" class="cover" aria-label="Open a log file"></label>
        <label class="btn ghost tb file-btn"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></svg>Import<input type="file" id="importFile" class="cover" aria-label="Import a configuration, rules file, key or log" accept=".json,.txt,.log,.key,text/plain,application/json"></label>
        <div class="menu">
          <button class="btn ghost tb" id="exportBtn" type="button" aria-haspopup="menu" aria-expanded="false"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>Export</button>
          <div class="popover" id="exportMenu" role="menu" hidden>
            <div class="grp">Configuration</div>
            <button type="button" role="menuitem" data-export="config">Configuration <span class="k">sanitizer-config.json</span></button>
            <button type="button" role="menuitem" data-export="configKey">Configuration with key <span class="k">includes the HMAC key</span></button>
            <div class="grp">Local installation</div>
            <button type="button" role="menuitem" data-export="bridge">Bridge script <span class="k">sanitizer-bridge.mjs</span></button>
            <button type="button" role="menuitem" data-export="update">Page update script <span class="k">update-page.mjs</span></button>
            <div class="grp">CLI files</div>
            <button type="button" role="menuitem" data-export="rules">Enabled custom rules for --rules-file <span class="k">custom-rules.json</span></button>
            <button type="button" role="menuitem" data-export="exclude">Never-redact list for --exclude-file <span class="k">never-redact.txt</span></button>
            <button type="button" role="menuitem" data-export="redact">Always-redact list for --redact-file <span class="k">always-redact.txt</span></button>
            <button type="button" role="menuitem" data-export="key">Key for --key-file <span class="k">sanitizer.key</span></button>
            <div class="grp">This run</div>
            <button type="button" role="menuitem" data-export="output">Sanitized log <span class="k">.sanitized.log</span></button>
            <button type="button" role="menuitem" data-export="report">Report <span class="k">report.json, contains originals</span></button>
          </div>
        </div>
        <button class="btn sm ghost" id="stopBtn" type="button" hidden>Stop</button>
        <button class="btn primary" id="runBtn" type="button">Sanitize</button>
      </div>
    </div>
    <div class="card-body">
      <div class="srcfile" id="srcFile" hidden><span>File</span><span class="name" id="srcName"></span><span class="mut" id="srcSize"></span><button class="btn sm ghost" id="srcRemove" type="button" style="margin-left:auto">Back to paste</button></div>
      <textarea class="input-area" id="inputText" aria-label="Log text" placeholder="Sep 19 10:01:02 srv-app-01 sshd[1122]: Accepted publickey for alice@example.test from 10.20.4.15 port 51522" spellcheck="false"></textarea>
      <div class="input-foot">
        <span class="small mut" id="inputMeta">0 lines</span>
        <button class="btn sm" id="clearInput" type="button"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>Clear</button>
      </div>
      <div class="progress" id="progress" hidden><div class="bar"><i id="progBar"></i></div><span class="mono" id="progText"></span></div>
      <div class="err" id="cfgErr" role="alert"></div>
    </div>
  </section>

  <section class="card" id="resultsCard" aria-labelledby="resultsTitle">
    <div class="card-head">
      <h2 id="resultsTitle">Result</h2>
      <span class="chip dashed" id="ciBadge" hidden></span>
      <span class="small mut" id="runMeta" style="margin-left:auto"></span>
      <button class="btn sm ghost" id="copyOut" type="button"><svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.75" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>Copy output</button>
    </div>
    <div class="stats" id="stats" hidden>
      <div class="stat live"><div class="v" id="stMatches">0</div><div class="l">Matches</div></div>
      <div class="stat"><div class="v" id="stDistinct">0</div><div class="l">Distinct values</div></div>
      <div class="stat"><div class="v" id="stRules">0</div><div class="l">Rules fired</div></div>
      <div class="stat"><div class="v" id="stLines">0</div><div class="l">Lines</div></div>
      <div class="stat"><div class="v" id="stTime">0 ms</div><div class="l">Elapsed locally</div></div>
    </div>
    <div class="tabs" role="tablist" id="resultTabs" hidden>
      <button type="button" role="tab" id="tabBA" aria-selected="true" aria-controls="panelBA">Before and after</button>
      <button type="button" role="tab" id="tabReport" aria-selected="false" aria-controls="panelReport">Report</button>
      <button type="button" role="tab" id="tabOutput" aria-selected="false" aria-controls="panelOutput">Sanitized output</button>
    </div>
    <div class="empty" id="empty">
      <p>Paste a log or load a sample.</p>
      <button class="btn sm" id="emptySample" type="button">Load sample</button>
    </div>
    <div class="panel" id="panelBA" role="tabpanel" aria-labelledby="tabBA" hidden>
      <div class="corr" id="corr"><span class="mut">Hover a token to see every occurrence. Click to pin.</span></div>
      <div class="split" tabindex="0" role="group" aria-label="Before and after, line for line">
        <div class="pane"><div class="pane-head"><span>Clear text</span><span id="beforeMeta"></span></div><pre id="paneBefore"></pre></div>
        <div class="pane"><div class="pane-head"><span>Redacted text</span><span id="afterMeta"></span></div><pre id="paneAfter"></pre></div>
      </div>
      <div class="legend"><span><i></i>pseudo token, type prefix kept</span><span><i class="dot"></i>mask token, kind hidden</span><span id="previewNote"></span></div>
    </div>
    <div class="panel" id="panelReport" role="tabpanel" aria-labelledby="tabReport" hidden>
      <h3>Matches by rule</h3>
      <div class="bars" id="bars"></div>
      <div class="row between" style="margin-top:8px">
        <h3>Distinct values replaced</h3>
        <div class="row"><button class="btn sm ghost" id="revealBtn" type="button" aria-pressed="false">Reveal originals</button><button class="btn sm ghost" id="dlReport" type="button">Download report JSON</button></div>
      </div>
      <p class="note" id="replNote">Contains original values. Keep it local.</p>
      <div class="tblwrap"><table class="tbl" id="replTable"><thead><tr><th>Rule</th><th>Original</th><th>Token</th><th>Count</th><th>Context</th></tr></thead><tbody id="replBody"></tbody></table></div>
    </div>
    <div class="panel" id="panelOutput" role="tabpanel" aria-labelledby="tabOutput" hidden>
      <div class="row between"><span class="small mut" id="outMeta"></span><div class="row"><button class="btn sm" id="dlOut" type="button">Download sanitized log</button></div></div>
      <pre class="outpre" id="outPre"></pre>
    </div>
  </section>

  <section class="card integrate" id="integrateCard" aria-labelledby="intTitle">
    <div class="card-head">
      <h2 id="intTitle" class="sr">Integrate</h2>
    </div>
    <div class="tabs" role="tablist">
      <button type="button" role="tab" data-int="install" aria-selected="true">Install</button>
      <button type="button" role="tab" data-int="cli" aria-selected="false">CLI</button>
      <button type="button" role="tab" data-int="node" aria-selected="false">Node.js</button>
      <button type="button" role="tab" data-int="browser" aria-selected="false">Browser</button>
      <button type="button" role="tab" data-int="actions" aria-selected="false">GitHub Actions</button>
      <button type="button" role="tab" data-int="precommit" aria-selected="false">pre-commit</button>
      <button type="button" role="tab" data-int="pipeline" aria-selected="false">Pipelines</button>
      <button type="button" role="tab" data-int="bridge" aria-selected="false">Local bridge</button>
    </div>
    <div class="panel">
      <p class="small" id="intNote"></p>
      <div class="codeblock"><div class="cb-head"><span id="intFile">shell</span><button class="btn sm ghost" id="copyInt" type="button">Copy</button></div><pre id="intCode"></pre></div>
    </div>
  </section>
  <section class="card how" id="howCard" aria-labelledby="howTitle">
    <div class="how-body">
      <h2 id="howTitle">How it works</h2>
      <p>Redactor UX runs SOC Prime's logtotal-sanitizer library (0.2.0-beta.3) unchanged in this tab. By default, nothing leaves your computer.</p>
      <p>Three requests stay off until you turn them on: two version checks against npm and GitHub, and the local engine, which sends your text to a bridge at 127.0.0.1 or localhost on your own machine.</p>
      <figure class="hiw">
        <div class="hiw-scroll">
<svg class="hiw-diagram" viewBox="0 0 983 318" role="img" aria-labelledby="hiwTitle hiwDesc">
  <title id="hiwTitle">How the library turns your text into redacted text and a report</title>
  <desc id="hiwDesc">Your text goes to the line splitter, which sends one line at a time to a JSON or text check. JSON lines go to a JSON field check, which sends invalid JSON back as text. Text lines and other JSON text values go to rule matching. Named field values and found values go to the token maker, which uses the secret key and sends each token back. The JSON or text step outputs redacted text and a report with counts and originals.</desc>
  <defs>
    <marker id="hiwArrow" viewBox="0 0 10 10" refX="9" refY="5" markerWidth="7" markerHeight="7" orient="auto-start-reverse">
      <path d="M0,0 L10,5 L0,10 z"/>
    </marker>
  </defs>

  <!-- boxes -->
  <g class="box" data-id="B1"><rect x="10" y="140" width="96" height="50" rx="6"/><text x="58" y="165">Your text</text></g>
  <g class="box" data-id="B2"><rect x="183" y="140" width="96" height="50" rx="6"/><text x="231" y="165"><tspan x="231" dy="-9">Line</tspan><tspan x="231" dy="18">splitter</tspan></text></g>
  <g class="box" data-id="B3"><rect x="356" y="140" width="96" height="50" rx="6"/><text x="404" y="165"><tspan x="404" dy="-9">JSON</tspan><tspan x="404" dy="18">or text</tspan></text></g>
  <g class="box" data-id="B4"><rect x="529" y="30" width="96" height="50" rx="6"/><text x="577" y="55"><tspan x="577" dy="-9">JSON field</tspan><tspan x="577" dy="18">check</tspan></text></g>
  <g class="box" data-id="B5"><rect x="529" y="140" width="96" height="50" rx="6"/><text x="577" y="165"><tspan x="577" dy="-9">Rule</tspan><tspan x="577" dy="18">matching</tspan></text></g>
  <g class="box" data-id="B6"><rect x="702" y="140" width="96" height="50" rx="6"/><text x="750" y="165"><tspan x="750" dy="-9">Token</tspan><tspan x="750" dy="18">maker</tspan></text></g>
  <g class="box key" data-id="B7"><rect x="702" y="30" width="96" height="50" rx="6"/><text x="750" y="55">Secret key</text></g>
  <g class="box" data-id="B8"><rect x="875" y="90" width="96" height="50" rx="6"/><text x="923" y="115"><tspan x="923" dy="-9">Redacted</tspan><tspan x="923" dy="18">text</tspan></text></g>
  <g class="box" data-id="B9"><rect x="875" y="195" width="96" height="50" rx="6"/><text x="923" y="220">Report</text></g>

  <!-- arrows, spec order -->
  <path class="flow" d="M106,165 H181" marker-end="url(#hiwArrow)"/>
  <text class="lbl mid" x="144" y="138">text</text>
  <text class="lbl mid" x="144" y="154">chunks</text>

  <path class="flow" d="M279,165 H354" marker-end="url(#hiwArrow)"/>
  <text class="lbl mid" x="317" y="138">one line</text>
  <text class="lbl mid" x="317" y="154">each</text>

  <path class="flow" d="M380,140 V45 H527" marker-end="url(#hiwArrow)"/>
  <text class="lbl mid" x="455" y="37">JSON lines</text>

  <path class="flow" d="M527,68 H428 V138" marker-end="url(#hiwArrow)"/>
  <text class="lbl mid" x="478" y="84">not valid</text>
  <text class="lbl mid" x="478" y="100">JSON</text>

  <path class="flow" d="M452,165 H527" marker-end="url(#hiwArrow)"/>
  <text class="lbl mid" x="490" y="155">text lines</text>

  <path class="flow" d="M577,80 V138" marker-end="url(#hiwArrow)"/>
  <text class="lbl" x="585" y="100">other</text>
  <text class="lbl" x="585" y="116">text</text>
  <text class="lbl" x="585" y="132">values</text>

  <path class="flow" d="M627,65 H663 V152 H700" marker-start="url(#hiwArrow)" marker-end="url(#hiwArrow)"/>
  <text class="lbl" x="669" y="98">named</text>
  <text class="lbl" x="669" y="114">field</text>
  <text class="lbl" x="669" y="130">values</text>

  <path class="flow" d="M627,178 H700" marker-start="url(#hiwArrow)" marker-end="url(#hiwArrow)"/>
  <text class="lbl mid" x="663" y="206">found values</text>

  <path class="flow" d="M750,80 V138" marker-end="url(#hiwArrow)"/>
  <text class="lbl" x="757" y="112">key</text>

  <path class="flow" d="M430,190 V262 H850 V115 H873" marker-end="url(#hiwArrow)"/>
  <text class="lbl mid" x="640" y="254">redacted lines</text>

  <path class="flow" d="M378,190 V285 H862 V220 H873" marker-end="url(#hiwArrow)"/>
  <text class="lbl mid" x="640" y="304">counts and originals</text>
</svg>
        </div>
        <figcaption>An arrow with two heads means the token maker gives each token back to the step that sent it the value.</figcaption>
      </figure>
      <h3>Rules scan each line</h3>
      <p>Each line is scanned alone. JSON lines (starting with { or [) come out compacted, with fields such as password replaced whole. Everything else is scanned as plain text.</p>
      <p>Rules run top first, in an order you can change. Where matches overlap, the earliest start wins, then the higher rule. Some rules verify a match first, such as a Luhn checksum on card numbers. Allowlisted values and failed checks stay unredacted but still block overlaps.</p>
      <h3>Values become tokens</h3>
      <p>A found value becomes a token like <code>&lt;IP:3f9a0c2e7b1d4a65&gt;</code>, labeled by type in Pseudonymize mode and with R in Redact mode. The same key, rule and value always give the same token, and a new key changes them all. The page doesn't save the key with your settings. Download it if you'll want matching tokens later.</p>
      <h3>Nothing is encrypted</h3>
      <p>The library has no dependencies. It computes SHA-256 and HMAC-SHA256 itself, without crypto.subtle or Node's crypto.</p>
      <p>A token is a one-way HMAC-SHA256, under your key, of the rule id, a zero byte and the value, so it can't be decrypted. It keeps the first 8 of 32 bytes (64 bits) as 16 hex characters.</p>
      <p>Its one browser crypto call, crypto.getRandomValues, makes new keys of 32 random bytes. You can supply your own key as hex or plain text. The page loads no outside scripts, styles or fonts.</p>
      <h3>The report holds originals</h3>
      <p>It lists every original value with nearby text. Keep it private.</p>
      <p>It also counts matches per rule and previews about the first 262,144 characters before and after.</p>
      <h3>Limits</h3>
      <ul>
        <li>Values no rule covers pass through.</li>
        <li>Values split across lines are missed, as are values across the cut in any line over 1,048,576 characters.</li>
        <li>JSON numbers, true, false and null are kept. Field-name rules skip list items.</li>
        <li>Private IPs are redacted, but loopback 127.0.0.1 isn't.</li>
        <li>Memory grows with each new value.</li>
        <li>Anyone with the key can hash a guess and compare tokens.</li>
      </ul>
      <h3>11 library rules</h3>
      <ul>
        <li>Redact (R): secrets, session and CSRF cookies, payment data, government IDs, health identifiers, home-path usernames.</li>
        <li>Pseudonymize: phones (PHONE), IP and MAC addresses (IP), hosts and domains (HOST), emails, usernames and Windows account IDs (USER), coordinates and postcodes (GEO).</li>
        <li>Added by this page: driver's licenses (DLN), license plates (PLATE), LLM API keys (LLMAPI) and cryptocurrency addresses (CRYPTO). Licenses and plates cover the 50 US states, DC and 10 Canadian provinces. License plates start on Strict and driver's licenses on Loose.</li>
      </ul>
    </div>
  </section>
</main>
</div>

<footer class="foot">
  <div class="row"><span><b>Library</b> <code id="libLine"></code></span><span>Apache-2.0</span><span>Zero runtime dependencies</span><span>Node 20 or newer for the CLI</span></div>
  <div class="row"><span>Library: LogTotal Sanitizer, open source from <a href="https://socprime.com" target="_blank" rel="noopener">SOC Prime</a></span><a id="repoLink" href="https://github.com/socprime/logtotal-sanitizer" target="_blank" rel="noopener">GitHub</a><a href="https://www.npmjs.com/package/@socprime/logtotal-sanitizer" target="_blank" rel="noopener">npm</a><a href="https://logtotal.com" target="_blank" rel="noopener">LogTotal</a></div>
  <div class="row"><span>Built by <a href="https://authenticmarketing.xyz" target="_blank" rel="noopener">Authentic Marketing</a>. Not affiliated with or endorsed by SOC Prime. LogTotal and SOC Prime are trademarks of SOC Prime.</span></div>
</footer>
<div class="toast" id="toast" role="status" aria-live="polite"></div>
