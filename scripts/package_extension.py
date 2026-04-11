import zipfile
import os

def package_extension():
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)
    output_zip = os.path.join(project_dir, 'smart-tab-booker-v1.4.zip')

    exclude_dirs = {'.git', '__pycache__', 'scripts', 'docs'}
    exclude_files = {'.gitignore', '.DS_Store', 'CHANGELOG.md', 'README.md',
                     'STORE_LISTING.md', 'validate_keys.js', 'package_extension.py'}
    exclude_patterns = ['smart-tab-booker-v']

    with zipfile.ZipFile(output_zip, 'w', zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(project_dir):
            rel_root = os.path.relpath(root, project_dir)
            dirs[:] = [d for d in dirs if d not in exclude_dirs]

            for file in files:
                if file in exclude_files:
                    continue
                if any(p in file for p in exclude_patterns) and file.endswith('.zip'):
                    continue

                file_path = os.path.join(root, file)
                arcname = os.path.relpath(file_path, project_dir)
                print(f"Adding {arcname}")
                zipf.write(file_path, arcname)

    size_kb = os.path.getsize(output_zip) / 1024
    print(f"\nPackaging complete!")
    print(f"Created: {output_zip} ({size_kb:.1f} KB)")

if __name__ == "__main__":
    package_extension()
