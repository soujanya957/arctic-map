# check_layer_metadata.py

import sys
import fiona

DB_PATH = "cpad.sqlite"

def print_layer_metadata(layer_name):
    try:
        with fiona.open(DB_PATH, layer=layer_name) as src:
            print(f"Metadata for layer '{layer_name}':")
            print("  CRS:", src.crs)
            print("  Schema:", src.schema)
            print("  Driver:", src.driver)
            print("  Meta:", src.meta)
    except Exception as e:
        print(f"[ERROR] Could not retrieve metadata for layer '{layer_name}': {e}")

def list_layers():
    try:
        layers = fiona.listlayers(DB_PATH)
        print("Available layers:")
        for l in layers:
            print(f"  - {l}")
    except Exception as e:
        print(f"[ERROR] Could not list layers: {e}")

if __name__ == "__main__":
    if len(sys.argv) != 2:
        print("Usage: python check_layer_metadata.py <layer_name>")
        list_layers()
        sys.exit(1)
    layer_name = sys.argv[1]
    print_layer_metadata(layer_name)

