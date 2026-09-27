import json, os, sys, time
from playwright.sync_api import sync_playwright
import pathlib
PAGE = (pathlib.Path(__file__).resolve().parent.parent / 'index.html').as_uri()
HERE = os.path.dirname(os.path.abspath(__file__))
OUT = os.path.join(HERE, 'shots'); os.makedirs(OUT, exist_ok=True)
results = []
def toggle(page, sel):
    page.click(f'label:has({sel})')
# Added 2026-09-21 under JJ's ruling that one destination shows at every width (Configure, Sanitize,
# Integrate): the flow below drives all three regions, so it selects the destination before each block.
# No assertion changed; the navigation only brings each region on screen the way a user would.
def view(page, name):
    page.click(f'.viewtabs [data-view="{name}"]'); page.wait_for_timeout(150)
    assert page.evaluate('document.body.dataset.view') == name, f'destination {name} did not apply'
def check(name, ok, detail=''):
    results.append((name, bool(ok), detail)); print(('PASS ' if ok else 'FAIL ') + name + (': ' + str(detail) if detail else ''))
with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={'width': 1440, 'height': 900}, color_scheme='dark', accept_downloads=True)
    page = ctx.new_page()
    errors = []
    page.on('console', lambda m: errors.append(m.text) if m.type in ('error', 'warning') else None)
    page.on('pageerror', lambda e: errors.append('pageerror: ' + str(e)))
    reqs = []
    page.on('request', lambda r: reqs.append(r.url) if not r.url.startswith('file://') else None)
    page.goto(PAGE); page.wait_for_selector('#stats:not([hidden])', timeout=10000)
    check('no console errors or page errors on load', not errors, errors[:3])
    # Amended 2026-09-21 on JJ's order: Export moved beside Input and the badge left the top bar, so the
    # header row is now the title and the theme toggle; their vertical centres must agree at 1000 wide.
    check('header controls stay on one row at 1000 wide', (lambda: (page.set_viewport_size({'width': 1000, 'height': 900}), page.wait_for_timeout(200), abs((page.locator('#themeBtn').bounding_box()['y'] + page.locator('#themeBtn').bounding_box()['height'] / 2) - (page.locator('.brand .title').bounding_box()['y'] + page.locator('.brand .title').bounding_box()['height'] / 2)) < 8, page.set_viewport_size({'width': 1440, 'height': 900}), page.wait_for_timeout(200))[2])())
    check('Import and Export sit in the Input toolbar', page.locator('#inputCard .card-head #exportBtn').count() == 1 and page.locator('#inputCard .card-head #importFile').count() == 1 and page.locator('#exportBtn').is_visible())
    check('no non-file network requests', not reqs, reqs[:3])
    check('net count reads 0', page.text_content('#badgeNet strong').strip() == '0', page.text_content('#badgeNet strong'))
    m = int(page.text_content('#stMatches').replace(',', '')); check('incident sample matches 43', m == 43, m)
    seeded = page.evaluate('window.LogTotalSanitizerUi.seededIds().length')
    builtin = page.evaluate('window.LogTotalSanitizerUi.builtinCount()')
    check('rules on equals the rendered rows', page.text_content('#rulesOn') == str(seeded + builtin), page.text_content('#rulesOn'))
    # Amended 2026-09-22 on JJ's order: the page now ships eleven seeded custom rules
    # (Agent APIs plus the ten coin formats) above the eleven builtins, so the default
    # list is 22 rows. Derived from the page's own seed list rather than hard coded, so
    # adding or removing a seed cannot silently pass this check.
    check('seeded plus builtin rule rows rendered', page.locator('#ruleList .rule').count() == seeded + builtin, 'seeded %d builtin %d' % (seeded, builtin))
    # The seeded rules no longer sit first; JJ set an explicit default order on 2026-09-22.
    # So assert the rendered list matches the order the page itself declares, which holds
    # whatever that order is and still fails if rendering and intent drift apart.
    # Compared against the DEFAULT_ORDER constant, not against defaultState(), so that a
    # change to the rendering code cannot move both sides together and keep the check green.
    rendered = page.evaluate("[...document.querySelectorAll('#ruleList .rule')].map(e => e.dataset.id)")
    declared = page.evaluate('window.LogTotalSanitizerUi.declaredOrder()')
    check('rendered order matches the declared default order',
          rendered[:len(declared)] == declared, '%s vs %s' % (rendered[:3], declared[:3]))
    check('rules fired = 11', page.text_content('#stRules') == '11', page.text_content('#stRules'))
    # Amended 2026-09-21 on JJ's order: the GitHub button left the top bar (element hidden, id kept); the
    # footer link carries the repository from here on.
    check('no SOC Prime logo or link in header (JJ ruling 2026-09-24) and GitHub link in footer', page.locator('.brand .logo-svg').count() == 0 and page.locator('.brand a[href*="socprime.com"]').count() == 0 and page.get_attribute('#repoLink', 'href') == 'https://github.com/socprime/logtotal-sanitizer' and page.locator('#repoLink').is_visible())
    check('favicon is a data uri', (page.get_attribute('link[rel="icon"]', 'href') or '').startswith('data:image/png;base64,'))
    page.screenshot(path=OUT + '/01-dark-desktop.png', full_page=False)
    page.screenshot(path=OUT + '/01b-dark-full.png', full_page=True)
    # correlation hover
    first = page.locator('#paneAfter mark.tok').first; tok = first.get_attribute('data-token'); first.hover()
    hits = page.locator('#panelBA mark.tok.hit').count()
    check('hover highlights same token in both panes', hits >= 2, f'{tok} hits={hits}')
    check('correlation bar names the token', tok in page.text_content('#corr'))
    page.screenshot(path=OUT + '/02-hover.png')
    first.click(); check('click pins token', 'pinned' in page.text_content('#corr'))
    page.keyboard.press('Escape'); check('escape unpins', 'pinned' not in page.text_content('#corr'))
    # report tab
    page.click('#tabReport'); rows = page.locator('#replBody tr').count(); check('report rows rendered', rows > 20, rows)
    check('bars rendered', page.locator('#bars .barrow').count() == 11, page.locator('#bars .barrow').count())
    check('originals blurred by default', 'reveal' not in (page.get_attribute('#replTable', 'class') or ''))
    page.click('#revealBtn'); check('reveal toggles', 'reveal' in page.get_attribute('#replTable', 'class'))
    page.screenshot(path=OUT + '/03-report.png')
    page.click('#tabOutput'); out = page.text_content('#outPre'); check('output contains tokens', '<HOST:' in out and '<IP:' in out)
    page.click('#tabBA')
    # aggressive
    view(page, 'configure'); toggle(page, '#aggressive'); page.wait_for_timeout(400); m2 = int(page.text_content('#stMatches').replace(',', '')); check('aggressive raises matches to 44', m2 == 44, m2)
    toggle(page, '#aggressive'); page.wait_for_timeout(400)
    # move a rule
    first_id = page.get_attribute('#ruleList .rule:nth-child(1)', 'data-id')
    second_id = page.get_attribute('#ruleList .rule:nth-child(2)', 'data-id')
    page.click('#ruleList .rule:nth-child(2) [data-act="up"]'); page.wait_for_timeout(300)
    check('move up reorders', page.get_attribute('#ruleList .rule:nth-child(1)', 'data-id') == second_id, page.get_attribute('#ruleList .rule:nth-child(1)', 'data-id'))
    check('cfg state modified', page.text_content('#cfgState') == 'modified')
    # Amended 2026-09-21 on JJ's order (ruling 14): the Reset order button left view; the moved rule goes back down.
    page.click('#ruleList .rule:nth-child(1) [data-act="down"]'); page.wait_for_timeout(300); check('reset order restores', page.get_attribute('#ruleList .rule:nth-child(1)', 'data-id') == first_id)
    # disable a rule
    page.click('#ruleList .rule[data-id="ips"] label.switch'); page.wait_for_timeout(400)
    check('disabling ips lowers matches', int(page.text_content('#stMatches').replace(',', '')) < 43, page.text_content('#stMatches'))
    page.click('#ruleList .rule[data-id="ips"] label.switch'); page.wait_for_timeout(400)
    # custom rule
    view(page, 'sanitize'); page.fill('#inputText', page.input_value('#inputText') + '\nSep 19 10:07:00 srv-app-01 desk[9]: opened CASE-123456 for alice@example.test, dup of CASE-123456')
    # Amended 2026-09-21 on JJ's order (ruling 14): the Add custom rule button left view and the editor is open on
    # load, so the invalid rule is tried first in the open editor, then the valid rule is entered over it and saved.
    view(page, 'configure'); page.fill('#rf-id', 'bad'); page.fill('#rf-patterns', '(a)(b)'); page.click('#rf-save'); page.wait_for_timeout(200)
    check('invalid rule shows library message', 'capturing group' in page.text_content('#rf-err'), page.text_content('#rf-err')[:80])
    page.fill('#rf-id', 'acme_ticket'); page.fill('#rf-label', 'Support ticket IDs'); page.fill('#rf-token', 'TICKET'); page.fill('#rf-patterns', r'\bCASE-\d{6}\b')
    page.click('#rf-test'); page.wait_for_timeout(200); check('rule test reports matches', '2 matches' in page.text_content('#rf-testOut'), page.text_content('#rf-testOut'))
    page.click('#rf-save'); page.wait_for_timeout(500)
    check('custom rule row added', page.locator('#ruleList .rule[data-id="acme_ticket"]').count() == 1)
    check('custom rule fires in output', '<TICKET:' in page.text_content('#paneAfter'))
    # never redact allowlist
    page.click('summary:has-text("Never redact")'); page.fill('#neverValues', '10.20.4.15'); page.wait_for_timeout(500)
    check('never-redact keeps the value', '10.20.4.15' in page.text_content('#paneAfter'))
    page.fill('#neverValues', ''); page.wait_for_timeout(400)
    # always redact
    page.click('summary:has-text("Always redact")'); page.fill('#alwaysValues', 'ledger'); page.wait_for_timeout(500)
    check('always-redact reports under custom', '<CUSTOM:' in page.text_content('#paneAfter'))
    page.fill('#alwaysValues', ''); page.wait_for_timeout(400)
    # CI modes
    page.click('summary:has-text("Run mode")'); toggle(page, '#failOnMatch'); page.wait_for_timeout(400)
    check('fail-on-match badge', 'exit code 1' in page.text_content('#ciBadge'))
    toggle(page, '#dryRun'); page.wait_for_timeout(400); check('report-only disables output tab', page.is_disabled('#tabOutput'))
    toggle(page, '#dryRun'); toggle(page, '#failOnMatch'); page.wait_for_timeout(300)
    # key rotate
    before_tok = page.locator('#paneAfter mark.tok').first.get_attribute('data-token'); page.click('#keyGen'); page.wait_for_timeout(400)
    check('rotating the key changes tokens', page.locator('#paneAfter mark.tok').first.get_attribute('data-token') != before_tok)
    page.fill('#keyInput', 'zzz'); page.wait_for_timeout(400); check('bad hex key shows key error', 'hex' in page.text_content('#keyErr'), page.text_content('#keyErr')[:60])
    page.click('#keyGen'); page.wait_for_timeout(300)
    # integrations
    view(page, 'integrate'); codes = {}
    for k in ['install', 'cli', 'node', 'browser', 'actions', 'precommit', 'pipeline']:
        page.click(f'#integrateCard [data-int="{k}"]'); codes[k] = page.text_content('#intCode')
    check('all integration snippets non-empty', all(len(v) > 80 for v in codes.values()), {k: len(v) for k, v in codes.items()})
    check('cli reflects custom rule file', '--rules-file ./custom-rules.json' in codes['cli'])
    check('node snippet defines the custom rule', 'const acme_ticket = defineRule(' in codes['node'] and 'sanitizeFile({ input' in codes['node'])
    check('actions recipe uses fail-on-match', '--fail-on-match' in codes['actions'] and '--dry-run' in codes['actions'])
    # export config then reset then import
    view(page, 'sanitize')
    with page.expect_download() as dl: page.click('#exportBtn'); page.click('[data-export="config"]')
    path = dl.value.path(); cfg = json.load(open(path)); check('config export has marker and custom rule', cfg.get('logtotalSanitizerUi') == 1 and any(r['id'] == 'acme_ticket' for r in cfg['customRules']))
    with page.expect_download() as dl2: page.click('#exportBtn'); page.click('[data-export="rules"]')
    rules = json.load(open(dl2.value.path())); check('rules-file export is an array of rules', isinstance(rules, list) and any(r['id'] == 'acme_ticket' for r in rules) and len(rules) == seeded + 1, len(rules))
    view(page, 'configure'); page.click('#resetAll'); page.wait_for_timeout(400); check('reset returns to the seeded default', page.locator('#ruleList .rule').count() == seeded + builtin)
    # The badge has to be able to say defaults again, or a reader cannot tell when the
    # page is clean. It previously stuck on modified forever because the comparison
    # included a freshly stamped timestamp on one side only.
    check('reset restores the defaults badge', page.text_content('#cfgState') == 'defaults', page.text_content('#cfgState'))
    view(page, 'sanitize'); page.set_input_files('#importFile', {'name': 'sanitizer-config.json', 'mimeType': 'application/json', 'buffer': open(path, 'rb').read()}); page.wait_for_timeout(600)
    check('import restores custom rule', page.locator('#ruleList .rule[data-id="acme_ticket"]').count() == 1 and '<TICKET:' in page.text_content('#paneAfter'))
    # file streaming: small and large
    small = os.path.join(HERE, 'small.log'); open(small, 'w').write('\n'.join(f'Sep 19 10:{i%60:02d}:00 srv-app-01 sshd[1]: login user{i%7}@example.test from 10.0.{i%9}.{i%250}' for i in range(5000)))
    page.set_input_files('#openFile', small); page.wait_for_selector('#srcFile:not([hidden])'); page.wait_for_timeout(1500)
    check('small file streams and reports lines', page.text_content('#stLines').replace(',', '') == '5000', page.text_content('#stLines'))
    big = os.path.join(HERE, 'big.log'); open(big, 'w').write(('Sep 19 10:00:00 srv-app-01 sshd[1]: login alice@example.test from 10.0.0.15 port 51522 token=eyJhbGciOiJIUzI1NiJ9.eyJzdWIiOiJhbGljZSJ9.abcdefghijklmnopqrstuvwx\n') * 60000)
    page.set_input_files('#openFile', big); page.wait_for_timeout(500)
    page.click('#runBtn'); page.wait_for_function("document.querySelector('#stLines').textContent.replace(/,/g,'') === '60000'", timeout=60000)
    check('large file (>4MB) runs on demand and completes', True, page.text_content('#runMeta'))
    page.screenshot(path=OUT + '/04-file.png')
    page.click('#srcRemove'); page.wait_for_timeout(300)
    # theme + mobile
    page.click('#themeBtn'); page.wait_for_timeout(300); check('theme toggles to light', page.get_attribute('html', 'data-theme') == 'light')
    page.click('#loadSample'); page.wait_for_timeout(500); page.screenshot(path=OUT + '/05-light-desktop.png')
    page.click('#tabReport'); page.screenshot(path=OUT + '/06-light-report.png'); page.click('#tabBA')
    page.set_viewport_size({'width': 390, 'height': 844}); page.wait_for_timeout(300)
    check('no horizontal overflow on phone', page.evaluate('document.documentElement.scrollWidth <= 390 + 1'), page.evaluate('document.documentElement.scrollWidth'))
    page.screenshot(path=OUT + '/07-phone-sanitize.png')
    page.click('.viewtabs [data-view="configure"]'); page.wait_for_timeout(200); page.screenshot(path=OUT + '/08-phone-configure.png')
    page.click('.viewtabs [data-view="integrate"]'); page.wait_for_timeout(200); page.screenshot(path=OUT + '/09-phone-integrate.png')
    # A configuration saved by an older build used to win over the shipped rules, so a
    # rename or a mode change stayed invisible until the reader found Reset all. Write a
    # stale configuration, reload, and require the shipped seeded rules to come back.
    view(page, 'configure')
    page.evaluate("""() => {
      const raw = localStorage.getItem('logtotal-sanitizer-ui.v1');
      const c = raw ? JSON.parse(raw) : {logtotalSanitizerUi: 1};
      delete c.seedVersion;
      c.customRules = [{id: 'crypto_bitcoin', label: 'Ghost from an older build', description: 'x',
                        mode: 'pseudo', token: 'GHOST', patterns: ['\\bGHOSTVALUE\\b']}];
      c.rules = [{id: 'crypto_bitcoin', enabled: true, kind: 'custom'}].concat((c.rules || []).filter(r => r.kind === 'builtin'));
      localStorage.setItem('logtotal-sanitizer-ui.v1', JSON.stringify(c));
    }""")
    page.reload(); page.wait_for_selector('#stats:not([hidden])', timeout=10000)
    view(page, 'configure'); page.wait_for_timeout(400)
    healed = page.evaluate("[...document.querySelectorAll('#ruleList .rule')].map(e => e.dataset.id)")
    check('a stale saved configuration is refreshed to the shipped rules',
          'crypto_bitcoin' not in healed and all(i in healed for i in page.evaluate('window.LogTotalSanitizerUi.seededIds()')),
          healed[:4])
    check('no console errors during the whole run', not errors, errors[:5])
    b.close()
fails = [r for r in results if not r[1]]
print(f'\n{len(results) - len(fails)} of {len(results)} checks passed')
sys.exit(1 if fails else 0)
