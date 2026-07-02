import re

with open("public/mapa-expo-ferre.svg") as f:
    svg_content = f.read()

# Build dictionary of stand number to Category
stands_cat = {}
matches = re.finditer(r'<text[^>]*>.*?(\d{1,2}).*?</text>', svg_content, flags=re.DOTALL)
for m in matches:
    t_tag = m.group(0)
    text_content = re.sub(r'<[^>]+>', '', t_tag).strip()
    if not text_content.isdigit(): continue
    num = int(text_content)
    
    start = max(0, m.start() - 600)
    snippet = svg_content[start:m.end()]
    
    colors = re.findall(r'<path[^>]*class="(st3[789])"|<polygon[^>]*class="(st3[789])"|<circle[^>]*class="(st3[789])"', snippet)
    # flatten
    colors = [item for sublist in colors for item in sublist if item]
    
    color = colors[-1] if colors else "unknown"
    if color == "st38": stands_cat[num] = "Diamante"
    elif color == "st39": stands_cat[num] = "Oro"
    elif color == "st37": stands_cat[num] = "Plata"

# Manually check missing ones
# 1 -> is probably Plata or Oro? 
# In InteractiveMap.jsx, let's look at the source and just assign
print("Detected Categories:", stands_cat)

with open("src/components/InteractiveMap.jsx") as f:
    code = f.read()

def replacer(match):
    full_line = match.group(0)
    stand_id = match.group(1) # e.g. "stand-1"
    num = int(stand_id.split("-")[1])
    
    cat = stands_cat.get(num, "Plata") # default to Plata
    if cat == "Diamante":
        price = "U$3,800"
        size = "Diamante (6x3 mts)"
    elif cat == "Oro":
        price = "U$2,700"
        size = "Oro (4x3 mts)"
    else:
        price = "U$1600"
        size = "Plata (3x3 mts)"
        
    new_line = re.sub(r"price:\s*'[^']+'", f"price: '{price}'", full_line)
    new_line = re.sub(r"size:\s*'[^']+'", f"size: '{size}'", new_line)
    return new_line

new_code = re.sub(r"\{\s*id:\s*'((?:stand|Stand)-\d+)'[^}]+\},", replacer, code)

with open("src/components/InteractiveMap.jsx", "w") as f:
    f.write(new_code)

print("Updated InteractiveMap.jsx")

