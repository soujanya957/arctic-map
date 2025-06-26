# main.py

from fastapi import FastAPI, HTTPException, Body
from fastapi.middleware.cors import CORSMiddleware
import geopandas as gpd
import fiona
import sqlite3
from shapely.geometry import shape
import json

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
    try:
        layers = fiona.listlayers(DB_PATH)
        print(f"[DEBUG] Available spatial layers: {layers}")
        return layers
    except Exception as e:
        print(f"[ERROR] Could not list layers: {e}")
        return []

def get_all_metadata_layer_names():
    try:
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("SELECT layer_name FROM layer_metadata")
        names = [row[0] for row in cursor.fetchall()]
        conn.close()
        print(f"[DEBUG] All metadata table layer names: {names}")
        return names
    except Exception as e:
        print(f"[ERROR] Could not fetch metadata layer names: {e}")
        return []

def get_layer_metadata(layer_name: str):
    try:
        print(f"[DEBUG] Fetching metadata for: [{layer_name}]")
        conn = sqlite3.connect(DB_PATH)
        cursor = conn.cursor()
        cursor.execute("""
            SELECT xml_metadata FROM layer_metadata
            WHERE lower(trim(layer_name)) = lower(trim(?))
        """, (layer_name,))
        row = cursor.fetchone()
        conn.close()
        if row and row[0]:
            print(f"[DEBUG] Metadata found for: [{layer_name}] (length: {len(row[0])})")
            return row[0]
        else:
            print(f"[DEBUG] No metadata found for: [{layer_name}]")
            return None
    except Exception as e:
        print(f"[ERROR] Could not fetch metadata for {layer_name}: {e}")
        return None

@app.get("/api/layers")
def list_layers():
    layers = get_available_layers()
    if not layers:
        raise HTTPException(status_code=404, detail="No spatial layers found.")
    return {"layers": layers}

@app.get("/api/geojson/{layer_name}")
def get_layer_geojson(layer_name: str):
    available_layers = get_available_layers()
    get_all_metadata_layer_names()
    print(f"[DEBUG] Requested layer_name: [{layer_name}]")

    if layer_name not in available_layers:
        print(f"[DEBUG] Layer '{layer_name}' not found in available layers.")
        raise HTTPException(status_code=404, detail=f"Layer '{layer_name}' not found.")

    try:
        gdf = gpd.read_file(DB_PATH, layer=layer_name)
        if gdf.empty or gdf.geometry.isnull().all():
            print(f"[DEBUG] Layer '{layer_name}' has no spatial data.")
            raise HTTPException(status_code=204, detail=f"Layer '{layer_name}' has no spatial data.")

        gdf = gdf[gdf.is_valid]
        gdf = gdf.to_crs("EPSG:4326")
        geojson = gdf.__geo_interface__
        metadata = get_layer_metadata(layer_name)
        print(f"[DEBUG] Returning geojson and metadata for: [{layer_name}]")
        return {
            "geojson": geojson,
            "metadata": metadata
        }
    except Exception as e:
        print(f"[ERROR] Failed to load layer '{layer_name}': {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load layer '{layer_name}'.")

@app.post("/api/spatial-query")
def spatial_query(
    layer_name: str = Body(...),
    geometry: dict = Body(...),
    operation: str = Body("intersects")
):
    available_layers = get_available_layers()
    if layer_name not in available_layers:
        raise HTTPException(status_code=404, detail=f"Layer '{layer_name}' not found.")

    try:
        gdf = gpd.read_file(DB_PATH, layer=layer_name)
        if gdf.empty or gdf.geometry.isnull().all():
            raise HTTPException(status_code=204, detail="Layer has no spatial data.")

        query_geom = shape(geometry)

        if operation == "intersects":
            mask = gdf.geometry.intersects(query_geom)
        elif operation == "within":
            mask = gdf.geometry.within(query_geom)
        elif operation == "contains":
            mask = gdf.geometry.contains(query_geom)
        elif operation == "touches":
            mask = gdf.geometry.touches(query_geom)
        elif operation == "crosses":
            mask = gdf.geometry.crosses(query_geom)
        elif operation == "overlaps":
            mask = gdf.geometry.overlaps(query_geom)
        elif operation == "equals":
            mask = gdf.geometry.equals(query_geom)
        elif operation == "disjoint":
            mask = gdf.geometry.disjoint(query_geom)
        else:
            raise HTTPException(status_code=400, detail="Invalid operation.")

        filtered = gdf[mask]
        filtered = filtered.to_crs("EPSG:4326")
        geojson = filtered.__geo_interface__

        return {"geojson": geojson, "count": len(filtered)}
    except Exception as e:
        print(f"[ERROR] Spatial query failed: {e}")
        raise HTTPException(status_code=500, detail="Spatial query failed.")
