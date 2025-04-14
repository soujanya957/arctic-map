from fastapi import FastAPI, HTTPException, Query
from fastapi.responses import FileResponse
from fastapi.middleware.cors import CORSMiddleware
from starlette.background import BackgroundTask
import os
import zipfile
import uuid

app = FastAPI()

# Enable CORS for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust for production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Directories
ZIP_DIR = "zipped_shapefiles"
BUNDLE_DIR = "bundled_zips"

# Ensure the bundle directory exists
os.makedirs(BUNDLE_DIR, exist_ok=True)

@app.get("/api/shapefiles/batch")
def download_selected_layers(layers: str = Query(..., description="Comma-separated list of layer names")):
    layer_list = [layer.strip() for layer in layers.split(",") if layer.strip()]
    if not layer_list:
        raise HTTPException(status_code=400, detail="No layers specified.")

    bundle_id = str(uuid.uuid4())
    bundle_path = os.path.join(BUNDLE_DIR, f"{bundle_id}.zip")

    found_any = False
    with zipfile.ZipFile(bundle_path, "w") as bundle_zip:
        for layer in layer_list:
            zip_filename = f"{layer}.zip"
            zip_path = os.path.join(ZIP_DIR, zip_filename)
            if not os.path.exists(zip_path):
                print(f"[WARN] Missing file: {zip_path}")
                continue
            bundle_zip.write(zip_path, arcname=zip_filename)
            found_any = True

    if not found_any:
        raise HTTPException(status_code=404, detail="None of the requested shapefiles were found.")

    return FileResponse(
        path=bundle_path,
        filename="selected_layers.zip",
        media_type="application/zip",
        background=BackgroundTask(lambda: os.remove(bundle_path))
    )

@app.get("/api/shapefiles/{filename}")
def download_shapefile(filename: str):
    if not filename.endswith(".zip"):
        filename += ".zip"
    file_path = os.path.join(ZIP_DIR, filename)
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail="Shapefile not found")
    return FileResponse(file_path, media_type="application/zip", filename=filename)
