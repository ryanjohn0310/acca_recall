#!/usr/bin/env python3
"""Build the Artifact body: the same app with the document wrapper removed.

Artifacts supply their own <!doctype>, <html> and <head>, so this strips ours
and hands over the <title>, the <style> and the markup, with every script
inlined exactly as build.py does for the standalone file.
"""
import re, pathlib
here = pathlib.Path(__file__).parent
html = (here / "index.html").read_text(encoding="utf-8")

def inline(m):
    src = m.group(1)
    return "<script>\n/* ---- " + src + " ---- */\n" + (here / src).read_text(encoding="utf-8") + "\n</script>"
html = re.sub(r'<script src="([^"]+)"></script>', inline, html)

title = re.search(r"<title>(.*?)</title>", html, re.S).group(0)
fonts = re.search(r'<link rel="stylesheet" href="https://fonts\.googleapis\.com[^>]*>', html).group(0)
style = re.search(r"<style>.*?</style>", html, re.S).group(0)
body  = re.search(r"<body[^>]*>(.*)</body>", html, re.S).group(1)

out = title + "\n" + fonts + "\n" + style + "\n" + body.strip() + "\n"
(here / "artifact-body.html").write_text(out, encoding="utf-8")
print("built artifact-body.html  %.0f KB" % (len(out.encode()) / 1024))
