import zipfile
import os
import sys
import json

def package_extension(target='chrome'):
    script_dir = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)

    with open(os.path.join(project_dir, 'manifest.json'), 'r', encoding='utf-8') as f:
        manifest = json.load(f)
    version = manifest.get('version', '1.0')

    exclude_dirs = {'.git', '__pycache__', 'scripts', 'docs'}
    exclude_files = {'.gitignore', '.DS_Store', 'CHANGELOG.md', 'README.md',
                     'STORE_LISTING.md', 'validate_keys.js', 'package_extension.py',
                     'AGENTS.md'}
    if target == 'chrome':
        exclude_files.add('manifest-firefox.json')
    elif target == 'firefox':
        exclude_files.add('manifest.json')
    exclude_patterns = ['smart-tab-booker-v']

    output_zip = os.path.join(project_dir, f'smart-tab-booker-v{version}-{target}.zip')

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

                if target == 'firefox' and file == 'manifest-firefox.json':
                    arcname = os.path.join(os.path.dirname(arcname), 'manifest.json') if os.path.dirname(arcname) else 'manifest.json'

                print(f"Adding {arcname}")
                zipf.write(file_path, arcname)

    size_kb = os.path.getsize(output_zip) / 1024
    print(f"\nPackaging complete!")
    print(f"Target: {target}")
    print(f"Created: {output_zip} ({size_kb:.1f} KB)")

if __name__ == "__main__":
    target = 'chrome'
    if len(sys.argv) > 1:
        arg = sys.argv[1].lower().strip('--')
        if arg in ('firefox', 'ff'):
            target = 'firefox'
        elif arg in ('chrome', 'cr'):
            target = 'chrome'
        else:
            print(f"Unknown target: {arg}. Use 'chrome' or 'firefox'.")
            sys.exit(1)
    package_extension(target)