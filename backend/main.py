from fastapi import FastAPI, HTTPException, Response, Query
from fastapi.middleware.cors import CORSMiddleware
import geopandas as gpd
import pandas as pd
import fiona
from bs4 import BeautifulSoup
import re
from geopy.geocoders import Nominatim 
from geopy.exc import GeocoderTimedOut, GeocoderServiceError
import sqlite3

# for spatial queries
from shapely.geometry import shape # converts geoJSONs to shapely
from shapely.prepared import prep # optimizes spatial queries on complex polygons
from pydantic import BaseModel

import json

app = FastAPI()
geolocator = Nominatim(user_agent="CPAD-web-gis-app") # instantiate geocoder here for searchbar purposes

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
        return layers
    except Exception as e:
        print(f"[ERROR] Could not list layers: {e}")
        return []

# def get_all_metadata_layer_names():
#     try:
#         conn = sqlite3.connect(DB_PATH)
#         cursor = conn.cursor()
#         cursor.execute("SELECT layer_name FROM layer_metadata")
#         names = [row[0] for row in cursor.fetchall()]
#         conn.close()
#         print(f"[DEBUG] All metadata table layer names: {names}")
#         return names
#     except Exception as e:
#         print(f"[ERROR] Could not fetch metadata layer names: {e}")
#         return []

# def get_layer_metadata(layer_name: str):
#     try:
#         print(f"[DEBUG] Fetching metadata for: [{layer_name}]")
#         conn = sqlite3.connect(DB_PATH)
#         cursor = conn.cursor()
#         cursor.execute("""
#             SELECT xml_metadata FROM layer_metadata
#             WHERE lower(trim(layer_name)) = lower(trim(?))
#         """, (layer_name,))
#         row = cursor.fetchone()
#         conn.close()
#         if row and row[0]:
#             print(f"[DEBUG] Metadata found for: [{layer_name}] (length: {len(row[0])})")
#             return row[0]
#         else:
#             print(f"[DEBUG] No metadata found for: [{layer_name}]")
#             return None
#     except Exception as e:
#         print(f"[ERROR] Could not fetch metadata for {layer_name}: {e}")
#         return None

# @app.get("/api/layers")
# def list_layers():
#     layers = get_available_layers()
#     if not layers:
#         raise HTTPException(status_code=404, detail="No spatial layers found.")
#     return {"layers": layers}

@app.get("/api/geojson/{layer_name}")
def get_layer_geojson(layer_name: str):
    available_layers = get_available_layers()
    print(f"[DEBUG] Requested layer_name: [{layer_name}]")

    if layer_name not in available_layers:
        raise HTTPException(status_code=404, detail=f"Layer '{layer_name}' not found.")

    try:
        gdf = gpd.read_file(DB_PATH, layer=layer_name)
        if gdf.empty or gdf.geometry.isnull().all():
            raise HTTPException(status_code=204, detail=f"Layer '{layer_name}' has no spatial data.")

        gdf = gdf[gdf.is_valid]
        gdf = gdf.to_crs("EPSG:4326")
        geojson = gdf.__geo_interface__
        return geojson
    
    except Exception as e:
        print(f"[ERROR] Failed to load layer '{layer_name}': {e}")
        raise HTTPException(status_code=500, detail=f"Failed to load layer '{layer_name}'.")

# @app.post("/api/spatial-query")
# def spatial_query(
#     layer_name: str = Body(...),
#     geometry: dict = Body(...),
#     operation: str = Body("intersects")
# ):
#     available_layers = get_available_layers()
#     if layer_name not in available_layers:
#         raise HTTPException(status_code=404, detail=f"Layer '{layer_name}' not found.")

#     try:
#         gdf = gpd.read_file(DB_PATH, layer=layer_name)
#         if gdf.empty or gdf.geometry.isnull().all():
#             raise HTTPException(status_code=204, detail="Layer has no spatial data.")

#         query_geom = shape(geometry)

