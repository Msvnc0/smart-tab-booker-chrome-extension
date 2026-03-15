import zipfile
import os

def package_extension():
    project_dir = os.path.dirname(os.path.abspath(__file__))
    output_zip = os.path.join(project_dir, "smart-tab-booker-v1.3.zip")
    
    exclusions = [
        ".git",
        ".gitignore",
        ".DS_Store",
        "package_extension.py",
        "resize_icons.py",
        "promo_script.js",
        "scripts",
        "smart-tab-booker.zip",
        "smart-tab-booker v1.2.zip",
        "smart-tab-booker-v1.3.zip",
        "STORE_LISTING.md",
        "CHANGELOG.md"
    ]
    
    print(f"Packaging extension from {project_dir} to {output_zip}...")
    
    if os.path.exists(output_zip):
        os.remove(output_zip)
        print("Removed existing zip file")
    
    try:
        with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
            for root, dirs, files in os.walk(project_dir):
                dirs[:] = [d for d in dirs if d not in exclusions]
                
                for file in files:
                    if file in exclusions:
                        continue
                    
                    file_path = os.path.join(root, file)
                    arcname = os.path.relpath(file_path, project_dir)
                    
                    if any(excl in arcname for excl in exclusions):
                        continue
                        
                    print(f"Adding {arcname}")
                    zipf.write(file_path, arcname)
        
        print("\nPackaging complete!")
        print(f"Created: {output_zip}")
        print(f"Size: {os.path.getsize(output_zip) / 1024:.1f} KB")
        
    except Exception as e:
        print(f"Error packaging: {e}")

if __name__ == "__main__":
    package_extension()