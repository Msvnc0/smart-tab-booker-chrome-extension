import zipfile
import os

def package_extension():
    project_dir = r"c:\Users\musti\.gemini\antigravity\smart-tab-booker"
    output_zip = os.path.join(project_dir, "smart-tab-booker.zip")
    
    # Files/Dirs to INclude (or exclude others)
    # We will walk and exclude
    exclusions = [
        "resize_icons.py",
        "promo_script.js",
        ".git",
        ".DS_Store",
        "smart-tab-booker.zip",
        "package_extension.py"
    ]
    
    print(f"Packaging extension from {project_dir} to {output_zip}...")
    
    try:
        with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(project_dir):
                for file in files:
                    if file in exclusions:
                        continue
                    
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, project_dir)
                    
                    # Check if explicit exclusion (full path check if needed, but simple filename check above covers most)
                    if any(excl in arcname for excl in exclusions):
                         continue
                         
                    print(f"Adding {arcname}")
                    zipf.write(file_path, arcname)
        
        print("\nPackaging complete!")
        print(f"Created: {output_zip}")
        
    except Exception as e:
        print(f"Error packaging: {e}")

if __name__ == "__main__":
    package_extension()