#         if operation == "intersects":
#             mask = gdf.geometry.intersects(query_geom)
#         elif operation == "within":
#             mask = gdf.geometry.within(query_geom)
#         elif operation == "contains":
#             mask = gdf.geometry.contains(query_geom)
#         elif operation == "touches":
#             mask = gdf.geometry.touches(query_geom)
#         elif operation == "crosses":
#             mask = gdf.geometry.crosses(query_geom)
#         elif operation == "overlaps":
#             mask = gdf.geometry.overlaps(query_geom)
#         elif operation == "equals":
#             mask = gdf.geometry.equals(query_geom)
#         elif operation == "disjoint":
#             mask = gdf.geometry.disjoint(query_geom)
#         else:
#             raise HTTPException(status_code=400, detail="Invalid operation.")

#         filtered = gdf[mask]
#         filtered = filtered.to_crs("EPSG:4326")
#         geojson = filtered.__geo_interface__

#         return {"geojson": geojson, "count": len(filtered)}
#     except Exception as e:
#         print(f"[ERROR] Spatial query failed: {e}")
#         raise HTTPException(status_code=500, detail="Spatial query failed.")

# pydantic model for request body, sent from frontend
class SpatialQueryRequest(BaseModel):
    geometry: dict  # geoJSON of the user's drawn boundary
    layers: list[str] # list of layer names selected by the user

@app.post("/api/spatial-query")
def spatial_query(request_data: SpatialQueryRequest):
    drawn_geometry_json = request_data.geometry # user's custom boundary
    layers_to_query = request_data.layers # user's currently selected layers

    if not drawn_geometry_json or not layers_to_query:
        raise HTTPException(status_code=400, detail="Missing geometry or layers in request.")
        
    try:
        query_geom = shape(drawn_geometry_json)

        # Use prepared geometry for optimized intersection checks, especially for complex polygons
        # prepared_query_geom = prep(query_geom)

    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Invalid drawn geometry: {e}")
    
    results = {} # store the FeatureCollection for each intersecting layer
    available_layers = get_available_layers() 

    # loop through each of the user's currently selected layers
    for layer_name in layers_to_query:
        if layer_name not in available_layers:
            print(f"Warning: Requested layer '{layer_name}' not found on backend. Skipping.")
            continue # Skip layers not found on the backend

        try:
            gdf = gpd.read_file(DB_PATH, layer=layer_name)

            if gdf.empty or gdf.geometry.isnull().all():
                print(f"Layer '{layer_name}' is empty or has no valid geometry. Skipping.")
                continue

            # find all features that INTERSECT with the user's custom boundary
            # mask = gdf.geometry.intersects(prepared_query_geom)
            mask = gdf.geometry.intersects(query_geom)

            filtered_gdf = gdf[mask]

            if not filtered_gdf.empty:
                filtered_gdf = filtered_gdf.to_crs("EPSG:4326")
                geojson_output = filtered_gdf.__geo_interface__

                # Store the results for this layer as a dictionary
                results[layer_name] = {
                    "geojson": geojson_output,
                    "count": len(filtered_gdf)
                }

        except Exception as e:
            print(f"[ERROR] Spatial query failed for layer '{layer_name}': {e}")

    return {"results": results}

def normalize_layer_name(name: str) -> str:
    """Helper func for get_metadata_html(), 
    normalizes frontend layer name to match metadata title format."""
    name = name.lower().strip()

    if name.startswith("a_"):
        name = name[2:]  # remove prefix "a_"
        if name.startswith("clean_"):
            name = name[6:] # remove prefix "clean_"
    return name.replace(" ", "_")

