#!/usr/bin/env python3
"""Build outputs, and stamp the script tags with content hashes.

The stamp matters: without it a browser that has visited before keeps serving
its cached app.js forever, so a returning user never sees an update. The hash
is derived from the file's own bytes, so the URL only changes when the file
actually changes and caching still does its job the rest of the time.

  Recall.html        one standalone file, every script inlined
  index.html         re-stamped in place
"""
import re, hashlib, pathlib

here = pathlib.Path(__file__).parent

def stamp(html):
    def sub(m):
        src = m.group(1)
        f = here / src
        if not f.exists():
            return m.group(0)
        h = hashlib.sha1(f.read_bytes()).hexdigest()[:8]
        return '<script src="%s?v=%s"></script>' % (src, h)
    return re.sub(r'<script src="([^"?]+)(?:\?v=[0-9a-f]+)?"></script>', sub, html)

index = here / "index.html"
html = stamp(index.read_text(encoding="utf-8"))
index.write_text(html, encoding="utf-8")

def inline(m):
    src = m.group(1)
    code = (here / src).read_text(encoding="utf-8")
    return "<script>\n/* ---- " + src + " ---- */\n" + code + "\n</script>"

out = re.sub(r'<script src="([^"?]+)(?:\?v=[0-9a-f]+)?"></script>', inline, html)
out = out.replace("<title>Recall \u2014", "<title>Recall (offline) \u2014", 1)
(here / "Recall.html").write_text(out, encoding="utf-8")
print("stamped index.html; built Recall.html  %.0f KB" % (len(out.encode()) / 1024))
