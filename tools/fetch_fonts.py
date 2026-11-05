#!/usr/bin/env python3
"""Downloads Lora and Onest (Cyrillic and Latin) as woff2 into fonts/ and writes css/fonts.css.

    python3 tools/fetch_fonts.py
"""
import os
import re
import urllib.request

HERE = os.path.dirname(os.path.abspath(__file__))
APP = os.path.dirname(HERE)
UA = ("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
      "(KHTML, like Gecko) Chrome/128.0 Safari/537.36")
CSS_URL = "https://fonts.googleapis.com/css2?family=Lora:wght@600;700&family=Onest:wght@400;500;600&display=swap"
LICENCES = {"Lora": "https://raw.githubusercontent.com/google/fonts/main/ofl/lora/OFL.txt",
            "Onest": "https://raw.githubusercontent.com/google/fonts/main/ofl/onest/OFL.txt"}


def get(url):
    req = urllib.request.Request(url, headers={"User-Agent": UA})
    return urllib.request.urlopen(req, timeout=60).read()


def main():
    css = get(CSS_URL).decode("utf-8")
    os.makedirs(os.path.join(APP, "fonts"), exist_ok=True)
    os.makedirs(os.path.join(APP, "css"), exist_ok=True)
    faces = []
    for subset, block in re.findall(r"/\* ([a-z-]+) \*/\s*(@font-face \{.*?\})", css, re.S):
        if subset not in ("cyrillic", "latin"):
            continue
        family = re.search(r"font-family: '([^']+)'", block).group(1)
        weight = re.search(r"font-weight: (\d+)", block).group(1)
        url = re.search(r"url\((https://[^)]+\.woff2)\)", block).group(1)
        name = "%s-%s-%s.woff2" % (family.lower(), weight, subset)
        with open(os.path.join(APP, "fonts", name), "wb") as fh:
            fh.write(get(url))
        faces.append(block.replace(url, "../fonts/" + name))
    with open(os.path.join(APP, "css", "fonts.css"), "w", encoding="utf-8") as fh:
        fh.write("\n".join(faces) + "\n")
    for family, url in LICENCES.items():
        with open(os.path.join(APP, "fonts", "OFL-%s.txt" % family), "wb") as fh:
            fh.write(get(url))
    print("font faces: %d" % len(faces))


if __name__ == "__main__":
    main()
