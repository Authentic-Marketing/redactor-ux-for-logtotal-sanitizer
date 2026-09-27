import sys, re, base64

out = sys.argv[1]
public = "--public" in sys.argv[2:]
head = open("ui/head.frag", encoding="utf-8").read()
if public:
    head = "\n".join(
        l
        for l in head.split("\n")
        if 'name="artifact-class"' not in l and "brand/DESIGN.md" not in l
    )
body = open("ui/body.frag", encoding="utf-8").read()
bundle = open("pkg/sanitizer.iife.js", encoding="utf-8").read().rstrip()
import json

app = "".join(
    open("ui/" + f, encoding="utf-8").read()
    for f in ("app-1.js", "app-2.js", "app-3.js")
)
assert app.count("'__BRIDGE_SRC__'") == 1


def embed(path):
    return json.dumps(open(path, encoding="utf-8").read()).replace("</", "<\\/")


app = app.replace("'__BRIDGE_SRC__'", embed("bridge/sanitizer-bridge.mjs"))
assert app.count("'__UPDATE_SRC__'") == 1
app = app.replace("'__UPDATE_SRC__'", embed("bridge/update-page.mjs"))
assert "</script" not in app, "embedded source would close the script tag"
assert "</script" not in bundle and "</script" not in app
head = head.replace(
    "__FAVICON__",
    "data:image/png;base64,"
    + base64.b64encode(
        open("brand/cropped-android-chrome-512x512-1-192x192.png", "rb").read()
    ).decode(),
)
body = body.replace(
    "__LOGO_SVG__", open("brand/logo-inline.svg", encoding="utf-8").read()
)
assert "__FAVICON__" not in head and "__LOGO_SVG__" not in body
lib = re.search(
    r"const LIB = \{ name: '([^']+)', version: '([^']+)', published: '([^']+)' \};", app
)
assert lib, "LIB constant not found in the app sources"
html = (
    head + body + "\n<!-- bundle:start " + lib.group(1) + " " + lib.group(2) + " -->\n"
    "<script>\n" + bundle + "\n</script>\n<!-- bundle:end -->\n"
    "<script>\n" + app + "\n</script>\n</body>\n</html>\n"
)
# Apache-2.0 section 4: the license notice travels with a standalone copy of the page.
notice = (
    "<!--\nSPDX-License-Identifier: Apache-2.0\n"
    "Bundles " + lib.group(1) + " " + lib.group(2) + ", unmodified, Apache-2.0,\n"
    "https://github.com/socprime/logtotal-sanitizer\n"
    "License text: https://www.apache.org/licenses/LICENSE-2.0\n-->\n"
)
assert html.startswith("<!DOCTYPE html>\n")
html = html.replace("<!DOCTYPE html>\n", "<!DOCTYPE html>\n" + notice, 1)
open(out, "w", encoding="utf-8").write(html)
s = html
bad = {
    name: len(re.findall(ch, s))
    for ch, name in (
        (chr(0x2014), "em dash"),
        (chr(0x2013), "en dash"),
        (chr(0xA7), "section sign"),
    )
}
print("written", out, len(s.encode("utf-8")), "bytes,", s.count("\n"), "lines")
print("dash scan:", bad)
print("mode:", "public" if public else "client-tree")
print(
    "artifact-class meta:",
    bool(re.search(r'<meta name="artifact-class" content="deliverable">', s)),
)
if public:
    assert (
        "artifact-class" not in s and "orchestrator/" not in s
    ), "public build still carries an estate marker"
print("script tags:", s.count("<script>"), s.count("</script>"))

# No test-only hook may reach the shipped page. The open-on-load check is tested by seeding
# localStorage before navigation, never by letting the page's clock be overridden.
for hook in ("__NOW__", "__TEST", "Date.now = ", "window.__clock"):
    assert hook not in s, "test hook " + hook + " reached the built page"

# version.json, the manifest an opted-in page reads. Written only when asked for, because it must
# not be published before the download it names actually serves that version.
if "--version-json" in sys.argv[2:]:
    import datetime

    dest = sys.argv[sys.argv.index("--version-json") + 1]
    page = re.search(r"const PAGE = \{ version: '([^']+)' \};", app)
    assert page, "PAGE constant not found in the app sources"
    download = "https://authenticmarketing.xyz/wp-content/uploads/2026/09/logtotal-sanitizer-web-app.zip"
    for i, a in enumerate(sys.argv):
        if a == "--download-url":
            download = sys.argv[i + 1]
    assert download.startswith("https://"), "the download url must be https"
    manifest = {
        "schema": 1,
        "web_app": {"version": page.group(1), "download_url": download},
        "library": {"name": lib.group(1), "version": lib.group(2)},
        "generated": datetime.date.today().isoformat(),
    }
    open(dest, "w", encoding="utf-8").write(json.dumps(manifest, indent=2) + "\n")
    print("written", dest, json.dumps(manifest))
