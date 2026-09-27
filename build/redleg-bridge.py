import os, signal, subprocess, sys, time, urllib.request, urllib.error
HERE = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'bridge')
def ask(port, origin=None):
    rq = urllib.request.Request('http://127.0.0.1:%d/health' % port)
    if origin is not None: rq.add_header('Origin', origin)
    try:
        with urllib.request.urlopen(rq, timeout=3) as r: return r.status
    except urllib.error.HTTPError as e: return e.code
def run(port, extra):
    p = subprocess.Popen(['node', 'sanitizer-bridge.mjs', str(port)] + extra, cwd=HERE,
                         stdout=subprocess.DEVNULL, stderr=subprocess.STDOUT, start_new_session=True)
    time.sleep(1.5); return p
def stop(p):
    try: os.killpg(os.getpgid(p.pid), signal.SIGTERM)
    except Exception: pass
    p.wait(timeout=10)

print('RED LEG 1: widen the allowlist, the refusal check must stop refusing')
p = run(7414, ['--allow-origin', 'https://evil.example'])
got = ask(7414, 'https://evil.example')
problems = 0 if got == 200 else 1
stop(p)
print('  unknown origin now returns', got, '->', 'RED LEG WORKS (check would FAIL)' if got == 200 else 'PROBLEM: guard not reachable by config')

print('RED LEG 2: raise the cap, the burst check must stop seeing 429')
p = run(7415, ['--max-rps', '100000'])
codes = [ask(7415, 'null') for _ in range(40)]
problems += 0 if 429 not in codes else 1
stop(p)
print('  429s in a 40 request burst:', codes.count(429), '->', 'RED LEG WORKS (check would FAIL)' if 429 not in codes else 'PROBLEM: cap not governed by the flag')

print('CONTROL: default settings still refuse and still cap')
p = run(7416, [])
refused = ask(7416, 'https://evil.example')
codes = [ask(7416, 'null') for _ in range(40)]
problems += 0 if refused == 403 and 429 in codes else 1
stop(p)
print('  unknown origin', refused, '| 429s', codes.count(429), '->', 'GUARDS LIVE' if refused == 403 and 429 in codes else 'PROBLEM')
sys.exit(1 if problems else 0)
