#!/usr/bin/env python3
"""Inline every script into one standalone file: Recall.html.

The multi-file version in this folder is the source of truth; this is the
single file you can email, drop on any host, or open from a USB stick.
"""
import re, pathlib

here = pathlib.Path(__file__).parent
html = (here / "index.html").read_text(encoding="utf-8")

def inline(m):
    src = m.group(1)
    code = (here / src).read_text(encoding="utf-8")
    return "<script>\n/* ---- " + src + " ---- */\n" + code + "\n</script>"

out = re.sub(r'<script src="([^"]+)"></script>', inline, html)
out = out.replace("<title>Recall —", "<title>Recall (offline) —", 1)
(here / "Recall.html").write_text(out, encoding="utf-8")
print("built Recall.html  %.0f KB" % (len(out.encode()) / 1024))
