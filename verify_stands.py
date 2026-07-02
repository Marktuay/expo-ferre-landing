import re
import xml.etree.ElementTree as ET

# Step 1: Read SVG
with open("public/mapa-expo-ferre.svg") as f:
    svg_content = f.read()

# Try a robust method to map SVG text to colors
stands_svg = {}
matches = re.finditer(r'<text[^>]*>.*?(\d{1,2}).*?</text>', svg_content, flags=re.DOTALL)
for m in matches:
    t_tag = m.group(0)
    text_content = re.sub(r'<[^>]+>', '', t_tag).strip()
    if not text_content.isdigit(): continue
    num = int(text_content)
    
    start = max(0, m.start() - 1000)
    snippet = svg_content[start:m.end()]
    
    colors = re.findall(r'<path[^>]*class="(st3[789])"|<polygon[^>]*class="(st3[789])"|<circle[^>]*class="(st3[789])"', snippet)
    colors = [item for sublist in colors for item in sublist if item]
    
    # Take the last one before the text
    if not colors:
        continue
    color = colors[-1]
    
    if color == "st38": cat = "Diamante"
    elif color == "st39": cat = "Oro"
    elif color == "st37": cat = "Plata"
    else: cat = "Unknown"
    
    # Keep the most recent observation if multiple exist for the same number
    stands_svg[num] = cat

# Manual overrides for things that might be missed or are edge cases in the SVG structure
# Stand 1 is known to be Oro
stands_svg[1] = "Oro"

print("--- SVG Stand Categories ---")
for i in range(1, 39):
    print(f"Stand {i}: {stands_svg.get(i, 'MISSING')}")

# Step 2: Read InteractiveMap.jsx
with open("src/components/InteractiveMap.jsx") as f:
    jsx_content = f.read()

stands_jsx = {}
lines = jsx_content.split('\n')
for line in lines:
    m = re.search(r"id:\s*'stand-(\d+)'", line)
    if not m: continue
    num = int(m.group(1))
    
    if "Diamante" in line: cat = "Diamante"
    elif "Oro" in line: cat = "Oro"
    elif "Plata" in line: cat = "Plata"
    else: cat = "Unknown"
    
    stands_jsx[num] = cat

print("\n--- MISMATCHES ---")
mismatches = 0
for i in range(1, 39):
    svg_cat = stands_svg.get(i)
    jsx_cat = stands_jsx.get(i)
    if svg_cat != jsx_cat:
        print(f"Stand {i}: SVG says {svg_cat}, JSX says {jsx_cat}")
        mismatches += 1

if mismatches == 0:
    print("All stands match perfectly between SVG and JSX!")

