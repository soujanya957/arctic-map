from fastapi import FastAPI, HTTPException, Response, Query
from fastapi.middleware.cors import CORSMiddleware
import geopandas as gpd
import pandas as pd
import fiona
from bs4 import BeautifulSoup
import re
from geopy.geocoders import Nominatim 
from geopy.exc import GeocoderTimedOut, GeocoderServiceError

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
    """Return a list of all spatial layers in the SQLite database."""
    try:
        return fiona.listlayers(DB_PATH)
    except Exception as e:
        print(f"[ERROR] Could not list layers: {e}")
        return []

# @app.get("/api/layers")
# def list_layers():
#     """API endpoint to list all available spatial layers."""
#     layers = get_available_layers()
#     if not layers:
#         raise HTTPException(status_code=404, detail="No spatial layers found.")
#     return {"layers": layers}

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