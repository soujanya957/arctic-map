import os
import zipfile
from collections import defaultdict

# Define paths
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
input_folder = os.path.join(BASE_DIR, "..", "..", "Arctic_CPAD")
output_folder = os.path.join(BASE_DIR, "zipped_shapefiles")

# Ensure output folder exists
os.makedirs(output_folder, exist_ok=True)

# Group files by base name
layer_files = defaultdict(list)

for filename in os.listdir(input_folder):
    if filename.endswith((".shp", ".shx", ".dbf", ".prj", ".cpg", ".sbn", ".sbx", ".xml")):
        # Handle .shp.xml specially
        if filename.endswith(".shp.xml"):
            base_name = filename.replace(".shp.xml", "")
        else:
            base_name = os.path.splitext(filename)[0]
        layer_files[base_name].append(filename)

# Create zip files
for layer, files in layer_files.items():
    zip_path = os.path.join(output_folder, f"{layer}.zip")
    with zipfile.ZipFile(zip_path, "w") as zipf:
        for file in files:
            full_path = os.path.join(input_folder, file)
            zipf.write(full_path, arcname=file)

print(f"✅ Zipped {len(layer_files)} shapefile layers into '{output_folder}'")
