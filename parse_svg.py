import re

with open("public/mapa-expo-ferre.svg") as f:
    content = f.read()

matches = re.finditer(r'<text[^>]*>.*?(\d{1,2}).*?</text>', content, flags=re.DOTALL)
for m in matches:
    # get the text contents without HTML tags
    t_tag = m.group(0)
    # extract digits
    digits = re.findall(r'\d+', t_tag)
    if not digits: continue
    # usually stand number is the first one, or the one that is 1 or 2 digits not inside style
    # actually let's just strip tags
    text_content = re.sub(r'<[^>]+>', '', t_tag).strip()
    if not text_content.isdigit(): continue
    num = int(text_content)
    
    start = max(0, m.start() - 600)
    snippet = content[start:m.end()]
    
    paths = re.findall(r'<path[^>]*class="(st3[789])"', snippet)
    polygons = re.findall(r'<polygon[^>]*class="(st3[789])"', snippet)
    circles = re.findall(r'<circle[^>]*class="(st3[789])"', snippet)
    
    colors = paths + polygons + circles
    
    # Take the last one before the text as the most likely
    color = colors[-1] if colors else "unknown"
    
    cat = "Plata"
    if color == "st38": cat = "Diamante"
    if color == "st39": cat = "Oro"
    
    print(f"Stand {num}: {cat} (color class {color})")

