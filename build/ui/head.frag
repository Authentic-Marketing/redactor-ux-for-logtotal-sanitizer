<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="artifact-class" content="deliverable">
<meta name="color-scheme" content="dark light">
<meta name="description" content="Redact secrets, identifiers and PII from logs in your browser tab. Built by Authentic Marketing on SOC Prime's open-source LogTotal Sanitizer library. Nothing leaves the page.">
<title>Redactor UX for LogTotal Sanitizer, by Authentic Marketing</title>
<link rel="icon" type="image/png" href="__FAVICON__">
<!--
  Self-contained page. It bundles the published npm package @socprime/logtotal-sanitizer
  0.2.0-beta.2 (Apache-2.0, published 2026-09-21) as an IIFE global so every control on
  the page drives the real library. The page loads no external resource. It makes no
  network request until you ask for one: the npm update check you click, the opt-in
  check when the page opens (off unless you switch it on under Engine, then at most one
  request a day to raw.githubusercontent.com for a version number), and, in Local engine
  mode, the loopback calls to your own bridge. Your log text and your key are never part
  of any of them. The count shown in the header is measured from the Performance API and
  counts external requests only.
  Visual tokens: orchestrator/context/clients/soc-prime/brand/DESIGN.md (2026-08-07).
-->
<style>
:root{
  --font-sans: Inter, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, ui-sans-serif, system-ui, 'Helvetica Neue', Arial, sans-serif;
  --font-mono: 'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Courier New', monospace;
  --navy:#1E3A5F; --teal:#0D9488; --white:#FFFFFF; --slate:#64748B;
  --bg:#0E1B2A; --surface:#142434; --surface-2:#1B2A3A; --hairline:#24384C; --line:#5A7488;
  --fg:#E6EDF4; --mut:#9FB0C2; --accent:#2DD4BF; --accent-text:#5EEAD4; --tint:#10312E;
  --btn-fill:#2DD4BF; --btn-label:#0E1B2A; --chip:#1B2A3A; --code-bg:#0B1620;
  --shadow:0 10px 30px rgba(0,0,0,.50);
  --r-sm:3px; --r-md:6px; --dur:160ms;
  --topbar-h:60px;
  color-scheme: dark;
}
:root[data-theme="light"]{
  --bg:#FFFFFF; --surface:#F2F5F8; --surface-2:#E8EDF3; --hairline:#DDE3EA; --line:#64748B;
  --fg:#1E3A5F; --mut:#4C5A70; --accent:#0D9488; --accent-text:#0A6E66; --tint:#E6F4F2;
  --btn-fill:#1E3A5F; --btn-label:#FFFFFF; --chip:#EEF1F5; --code-bg:#E8EDF3;
  --shadow:0 10px 30px rgba(14,27,42,.16);
  color-scheme: light;
}
*,*::before,*::after{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--bg);color:var(--fg);font:400 1rem/1.6 var(--font-sans);min-height:100vh}
h1,h2,h3{margin:0;line-height:1.25;font-weight:700;letter-spacing:-0.01em}
h2{font-size:1.35rem}
h3{font-size:1.05rem;font-weight:600;line-height:1.3}
p{margin:0}
a{color:var(--accent-text)}
code,pre,kbd,.mono{font-family:var(--font-mono);font-size:.85rem}
pre{margin:0;white-space:pre-wrap;word-break:break-word;line-height:1.55}
button,input,select,textarea{font:inherit;color:inherit}
button{cursor:pointer}
[hidden]{display:none !important}
.sr{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0 0 0 0);white-space:nowrap}
:focus-visible{outline:2px solid var(--accent);outline-offset:2px}
.small{font-size:.85rem;line-height:1.4}
.micro{font-size:.72rem;font-weight:600;line-height:1.3;letter-spacing:.02em;text-transform:uppercase;color:var(--mut)}
.mut{color:var(--mut)}