@app.get("/api/metadata_html/{layer_name}")
def get_metadata_html(layer_name: str):
    try:
        normalized_name = normalize_layer_name(layer_name)
        print(f"Layer name: {layer_name}")
        print(f"🔍 Searching for layer: {normalized_name}")

        with open("metadata.html", "r", encoding="utf-8") as f:
            soup = BeautifulSoup(f, "html.parser")
            print("✅ Metadata file loaded.")

        style_tags = soup.find_all("style")
        styles_combined = "\n".join(str(tag) for tag in style_tags)

        # Step 1. find the specific <p> tag that contains the "Title:" we're looking for
        all_paragraphs = soup.find_all("p")
        target_layer = None # stores the matching layer title <p> name

        for p in all_paragraphs:
            match = re.match(r"\s*title\s*:\s*(.+)", p.get_text(), re.IGNORECASE)
            if match:
                raw_title = match.group(1).strip().lower()
                if normalize_layer_name(raw_title) == normalized_name:
                    target_layer = p # udpate value when we find the matching <p> tag 
                    break 
        
        if not target_layer:
            raise HTTPException(status_code=404, detail=f"Metadata with title '{layer_name} not found.")
        
        # Step 2: Collect all HTML, iterating through every following tag until the next heading <h1> tag
        section_html = str(target_layer) # start with the name of the layer you're looking for 
        for tag in target_layer.find_next_siblings():
            # if tag.name == "h1":
            if tag.find("h1"):
                break
            section_html += str(tag)

        # Step 3: Wrap in full HTML with styles
        full_html = f"""
        <html>
        <head>
            {styles_combined}
        </head>
        <body>
            {section_html}
        </body>
        </html>
        """

        return Response(content=full_html, media_type="text/html")
    
    except FileNotFoundError:
        print("[ERROR] metadata.html not found.")
        raise HTTPException(status_code=500, detail="Metadata source file not found on server.")
    except Exception as e:
        print(f"[ERROR] {e}")
        raise HTTPException(status_code=500, detail="Internal server error.")

def fetch_layers_theme_info():
    """Helper func for get_layer_hierarchy(), 
    references the Google Sheet of themes and subthemes for each dataset."""
    SHEET_ID = "1CftOecfPTeTG8AY-Av2kF_yw-KW7C7B2-ZZ8N03ZqPY"  # Replace with your Sheet ID
    GID = "583540745" # change this based on which tab of the main spreadsheet you're using
    url = f"https://docs.google.com/spreadsheets/d/{SHEET_ID}/export?format=csv&gid={GID}"
    
    try:
        df = pd.read_csv(url)
        records = df.to_dict(orient="records")
        return records
    except Exception as e:
        print(f"[ERROR] Failed to fetch sheet: {e}")
        return []

@app.get("/api/layer_hierarchy")
def get_layer_hierarchy():
    metadata = fetch_layers_theme_info() 
    
    hierarchy = {}
    for row in metadata:
        theme = row["theme"]
        subtheme = row["subtheme"]
        entry = {
            "layer_name": row["layer_name"],
            "display_name": row["display_name"]
        }
        hierarchy.setdefault(theme, {}).setdefault(subtheme, []).append(entry)
    
    return hierarchy

@app.get("/api/geocode")
async def geocode(query: str = Query(...)):
    try:
        location = geolocator.geocode(query, timeout=5)
        if location:
            
            # Nominatim's boundingbox format: [minlat, maxlat, minlon, maxlon]
            # Mapbox GL JS fitBounds expects: [west, south, east, north] which is [minlon, minlat, maxlon, maxlat]
            nominatim_bbox = location.raw.get('boundingbox')
            mapbox_bounds = None

            if nominatim_bbox and len(nominatim_bbox) == 4:
                try:
                    # Convert string values to float and reorder for Mapbox
                    min_lat = float(nominatim_bbox[0])
                    max_lat = float(nominatim_bbox[1])
                    min_lon = float(nominatim_bbox[2])
                    max_lon = float(nominatim_bbox[3])
                    mapbox_bounds = [min_lon, min_lat, max_lon, max_lat]
                except ValueError:
                    # Handle cases where boundingbox values might not be valid numbers
                    mapbox_bounds = None

            return {
                "lat": location.latitude,
                "lon": location.longitude,
                "address": location.address,
                "bounds": mapbox_bounds # Include the formatted bounding box
            }
        else:
            raise HTTPException(status_code=404, detail="Location not found")
    except GeocoderTimedOut:
        raise HTTPException(status_code=504, detail="Geocoding service timed out")
    except GeocoderServiceError as e:
        raise HTTPException(status_code=500, detail=f"Geocoding service error: {e}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"An unexpected error occurred: {e}")