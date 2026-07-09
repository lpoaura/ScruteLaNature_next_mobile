import os
import re

color_map = {
    # Primary Green -> Bleu LPO
    '#2D6A4F': '#0087CC',
    '#065F46': '#0087CC',
    '#064E3B': '#0087CC',
    
    # Light Green -> Bleu Cascade or Vert Sauge
    '#E8F5E9': '#D8E8C5',
    '#ECFDF5': '#D8E8C5',
    
    # Emerald Accent -> Vert Canard
    '#10B981': '#007E84',
    
    # Indigo/Blue -> Bleu LPO
    '#4F46E5': '#0087CC',
    
    # Amber/Orange -> Orange Macareux
    '#F59E0B': '#EB601A',
    
    # Yellow
    '#FACC15': '#EFCB8C',
}

def replace_colors(directory):
    for root, _, files in os.walk(directory):
        for file in files:
            if file.endswith('.tsx') or file.endswith('.ts'):
                filepath = os.path.join(root, file)
                with open(filepath, 'r') as f:
                    content = f.read()
                
                original_content = content
                for old_color, new_color in color_map.items():
                    # Case-insensitive replacement of hex codes
                    pattern = re.compile(re.escape(old_color), re.IGNORECASE)
                    content = pattern.sub(new_color, content)
                
                if content != original_content:
                    with open(filepath, 'w') as f:
                        f.write(content)
                    print(f"Updated colors in {filepath}")

replace_colors('app')
replace_colors('src')
print("Color replacement complete.")