/* Controls */
.btn{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:44px;padding:0 16px;border:1px solid var(--line);border-radius:var(--r-md);background:var(--surface);color:var(--fg);font-weight:600;font-size:.85rem;white-space:nowrap;transition:background-color var(--dur) ease,border-color var(--dur) ease,box-shadow var(--dur) ease;}
.btn:hover{background:var(--surface-2);border-color:var(--accent)}
.btn.primary{background:var(--btn-fill);color:var(--btn-label);border-color:var(--btn-fill)}
.btn.primary:hover{box-shadow:inset 0 0 0 100px rgba(0,0,0,.08)}
.btn.ghost{background:transparent}
.btn.sm{min-height:44px;padding:0 12px}
.btn.icon{width:44px;padding:0;font-family:var(--font-mono)}
.btn[disabled]{opacity:.5;cursor:not-allowed}
.btn[aria-pressed="true"]{border-color:var(--accent);box-shadow:inset 0 -2px 0 var(--accent)}
.file-btn{position:relative;overflow:hidden}
.cover{position:absolute;inset:-1px;width:auto;height:auto;opacity:0;margin:0;cursor:pointer}
.field{display:flex;flex-direction:column;gap:6px}
.field>label,.field>.lbl{font-size:.85rem;font-weight:600}
.input,textarea,select{width:100%;min-height:44px;padding:8px 12px;border:1px solid var(--line);border-radius:var(--r-md);background:var(--bg);color:var(--fg);transition:border-color var(--dur) ease,box-shadow var(--dur) ease;}
.input:focus,textarea:focus,select:focus{outline:none;border-color:var(--accent);box-shadow:0 0 0 2px var(--accent)}
textarea{resize:vertical;font-family:var(--font-mono);font-size:.85rem;line-height:1.55;min-height:96px}
select{appearance:none;background-image:linear-gradient(45deg,transparent 50%,var(--mut) 50%),linear-gradient(135deg,var(--mut) 50%,transparent 50%);background-position:calc(100% - 18px) 50%,calc(100% - 13px) 50%;background-size:5px 5px;background-repeat:no-repeat;padding-right:36px}
.row{display:flex;gap:8px;align-items:center;flex-wrap:wrap}
.row.between{justify-content:space-between}
.grow{flex:1 1 auto;min-width:0}
.chip{display:inline-flex;align-items:center;min-height:22px;padding:0 8px;border:1px solid var(--hairline);border-radius:var(--r-sm);background:var(--chip);font-size:.72rem;font-weight:600;line-height:1.3;color:var(--fg);white-space:nowrap}
.chip.mono{font-family:var(--font-mono);font-weight:500}
.chip.dashed{border-style:dashed}
.count{display:inline-flex;align-items:center;justify-content:center;min-width:24px;height:24px;padding:0 8px;border-radius:999px;background:var(--tint);color:var(--accent-text);font-size:.72rem;font-weight:700}
.switch{position:relative;display:inline-flex;align-items:center;gap:8px;min-height:44px;cursor:pointer}
.switch input{position:absolute;inset:0;width:100%;height:100%;opacity:0;margin:0;cursor:pointer}
.switch .sw{position:relative;width:38px;height:22px;flex:0 0 auto;border-radius:999px;border:1px solid var(--line);background:var(--surface-2);transition:background-color var(--dur) ease,border-color var(--dur) ease;}
.switch .sw::after{content:"";position:absolute;top:3px;left:3px;width:14px;height:14px;border-radius:999px;background:var(--mut);transition:background-color var(--dur) ease;}
.switch input:checked+.sw{background:var(--tint);border-color:var(--accent)}
.switch input:checked+.sw::after{left:auto;right:3px;background:var(--accent);box-shadow:0 0 0 1px var(--bg)}
.switch input:focus-visible+.sw{outline:2px solid var(--accent);outline-offset:2px}
.note{padding:8px 12px;border:1px dashed var(--line);border-radius:var(--r-md);background:var(--surface-2);font-size:.85rem;line-height:1.45}
.note.solid{border-style:solid}
.note strong{font-weight:700}
.err{display:none;padding:8px 12px;border:1px solid var(--line);border-left:4px solid var(--fg);border-radius:var(--r-md);background:var(--surface-2);font-size:.85rem;line-height:1.45}
.err.show{display:block}
.err b{font-weight:700}
.hr{height:1px;background:var(--hairline);border:0;margin:0}

/* Top bar. Chrome stays small and quiet: with the badge hidden under JJ's ruling the
   theme switch's knob is the only teal the bar carries, and only in the light theme.
   The bottom rule is an inset shadow rather than a border so the 44 px control row plus
   8 px of padding lands the bar on exactly var(--topbar-h), which is what positions the
   destination rail. A border-bottom pushed the box to 61 px and overlapped that rail. */
.topbar{position:sticky;top:0;z-index:20;display:flex;flex-wrap:wrap;align-items:center;gap:8px 16px;min-height:var(--topbar-h);padding:8px 20px;background:var(--surface);box-shadow:inset 0 -1px 0 var(--hairline);--ico-moon:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='M12 3a6 6 0 0 0 9 9 9 9 0 1 1-9-9Z'/%3E%3C/svg%3E");--ico-sun:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='2.25' stroke-linecap='round' stroke-linejoin='round'%3E%3Ccircle cx='12' cy='12' r='4'/%3E%3Cpath d='M12 2v2'/%3E%3Cpath d='M12 20v2'/%3E%3Cpath d='m4.93 4.93 1.41 1.41'/%3E%3Cpath d='m17.66 17.66 1.41 1.41'/%3E%3Cpath d='M2 12h2'/%3E%3Cpath d='M20 12h2'/%3E%3Cpath d='m6.34 17.66-1.41 1.41'/%3E%3Cpath d='m19.07 4.93-1.41 1.41'/%3E%3C/svg%3E")}
.brand{display:flex;align-items:center;gap:12px;min-width:0}
.wordmark{display:inline-flex;align-items:center;color:var(--fg);min-height:44px}
.wordmark:focus-visible{outline:2px solid var(--accent);outline-offset:2px;border-radius:var(--r-sm)}
.logo-svg{height:22px;width:auto;display:block}
a.btn{text-decoration:none}
/* The divider carries the lockup, so it takes the control line rather than the table
   hairline: --hairline at 1 px on the bar's own --surface step is invisible. */
.brand-sep{width:1px;height:20px;background:var(--line)}
.title{font-size:1.05rem;font-weight:600;letter-spacing:-0.01em;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;min-width:0}
/* Measured on the 1440 capture: under flex centring the mono label's baseline sits 2 px
   above the title's, so it is nudged onto that baseline. Transform only, so nothing in
   the row moves and no layout property is touched. */
.pkg{padding:0;border:0;border-radius:0;background:transparent;color:var(--mut);font-size:.72rem;white-space:nowrap;transform:translateY(2px)}
.topbar-right{margin-left:auto;display:flex;align-items:center;gap:2px;flex-wrap:nowrap}
.local{display:inline-flex;align-items:center;gap:8px;min-height:34px;padding:0 10px;border:1px solid var(--hairline);border-radius:var(--r-md);font-size:.85rem;font-weight:500;color:var(--mut);white-space:nowrap}
.local strong{color:var(--fg);font-weight:600}
.local .dot{width:8px;height:8px;border-radius:999px;background:var(--accent);flex:0 0 auto}
/* The right controls: borderless, transparent, 0.85rem label, 16 px leading glyph. */
.topbar-right .btn.tb{gap:8px;min-height:44px;padding:0 10px;border:0;border-radius:var(--r-sm);background:transparent;color:var(--fg);font-weight:500;font-size:.85rem}
.topbar-right .btn.tb:hover{background:var(--surface-2)}
.topbar-right .btn.tb .ico{width:16px;height:16px;flex:0 0 auto;color:var(--mut)}
/* JJ ruling, wave 1: the theme control is a switch, not a labelled button. applyTheme
   rewrites this button's innerHTML and aria-label on every change and is not ours, so the
   track, the knob and the sun-and-moon glyph are built here from the button's own pseudo
   elements, and its text is hidden by type size alone, never removed from the DOM. The
   track is the shared switch's geometry and tokens and it takes that switch's own grammar:
   quiet --surface-2 track with a --line border and a --mut knob in the dark theme, --tint
   track with an --accent border and an --accent knob in the light one, so the bar's one
   control reads as one more of the page's switches. The knob is a background layer on the
   track rather than a third box, because two pseudo elements is all a button has. Track
   flush with the button's right edge puts it on the bar's own 20 px inset, mirroring the
   wordmark, while the 44 px hit area stays the button's box. */
