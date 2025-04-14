from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import geopandas as gpd
import fiona

app = FastAPI()

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Adjust this in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

DB_PATH = "cpad.sqlite"

def get_available_layers():
    """Return a list of all spatial layers in the SQLite database."""
    try:
        return fiona.listlayers(DB_PATH)
    except Exception as e:
        print(f"[ERROR] Could not list layers: {e}")
        return []

@app.get("/api/layers")
def list_layers():
    """API endpoint to list all available spatial layers."""
    layers = get_available_layers()
    if not layers:
        raise HTTPException(status_code=404, detail="No spatial layers found.")
    return {"layers": layers}

@app.get("/api/geojson/{layer_name}")
def get_layer_geojson(layer_name: str):
    """API endpoint to return GeoJSON for a specific layer."""
    available_layers = get_available_layers()
    if layer_name not in available_layers:
        raise HTTPException(status_code=404, detail=f"Layer '{layer_name}' not found.")

    try:
        gdf = gpd.read_file(DB_PATH, layer=layer_name)

        if gdf.empty or gdf.geometry.isnull().all():
            raise HTTPException(status_code=204, detail=f"Layer '{layer_name}' has no spatial data.")

        gdf = gdf[gdf.is_valid]
        gdf = gdf.to_crs("EPSG:4326")
        return gdf.__geo_interface__

    except Exception as e:
        print(f"[ERROR] Failed to load layer '{layer_name}': {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load layer '{layer_name}'.")
