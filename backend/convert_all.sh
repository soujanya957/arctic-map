#!/bin/bash
INPUT_FOLDER="/"
OUTPUT_DB="cpad.sqlite"

for shp in "$INPUT_FOLDER"*.shp; do
  echo "Processing $shp..."
  ogr2ogr -f SQLite -dsco SPATIALITE=YES -nln "${shp%.shp}" -append "$OUTPUT_DB" "$shp"
done

{
  ogr2ogr -f SQLite -dsco SPATIALITE=YES \
    -nln "$(basename "${shp%.shp}")" \
    -append -skipfailures "$OUTPUT_DB" "$shp"
} 2>> ogr_errors.log


echo "Done. Data written to $OUTPUT_DB."