#themeBtn{position:relative;width:44px;min-height:44px;padding:0;border:0;background:transparent;font-size:0;line-height:0;color:transparent;--track:var(--surface-2);--track-line:var(--line);--knob:var(--mut);--knob-x:12px}
:root[data-theme="light"] #themeBtn{--track:var(--tint);--track-line:var(--accent);--knob:var(--accent);--knob-x:30px}
#themeBtn::before{content:"";position:absolute;right:0;top:9px;width:44px;height:26px;border:1px solid var(--track-line);border-radius:999px;background:radial-gradient(circle 9px at var(--knob-x) 12px,var(--knob) 99%,transparent 100%),var(--track);transition:background-color var(--dur) ease,border-color var(--dur) ease,box-shadow var(--dur) ease}
#themeBtn:hover::before{border-color:var(--accent);box-shadow:0 0 0 1px var(--accent)}
#themeBtn:focus-visible{outline:none}
#themeBtn:focus-visible::before{outline:2px solid var(--accent);outline-offset:2px}
#themeBtn::after{content:"";position:absolute;left:7px;top:16px;width:12px;height:12px;background-color:var(--bg);-webkit-mask:var(--ico-moon) center/12px 12px no-repeat;mask:var(--ico-moon) center/12px 12px no-repeat;transition:background-color var(--dur) ease}
:root[data-theme="light"] #themeBtn::after{transform:translateX(18px);-webkit-mask-image:var(--ico-sun);mask-image:var(--ico-sun)}
.viewtabs{display:none;position:sticky;top:var(--topbar-h);z-index:15;border-bottom:1px solid var(--hairline);background:var(--surface)}
.viewtabs button{flex:1;min-height:48px;padding:0 8px;border:0;background:transparent;font-weight:600;font-size:.85rem;color:var(--mut);border-bottom:2px solid transparent}
.viewtabs button[aria-pressed="true"]{color:var(--fg);border-bottom-color:var(--accent)}
/* Below 1080 the three destinations stay the tab strip above, unchanged. The rail and
   its glyphs exist only above 1080. */
.viewtabs button svg{display:none}
@media (min-width:1081px){
  .viewtabs{display:flex;flex-direction:column;align-items:stretch;position:fixed;left:0;top:var(--topbar-h);bottom:0;width:176px;padding:12px 0;overflow:auto;border-bottom:0;border-right:1px solid var(--hairline)}
  .viewtabs button{display:flex;flex:0 0 auto;align-items:center;gap:10px;min-height:44px;padding:0 12px;border:0;border-left:2px solid transparent;font-size:.85rem;font-weight:400;color:var(--fg);text-align:left}
  .viewtabs button svg{display:block;width:16px;height:16px;flex:0 0 auto;color:var(--mut)}
  .viewtabs button:hover{background:var(--surface-2)}
  .viewtabs button[aria-pressed="true"]{background:var(--surface-2);border-left-color:var(--accent);font-weight:600;color:var(--fg)}
  .viewtabs button[aria-pressed="true"] svg{color:var(--accent)}
}

/* Workspace */
.workspace{display:grid;grid-template-columns:340px minmax(0,1fr);align-items:start}
/* One destination at a time, at every width. These are the show and hide rules that used
   to sit in the phone block below; the layout half of that block stays where it is. */
body[data-view="sanitize"] .rail,body[data-view="integrate"] .rail{display:none}
body[data-view="configure"] .main,body[data-view="integrate"] .main>.card:not(.integrate){display:none}
body[data-view="sanitize"] .main>.card.integrate{display:none}
@media (min-width:1081px){
  /* The rail is fixed, so the work column and the footer carry its width as an inset. The
     destination line that used to sit above the workspace is gone, so both start directly
     under the top bar and nothing else moves. */
  .workspace,.foot{margin-left:176px}
  .workspace{grid-template-columns:minmax(0,1fr)}
  body[data-view="configure"] .workspace{grid-template-columns:minmax(0,720px)}
}
/* Settings panel. Configure now fills the workspace at a capped width, so this is a panel
   rather than a 340 px column beside the cards: sticky positioning, the max-height and the
   inner scroller are gone and it scrolls with the page, and the single right border that cut
   the surface off mid page becomes a hairline enclosure. Groups keep their own hairlines and
   run full bleed, so the panel itself carries no padding: rows pad 12 px each. The 1 px
   negative margins pull each border onto the hairline its neighbour already draws, the
   destination rail on the left, the destination line above, the footer below, so the
   enclosure reads as one hairline everywhere instead of a doubled 2 px line. */
