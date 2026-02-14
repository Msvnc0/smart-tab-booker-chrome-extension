from PIL import Image
import os

source_path = r"c:\Users\musti\.gemini\antigravity\brain\b011bd4c-b757-4b5c-a53b-afa43ead4597\smart_tab_booker_store_icon_1770984497460.png"
dest_dir = r"c:\Users\musti\.gemini\antigravity\smart-tab-booker\images"

sizes = [(16, "icon16.png"), (48, "icon48.png"), (128, "icon128.png")]

try:
    img = Image.open(source_path)
    if not os.path.exists(dest_dir):
        os.makedirs(dest_dir)
        
    for size, filename in sizes:
        resized_img = img.resize((size, size), Image.Resampling.LANCZOS)
        resized_img.save(os.path.join(dest_dir, filename))
        print(f"Created {filename}")
        
except Exception as e:
    print(f"Error: {e}")
