#!/usr/bin/env python3
"""Bundle src/ into one self-contained page.

    python3 build.py

Writes:
  index.html          full HTML document (open it, or host it on GitHub Pages)
  dist/artifact.html  same page without <html>/<body> wrapper (for Claude artifacts)
"""
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"

FONTS = ("https://fonts.googleapis.com/css2?family=Baloo+2:wght@700;800"
         "&family=Cinzel:wght@600;700;900"
         "&family=Nunito:wght@400;600;700;800&family=DM+Mono:wght@500"
         "&family=Noto+Sans+Symbols+2&display=swap")


def read(name):
    return (SRC / name).read_text(encoding="utf-8")


head = f"""<title>Theo's Chess Quest</title>
<meta name="claude:viewport-fit-sides" content="cover">
<meta name="description" content="Step-by-step chess missions and a computer opponent, made for Theo.">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="{FONTS}">
<style>
{read('style.css')}
</style>"""

scripts = f"""<script id="src-engine">
{read('engine.js')}
</script>
<script id="src-ai">
{read('ai.js')}
</script>
<script>
{read('lessons.js')}
</script>
<script>
{read('app.js')}
</script>"""

body = read("body.html")

(ROOT / "dist").mkdir(exist_ok=True)
(ROOT / "dist" / "artifact.html").write_text(f"{head}\n{body}\n{scripts}\n", encoding="utf-8")
(ROOT / "index.html").write_text(
    f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
{head}
</head>
<body>
{body}
{scripts}
</body>
</html>
""", encoding="utf-8")
print("Built index.html and dist/artifact.html")