.rail{background:var(--surface);border:1px solid var(--hairline);margin:-1px 0 -1px -1px;min-height:calc(100vh - var(--topbar-h));--ico-chev:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' fill='none' stroke='black' stroke-width='1.75' stroke-linecap='round' stroke-linejoin='round'%3E%3Cpath d='m9 18 6-6-6-6'/%3E%3C/svg%3E")}
/* The rail item names this section, so the panel does not repeat it: the heading stays in the
   DOM under .sr as the accessible name and takes no layout, and the head shrinks to the one
   thing still visible in it. The state word is right aligned above the first group, so it
   reads as the panel's own state rather than a label for the group beneath it, and no empty
   band is left where the heading used to sit. The head is one 44 px row on the panel's 12 px
   inset, the same row the collapsed Engine header beneath it takes, so the state word sits on
   the panel's row rhythm instead of in a 29 px band above it (wave 2 smoothing). */
.reset-row{flex-direction:row;align-items:center;justify-content:space-between}
.reset-row #cfgState{font-size:.72rem;line-height:1.3}
.sec{border-top:1px solid var(--hairline)}
.sec>summary{display:flex;align-items:center;gap:10px;min-height:44px;padding:0 12px;cursor:pointer;list-style:none;font-size:.72rem;font-weight:600;line-height:1.3;letter-spacing:.02em;text-transform:uppercase;color:var(--mut);user-select:none}
.sec>summary::-webkit-details-marker{display:none}
/* Lucide chevron-right as a 16 px mask, so one CSS rule gives every group the same glyph
   without reaching into another piece's markup. Open rotates it a quarter turn. */
.sec>summary::before{content:"";width:16px;height:16px;flex:0 0 auto;background-color:currentColor;-webkit-mask:var(--ico-chev) center/16px 16px no-repeat;mask:var(--ico-chev) center/16px 16px no-repeat;transition:transform var(--dur) ease}
.sec[open]>summary::before{transform:rotate(90deg)}
.sec>summary:hover{color:var(--fg)}
.sec>summary .count{margin-left:auto}
/* Engine loads collapsed, so its header carries the engine the page is actually running. The
   value is read from the radio the page's JS keeps checked, never written by us. Both labels
   sit in the summary and only the matching one renders, so the accessible name carries it too.
   Quiet mono at 0.72rem, not caps: it reads as a value beside the group name, not a heading. */
.sec>summary .secval{display:none;font-family:var(--font-mono);font-size:.72rem;font-weight:400;line-height:1.3;letter-spacing:0;text-transform:none;color:var(--mut)}
.sec:has(input[name="engine"][value="bundled"]:checked)>summary .secval[data-engine="bundled"],
.sec:has(input[name="engine"][value="local"]:checked)>summary .secval[data-engine="local"]{display:inline}
.sec-body{display:flex;flex-direction:column;gap:10px;padding:2px 12px 12px}
/* Every text field and picker in the panel sits at the 0.85rem control size, the size the
   mono fields, the field labels and the Input card's picker already use. */
.rail .input,.rail select{font-size:.85rem}
/* Three widths that only went wrong once the rail became a 720 px panel: a button and a
   number field sized by what they hold, and a text field that keeps its own button beside
   it instead of wrapping one 44 px box onto a line of its own. */
.sec-body>.btn{align-self:flex-start}
.sec-body input[type="number"]{max-width:220px}
.sec-body .row:has(>.input.grow){flex-wrap:nowrap}
/* The engine's own settings belong to the choice above them, so they line up with its label. */
#bundledPanel,#localPanel{display:flex;flex-direction:column;gap:10px;padding-left:26px}
/* The work column and the two cards. The column pays 16 px once and the gap between the
   cards comes down with it, so the page carries one spacing step instead of two.
   The head gives up its --surface-2 fill: the toolbar row sits on the card's own ground
   and a single hairline is what separates it from the body, which turns a tinted header
   band into the quiet toolbar row the direction asks for. */
.main{display:flex;flex-direction:column;gap:16px;padding:16px;min-width:0}
.card{border:1px solid var(--hairline);border-radius:var(--r-md);background:var(--surface);overflow:hidden}
.card-head{display:flex;align-items:center;gap:12px;flex-wrap:wrap;padding:8px 16px;border-bottom:1px solid var(--hairline);background:transparent}
.card-head h2{font-size:1.05rem;font-weight:600}
.card-body{padding:16px;display:flex;flex-direction:column;gap:12px}
/* One quiet line under the head rather than a lead paragraph, and the 74ch measure is
   gone so the sentence holds a single line at the desktop width. */
.lede{font-size:.85rem;line-height:1.45;color:var(--mut)}
/* Input toolbar, one row. The picker carried width:100% from the shared control rule,
   which is what folded this row onto three lines; a flex basis replaces it and still lets
   the control shrink rather than push the row wide. The picker is the row's only bordered
   element, so the five actions go quiet with a hover fill instead of reading as six
   identical boxes, each keeping its 44 px target and its visible label. */
#inputCard .card-head>.row{gap:2px}
#inputCard .card-head select{flex:0 1 320px;width:320px;min-width:0;background-color:var(--bg);font-size:.85rem}
#inputCard .card-head .btn{min-height:44px;padding:0 10px;border:0;border-radius:var(--r-sm);background:transparent;color:var(--fg);font-weight:500;font-size:.85rem}
#inputCard .card-head .btn:hover{background:var(--surface-2)}
/* Load sample is the picker's companion rather than a sixth equal action. Its JS lives
   outside every region so it cannot be folded into the picker's change event; what can be
   done here is subordinate it: the picker's own 44 px height, no gap at all against the
   picker, a muted label that lifts to full weight only on hover, and 16 px of air after it
   that tells the eye where the pair ends and the file actions begin. */
#inputCard .card-head #loadSample{margin:0 20px 0 -2px;padding:0 8px;color:var(--mut)}
#inputCard .card-head #loadSample:hover{color:var(--fg)}
#inputCard .card-head #loadSample .ico{color:inherit}
/* Clear empties the box, so it sits apart from the three controls that fill it: a 1 px rule
   with 12 px on either side, at the far right of the row. The rule takes --line rather than
   --hairline for the reason the top bar's lockup divider already does, that --hairline on a
   --surface ground is invisible and a separation nobody can see is not a separation. It earns
   its place only on the single row, so it is absent wherever the row wraps. */
#inputCard .card-head .tsep{display:none;flex:0 0 auto;width:1px;height:20px;margin:0 12px;background:var(--line)}
/* The quiet buttons carry 10 px of invisible padding, so at rest their labels ended 10 px short
   of the card's 16 px axis that the Sanitize button, the paste box and the pane count all sit
   on. The last button in each head gives that padding back as a negative margin: the label
   lands on the axis and the 44 px target and hover fill keep their size (wave 2 smoothing). */
#inputCard .card-head #clearInput{margin-right:-10px}
/* Above the rail's own breakpoint the row is wide enough to hold every control on one
   line, so wrapping is switched off there and left on below it, where the phone needs it. */
@media (min-width:1081px){
  #inputCard .card-head,#inputCard .card-head>.row{flex-wrap:nowrap}
  #inputCard .card-head .tsep{display:block}
}
/* Import and Export moved here from the top bar on JJ's order, 2026-09-21; the popover follows its button */
.menu{position:relative}
.popover{position:absolute;right:0;top:calc(100% + 8px);z-index:30;min-width:280px;padding:8px;border:1px solid var(--line);border-radius:var(--r-md);background:var(--surface);box-shadow:var(--shadow)}
.popover button{display:flex;width:100%;align-items:center;justify-content:space-between;gap:12px;min-height:44px;padding:0 12px;border:0;border-radius:var(--r-sm);background:transparent;text-align:left;font-size:.85rem;font-weight:500;transition:background-color var(--dur) ease;}
.popover button:hover{background:var(--surface-2)}
.popover button span.k{color:var(--mut);font-size:.72rem;font-family:var(--font-mono)}
.popover .grp{padding:8px 12px 4px;font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.02em;color:var(--mut)}
.card-head .btn .ico{width:16px;height:16px;flex:0 0 auto;color:var(--mut)}
/* Copy output moved into the Result head on JJ's order (ruling 12); hidden until a result
   exists. It is the head's one action, so it drops its border for the same quiet grammar the
   input toolbar uses: glyph plus label at 0.85rem, 44 px target, a hover fill and nothing at
   rest, sitting beside the character count rather than answering the Result title. */
#resultsCard .card-head #copyOut{min-height:44px;padding:0 10px;margin-right:-10px;border:0;border-radius:var(--r-sm);background:transparent;color:var(--fg);font-weight:500;font-size:.85rem}
#resultsCard .card-head #copyOut:hover{background:var(--surface-2)}
#resultsCard:has(#stats[hidden]) #copyOut{display:none}

/* Rules list. Eleven flush rows on the panel ground, no card one level down. The group's
   own body padding is cancelled from inside this region so every hairline runs to both
   panel edges; the two buttons and the editor pay the 12 px back themselves.
   Two columns read in priority order down the first then down the second, which is what
   CSS multicol already does, so the count balances itself when a custom rule is added and
   the column rule is one real hairline rather than a border pair. The 356 px ideal column
   width is the fallback too, and it is measured rather than picked: it is the narrowest
   column in which the name still clears the widest single rule word beside the widest kind
   label. Below two of those the list is one column, which at 390 is every time, so ruling 7
   holds at both widths with no media query of its own. */
.sec:has(#ruleList)>.sec-body{padding:0;gap:0}
/* JJ ruling 14 took the Add custom rule and Reset order row out of view, so the styling those
   two buttons carried is gone with them and the editor is what follows the last row: the one
   bordered container this group is allowed, sitting on the 12 px the cancelled body padding
   owes it, directly under the columns. */
.sec:has(#ruleList)>.sec-body>.editor-wrap{margin:0 12px 12px;border-color:var(--hairline)}
.rules{list-style:none;margin:0;padding:0;display:block;columns:356px 2;column-gap:1px;column-rule:1px solid var(--hairline);border-top:1px solid var(--hairline)}
.rule{break-inside:avoid;background:var(--bg);box-shadow:inset 0 -1px 0 var(--hairline);transition:background-color var(--dur) ease}
.rule.off{background:var(--surface)}
.rule.drag-over{box-shadow:inset 0 2px 0 var(--accent),inset 0 -1px 0 var(--hairline)}
.rule.dragging{opacity:.5}
/* One axis, 44 px from the switch and the glyph targets alone: the row pays no vertical
   padding at all, which is what keeps it off the reference card's height. Every control on
   the row now carries one treatment: the same 16 px Lucide stroke (grip-vertical, the two
   chevrons, info), --mut at rest, --fg over a --surface-2 fill on hover, and a target that
   runs the full 44 px height of the row. The gaps are 4 px and the lead 2 px because that
   is the width the bounded kind slot costs; at 6 px the longest name loses a third line to
   the wrap and the row leaves its 44 px. */
.rule-row{display:grid;grid-template-columns:16px minmax(0,1fr) auto;align-items:center;gap:4px;min-height:44px;padding:0 0 0 2px}
.grip{display:flex;align-items:center;justify-content:center;width:100%;height:44px;cursor:grab;color:var(--mut);touch-action:none;transition:background-color var(--dur) ease,color var(--dur) ease}
.grip:hover{color:var(--fg);background:var(--surface-2)}
.grip .ico{width:16px;height:16px;flex:0 0 auto;pointer-events:none}
.rule .switch{min-width:0;gap:4px}
/* JJ ruling 7: no name breaks inside a word. overflow-wrap:anywhere is gone and the column
   carries a floor wide enough for the widest single word among the eleven names, so a name
   wraps between its words or not at all. */
.rule-name{font-size:.85rem;font-weight:600;min-width:6.6rem;line-height:1.25}
.rule.off .rule-name{color:var(--mut)}
.rule-meta{display:flex;align-items:center;gap:4px}
/* The kind is a metadata slot, not a loose glyph beside the name. A bounded hairline label
   in the page's mono caps size, no fill and no icon, shrink to fit over a floor, so the
   eleven labels right align into one column against the actions and read as a slot rather
   than as clipped debris. The words are the label: mask for a mask-mode rule, the token
   prefix the output actually carries for a pseudo-mode one. */
.rule-kind{display:inline-block;flex:0 0 auto;box-sizing:border-box;min-width:2.6rem;max-width:6rem;height:20px;padding:0 5px;border:1px solid var(--hairline);border-radius:var(--r-sm);background:transparent;font-family:var(--font-mono);font-size:.72rem;line-height:18px;text-align:center;color:var(--mut);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.rule-acts{display:flex;align-items:center}
.rule-acts .btn{width:44px;min-height:44px;padding:0;border:0;border-radius:0;background:transparent;color:var(--mut)}
.rule-acts .btn:hover{color:var(--fg);background:var(--surface-2)}
/* A half-opacity chevron is a second stroke weight in the same row, which is one of the
   four the row was read down for. The disabled end of the reorder pair keeps the stroke and
   drops to the quieter line colour instead. */
.rule-acts .btn[disabled]{opacity:1;color:var(--line)}
.rule-acts .btn[aria-expanded="true"]{color:var(--accent-text)}
.rule-acts .ico{width:16px;height:16px;flex:0 0 auto;pointer-events:none}
.rule-detail{padding:4px 12px 12px 22px;display:flex;flex-direction:column;gap:6px;font-size:.85rem;line-height:1.45;background:var(--surface);border-top:1px solid var(--hairline)}
.rule-detail .keys{font-family:var(--font-mono);font-size:.72rem;color:var(--mut);word-break:break-word}
.rule-detail .acts{display:flex;gap:6px;flex-wrap:wrap}

/* Engine */
/* Two quiet rows on the panel ground, not boxed cards. The row runs full bleed out of the
   group's 12 px padding, and the chosen engine carries a --surface-2 fill and the teal dot. */
.radio{position:relative;display:flex;align-items:center;gap:10px;min-height:44px;margin:0 -12px;padding:6px 12px;cursor:pointer;transition:background-color var(--dur) ease;}
.radio::before{content:"";flex:0 0 auto;width:16px;height:16px;border-radius:999px;border:1px solid var(--line);background:var(--bg);box-sizing:border-box}
.radio input{position:absolute;inset:0;width:auto;height:auto;opacity:0;margin:0;cursor:pointer}
.radio:hover{background:var(--surface-2)}
.radio:has(input:checked){background:var(--surface-2)}
.radio:has(input:checked)::before{border:5px solid var(--accent)}
.radio:has(input:focus-visible){outline:2px solid var(--accent);outline-offset:-2px}
.radio .small{line-height:1.35}
.status{padding:4px 0 4px 10px;border-left:2px solid var(--line);font-size:.85rem;line-height:1.4;transition:border-color var(--dur) ease;}
.status.solid{border-left-color:var(--accent)}
.setup{margin:0;padding-left:20px;display:flex;flex-direction:column;gap:10px;font-size:.85rem;line-height:1.4}
.setup .cmd{display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:2px}
.cmdrow{display:grid;grid-template-columns:56px minmax(0,1fr) auto;align-items:center;gap:8px}
.cmdrow .lbl{font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.02em;color:var(--mut)}
.cmdrow code{display:block;padding:8px 12px;border:1px solid var(--hairline);border-radius:var(--r-sm);background:var(--code-bg);font-size:.8rem;white-space:nowrap;overflow-x:auto}
.cmdrow .acts{display:flex;gap:4px}
.byhand{margin-top:2px}
.byhand>summary{cursor:pointer;list-style:none;display:flex;align-items:center;min-height:36px;font-size:.85rem;font-weight:600;color:var(--mut)}
.byhand>summary::-webkit-details-marker{display:none}
.byhand>summary::before{content:"";width:6px;height:6px;border-right:2px solid var(--mut);border-bottom:2px solid var(--mut);transform:rotate(-45deg);margin-right:8px}
.byhand[open]>summary::before{transform:rotate(45deg)}
.byhand .setup{margin-top:8px}
.setup code{padding:4px 8px;border:1px solid var(--hairline);border-radius:var(--r-sm);background:var(--code-bg);font-size:.8rem;word-break:break-all}

/* Editor */
.editor-wrap{border:1px solid var(--accent);border-radius:var(--r-md);background:var(--bg)}
.editor-wrap>summary{display:flex;align-items:center;gap:10px;min-height:44px;padding:0 12px;cursor:pointer;list-style:none;user-select:none}
.editor-wrap>summary::-webkit-details-marker{display:none}
.editor-wrap>summary::before{content:"";width:16px;height:16px;flex:0 0 auto;background-color:currentColor;-webkit-mask:var(--ico-chev) center/16px 16px no-repeat;mask:var(--ico-chev) center/16px 16px no-repeat;transition:transform var(--dur) ease}
.editor-wrap[open]>summary::before{transform:rotate(90deg)}
.editor-wrap>summary h3{font-size:.9rem;font-weight:600}
.editor{display:flex;flex-direction:column;gap:10px;padding:2px 12px 12px;border:0;border-radius:0;background:transparent}
#ruleEditor .field{gap:4px}
#ruleEditor .field>label{font-size:.75rem;line-height:1.3;font-weight:600;color:var(--fg)}
#ruleEditor .input,#ruleEditor select{min-height:36px;padding:6px 10px;font-size:.85rem}
#ruleEditor .two>.field{min-width:0}
#rf-mode{text-overflow:ellipsis}
.editor .two{display:grid;grid-template-columns:1fr 1fr;gap:12px}
#ruleEditor textarea{min-height:56px;padding:6px 10px;resize:vertical}
@supports (field-sizing:content){#ruleEditor textarea{field-sizing:content;max-height:190px}}

/* Input */
.dropzone{position:relative}
.dropzone.over::after{content:"Drop the log file";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;border:2px dashed var(--accent);border-radius:var(--r-md);background:var(--tint);color:var(--accent-text);font-weight:700;z-index:2}
.input-area{width:100%;min-height:220px;max-height:60vh}
/* The primary action rides the paste box's top edge instead of the card's bottom right
   corner, so the one thing to press sits against the thing it acts on and stops answering
   the toolbar from the opposite corner. One line with the lede at desktop; under the
   sentence, still right aligned, wherever the line is too narrow to hold both. */
.composer-top{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-bottom:-4px}
.composer-top .lede{flex:1 1 340px;min-width:0}
.composer-top>.row{margin-left:auto;flex:0 0 auto}
.srcfile{display:flex;align-items:center;gap:8px;flex-wrap:wrap;padding:8px 12px;border:1px solid var(--accent);border-radius:var(--r-md);background:var(--tint);color:var(--fg);font-size:.85rem}
.srcfile .name{font-family:var(--font-mono);font-weight:600;word-break:break-all}
.progress{display:flex;align-items:center;gap:12px;font-size:.85rem}
.bar{flex:1;height:6px;border-radius:999px;background:var(--surface-2);overflow:hidden}
.bar i{display:block;height:100%;width:0;background:var(--accent);transition:none;}
/* Result header. The five counters are the only 1.35rem type on the page and they sit in
   a flush grid whose 1 px gaps are the hairline underneath showing through, so no cell
   carries a border, a radius or a fill of its own. The label under each value stays at
   0.72rem caps, which is what keeps the number the loudest thing in the crop. */
.stats{display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:1px;background:var(--hairline);border-bottom:1px solid var(--hairline)}
.stat{padding:12px 16px;background:var(--surface)}
/* One number treatment for all five: one face, one weight, one size, tabular figures so
   the columns still line up without the mono face that made the elapsed value read as a
   different kind of thing from the counts beside it, and that carries its unit in the same
   face as its digits. Teal marks the live stat the direction gives it to and nothing else,
   so the colour reads as meaning rather than as an accident on one cell. */
.stat .v{font-size:1.35rem;font-weight:700;line-height:1.2;letter-spacing:-0.01em;font-variant-numeric:tabular-nums;color:var(--fg)}
.stat .l{font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.02em;color:var(--mut);margin-top:2px}
.stat.live .v{color:var(--accent-text)}
/* The tabs run directly under the counters on the same card ground, their left edge on
   the same 16 px axis as the first counter, teal carrying the selected one. */
.tabs{display:flex;gap:0;border-bottom:1px solid var(--hairline);background:transparent;overflow-x:auto}
.tabs button{min-height:44px;padding:0 16px;border:0;border-bottom:2px solid transparent;background:transparent;font-weight:500;font-size:.85rem;color:var(--mut);white-space:nowrap;transition:color var(--dur) ease,border-color var(--dur) ease;}
.tabs button[aria-selected="true"]{color:var(--fg);font-weight:600;border-bottom-color:var(--accent)}
.tabs button:hover{color:var(--fg)}
.panel{padding:16px;display:flex;flex-direction:column;gap:12px}
.empty{display:flex;flex-direction:column;align-items:flex-start;gap:12px;padding:16px;color:var(--mut)}
.empty h3{color:var(--fg)}

/* Before and after. The data is the piece, so the panel's own padding goes to zero here and
   the two panes run edge to edge inside the card. One grid now carries both panes at once, so
   a source log line is one row: the before and after halves of that row share a height, a
   wrapped continuation stays inside its own row instead of pushing the other side out of step,
   and every original span sits opposite the token that replaced it. The panes and their pre
   elements stay in the DOM as the containers the hover, pin and highlight code reads, and hand
   their boxes to that grid with display:contents. The correlation line, the pane heads, the log
   text and the legend all inset 16 px, the card's own axis that the stat cells and the tabs
   above already sit on, so the panel reads as four flush bands on one left axis. */
#panelBA.panel{padding:0;gap:0}
/* One scroller, so both halves move together. Its cap is the head plus a whole number of line
   boxes, and the head stays stuck to the top, so the bottom edge always lands between two lines
   rather than through one. The 1 px column gap over the hairline ground is the single rule that
   carries both panes from the head all the way down. Rows are pinned to max-content: left at
   auto, a viewport resize made Chromium size every row from the cell's 24 px floor and stretch
   the remainder against the cap, so each row came out 33 px and wrapped text spilled into the
   row beneath until the next render (seen in verify.py's dark shot, wave 2 smoothing). */
.split{--ba-lh:24px;--ba-head:32px;--ba-rows:18;display:grid;grid-template-columns:minmax(0,1fr) minmax(0,1fr);grid-auto-rows:max-content;column-gap:1px;row-gap:0;background:var(--hairline);max-height:calc(var(--ba-head) + var(--ba-lh) * var(--ba-rows));overflow:auto}
.split:focus-visible{outline:2px solid var(--accent);outline-offset:-2px}
.pane{display:contents}
.pane pre{display:contents;tab-size:2}
.pane-head{position:sticky;top:0;z-index:1;grid-row:1;display:flex;align-items:center;justify-content:space-between;gap:8px;height:var(--ba-head);padding:0 16px;border-bottom:1px solid var(--hairline);background:var(--surface-2);font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.02em;color:var(--mut)}
.pane:first-child>.pane-head{grid-column:1}
.pane:last-child>.pane-head{grid-column:2}
/* The count is the quiet half of the head: mono, muted, its own case, tabular so the two
   panes line up on the same right edge. */
#beforeMeta,#afterMeta{font-family:var(--font-mono);font-size:.72rem;font-weight:400;letter-spacing:0;text-transform:none;font-variant-numeric:tabular-nums;color:var(--mut);white-space:nowrap}
/* One cell per source line, placed on the row the script writes into --r, so the two panes
   agree line for line whichever side wraps further. The separator is painted into the cell
   background instead of set as a border, which keeps every row an exact multiple of the line
   box and keeps the cap above meaning what it says. */
.ba-line{grid-row:var(--r,auto);min-width:0;min-height:var(--ba-lh);padding:0 16px;line-height:var(--ba-lh);white-space:pre-wrap;word-break:break-word;background:linear-gradient(var(--hairline),var(--hairline)) 0 100%/100% 1px no-repeat,var(--bg)}
#paneBefore>.ba-line{grid-column:1}
#paneAfter>.ba-line{grid-column:2}
/* The last row carries one line of bottom padding, so the final entry never sits on the scroll
   edge, and drops the separator that would otherwise hang under the list. */
#paneBefore>.ba-line:last-child,#paneAfter>.ba-line:last-child{padding-bottom:var(--ba-lh);background-image:none}
mark.tok{display:inline;padding:0 4px;border-radius:var(--r-sm);background:var(--tint);color:var(--accent-text);font-weight:600;border-bottom:2px solid var(--accent);box-decoration-break:clone;-webkit-box-decoration-break:clone;transition:background-color var(--dur) ease,box-shadow var(--dur) ease;cursor:default}
mark.tok.mask{border-bottom-style:dotted}
mark.tok.hit{background:var(--accent);color:var(--btn-label);box-shadow:0 0 0 2px var(--accent)}
:root[data-theme="light"] mark.tok.hit{background:var(--navy);color:var(--white);box-shadow:0 0 0 2px var(--navy)}
mark.tok:focus-visible{outline:2px solid var(--accent);outline-offset:1px}
.corr{display:flex;align-items:center;gap:10px;min-height:44px;padding:8px 16px;border-bottom:1px solid var(--hairline);background:transparent;font-size:.85rem}
.corr code{font-weight:600;color:var(--accent-text)}
.legend{display:flex;align-items:center;gap:16px;flex-wrap:wrap;padding:12px 16px;border-top:1px solid var(--hairline);font-size:.72rem;color:var(--mut)}
.legend i{display:inline-block;width:22px;height:0;border-bottom:2px solid var(--accent);vertical-align:middle;margin-right:6px}
.legend i.dot{border-bottom-style:dotted}
/* Below 760 the shared block drops the split to one column. The rows give up their explicit
   placement there and fall back to document order, so the after cell follows the before cell
   down the single column and every source line still reads as its own row. */
@media (max-width:760px){
  .pane-head{grid-row:auto}
  .pane:first-child>.pane-head,.pane:last-child>.pane-head{grid-column:1}
  .ba-line{grid-row:auto}
  #paneBefore>.ba-line,#paneAfter>.ba-line{grid-column:1}
}

/* Report */
.bars{display:flex;flex-direction:column;gap:6px}
.barrow{display:grid;grid-template-columns:200px 1fr 48px;align-items:center;gap:12px;font-size:.85rem}
.barrow .n{font-weight:600;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.barrow .b{height:10px;background:var(--surface-2);border-radius:999px;overflow:hidden}
.barrow .b i{display:block;height:100%;background:var(--accent);min-width:2px}
.barrow .c{text-align:right;font-family:var(--font-mono)}
.tbl{width:100%;border-collapse:collapse;font-size:.85rem}
.tbl th,.tbl td{padding:8px 12px;border-bottom:1px solid var(--hairline);text-align:left;vertical-align:top}
.tbl th{background:var(--surface-2);font-size:.72rem;font-weight:600;text-transform:uppercase;letter-spacing:.02em;color:var(--mut);position:sticky;top:0}
.tbl td.mono{word-break:break-all}
.tbl .orig{filter:blur(5px);user-select:none;transition:none;}
.tbl.reveal .orig{filter:none;user-select:text}
.tbl .ctx{color:var(--mut);font-family:var(--font-mono);font-size:.72rem;white-space:pre-wrap;word-break:break-all}
.tblwrap{max-height:48vh;overflow:auto;border:1px solid var(--hairline);border-radius:var(--r-md)}
.outpre{padding:12px;border:1px solid var(--hairline);border-radius:var(--r-md);background:var(--bg);max-height:52vh;overflow:auto;font-size:.8rem}

/* Integrate */
.codeblock{position:relative;border:1px solid var(--hairline);border-radius:var(--r-md);background:var(--code-bg);overflow:hidden}
.codeblock pre{padding:16px;overflow:auto;font-size:.8rem;max-height:56vh}
.codeblock .cb-head{display:flex;align-items:center;justify-content:space-between;gap:8px;padding:8px 8px 8px 16px;border-bottom:1px solid var(--hairline);background:var(--surface-2);font-size:.72rem;font-weight:600;color:var(--mut)}
.steps{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px}
.step{padding:12px;border:1px solid var(--hairline);border-radius:var(--r-md);background:var(--bg);font-size:.85rem;line-height:1.45}
.step .n{font-family:var(--font-mono);font-size:.72rem;color:var(--accent-text);font-weight:700}
.step h3{margin:4px 0 4px}

/* Footer */
.foot{padding:20px;border-top:1px solid var(--hairline);color:var(--mut);font-size:.85rem;line-height:1.5;display:flex;flex-direction:column;gap:4px}
.foot a{display:inline-flex;align-items:center;justify-content:center;min-height:44px;min-width:44px}
.foot .row{gap:16px}

/* Toast and status */
.toast{position:fixed;left:50%;bottom:20px;transform:translateX(-50%);z-index:40;padding:8px 16px;border:1px solid var(--accent);border-radius:var(--r-md);background:var(--surface);box-shadow:var(--shadow);font-size:.85rem;font-weight:600;opacity:0;pointer-events:none;transition:opacity var(--dur) ease;}
.toast.show{opacity:1}

@media (max-width:1280px){
  .pkg{display:none}
}
@media (max-width:1080px){
  .workspace{grid-template-columns:1fr}
  .rail{position:static;max-height:none;border-right:0}
  .viewtabs{display:flex}
  body[data-view="configure"] .main{padding:0}
}
@media (max-width:1080px){
  .topbar{padding:8px 16px}
  .pkg,.brand-sep{display:none}
}
/* Below 760 the shared block already drops the GitHub link. Import and Export keep their
   words there, so their glyphs step aside instead. The theme switch keeps its track. */
@media (max-width:760px){
  .topbar-right .btn.tb .ico{display:none}
}
@media (max-width:760px){
  .main{padding:16px}
  .split{grid-template-columns:1fr}
  .editor .two{grid-template-columns:1fr}
  .barrow{grid-template-columns:120px 1fr 44px}
  .local span.t,.local .long,#themeBtn .l,#ghLink{display:none}
  .topbar-right{width:100%;justify-content:space-between;gap:6px}
  .topbar-right .btn.ghost.tb{padding:0 10px}
  .local{padding:0 10px}
}
@media (prefers-reduced-motion: reduce){
  *,*::before,*::after{transition:none !important;animation:none !important}
}
</style>
</head>
