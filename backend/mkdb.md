````markdown
# mkdb.sh — Import Shapefiles into a SpatiaLite Database

This script imports all `.shp` (shapefile) files in the current directory into a single SpatiaLite-compatible SQLite database named `cpad.sqlite`.

---

## 🛠 Requirements

- GDAL with SQLite/SpatiaLite support (`ogr2ogr`, `ogrinfo`)
- Bash shell (Linux, macOS, or WSL on Windows)
- One or more `.shp` files in the current directory

---

## 📥 Step-by-Step Instructions

### 1. Save the Script

Open a terminal and run:

```bash
nano import_shapefiles_to_spatialite.sh
````

Then paste the following script:

```bash
#!/bin/bash
# Filename: import_shapefiles_to_spatialite.sh

DB="cpad.sqlite"
LOG="import_errors.log"

# Remove existing database and log if they exist
[ -f "$DB" ] && rm "$DB"
[ -f "$LOG" ] && rm "$LOG"

FIRST=1

for SHP in *.shp; do
    LAYER=$(basename "$SHP" .shp)
    echo "Importing $SHP as layer $LAYER"
    if [ $FIRST -eq 1 ]; then
        ogr2ogr -f SQLite -dsco SPATIALITE=YES "$DB" "$SHP" -nln "$LAYER" -nlt PROMOTE_TO_MULTI -skipfailures 2>>"$LOG"
        FIRST=0
    else
        ogr2ogr -f SQLite -update "$DB" "$SHP" -nln "$LAYER" -nlt PROMOTE_TO_MULTI -skipfailures 2>>"$LOG"
    fi
done

echo "Listing layers in $DB:"
ogrinfo "$DB"

echo "If you see errors, check $LOG for details."
```

Save and exit:

* Press `Ctrl + O` to write
* Press `Enter` to confirm
* Press `Ctrl + X` to exit

---

### 2. Make the Script Executable

```bash
chmod +x import_shapefiles_to_spatialite.sh
```

---

### 3. Run the Script

```bash
./import_shapefiles_to_spatialite.sh
```

---

## 📦 Output

* `cpad.sqlite`: The generated SQLite database with SpatiaLite support
* `import_errors.log`: A log file with any import errors

---

## 🔍 View Imported Layers

To inspect the layers in the resulting database, run:

```bash
ogrinfo cpad.sqlite
```

---

```markdown
