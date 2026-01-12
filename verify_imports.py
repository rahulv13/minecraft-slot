import os
import re

# Path to MiningBlock.tsx
ts_file_path = 'components/MiningBlock.tsx'

# Directory where blocks are stored
blocks_dir = 'assets/blocks'

# Regex to find imports
# import dirtBlock from '../assets/blocks/dirt.jpg';
import_pattern = re.compile(r"import\s+\w+\s+from\s+'\.\./assets/blocks/([^']+)';")

missing_files = []

if not os.path.exists(ts_file_path):
    print(f"Error: {ts_file_path} does not exist.")
    exit(1)

with open(ts_file_path, 'r') as f:
    content = f.read()
    matches = import_pattern.findall(content)

    for filename in matches:
        full_path = os.path.join(blocks_dir, filename)
        if not os.path.exists(full_path):
            missing_files.append(filename)
        else:
            print(f"Verified: {filename} exists.")

if missing_files:
    print("\nMissing files:")
    for f in missing_files:
        print(f" - {f}")
    exit(1)
else:
    print("\nAll imported block textures exist.")
    exit(0)
