

# Arctic Map Backend

This directory contains the **backend services** for the Arctic Map Visualizer project. It includes two **FastAPI** applications that provide spatial data and downloadable shapefiles to the frontend.

---

## Overview

The backend consists of two main Python scripts:

- **`main.py`** — Serves spatial data from a SQLite database (`cpad.sqlite`) as GeoJSON.
- **`zip_downloads.py`** — Provides downloadable zipped shapefiles from the `zipped_shapefiles/` directory.

Both applications use **FastAPI** with **CORS middleware** to enable requests from the frontend.

---

## File Descriptions

### `main.py`

This service connects to the `cpad.sqlite` spatial database using **GeoPandas** and **Fiona**. It exposes API endpoints for:

- Listing available spatial layers/tables.
- Retrieving GeoJSON data for specific layers.

### `zip_downloads.py`

This service serves `.zip` shapefiles stored in the `zipped_shapefiles/` directory. Key features include:

- **Endpoint:** `/api/shapefiles/{filename}` — Returns a zipped shapefile.
- CORS support for frontend access.

---

## Setup Instructions

Follow the steps below to set up and run the backend locally.

### 1. Navigate to the backend directory

```bash
cd arctic-map/backend
```

---

### 2. Create and activate a virtual environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
```

---

### 3. Install dependencies

All required packages are listed in the `requirements.txt` file.

```bash
pip install -r requirements.txt
```

> If you encounter issues with `geopandas` or `fiona`, refer to the [GeoPandas installation guide](https://geopandas.org/en/stable/getting_started/install.html) for platform-specific troubleshooting.

---

### 4. Run the backend servers

You can run one or both FastAPI apps using Uvicorn:

#### Serve spatial data (`main.py`)

```bash
uvicorn main:app --reload --port 8000
```

#### Serve zipped shapefiles (`zip_downloads.py`)

```bash
uvicorn zip_downloads:app --reload --port 8001
```

By default, the applications will run on `http://localhost:8000` and `http://localhost:8001`. You can change the ports using the `--port` flag.

---

## Directory Structure

```bash
backend/
├── main.py
├── zip_downloads.py
├── cpad.sqlite
├── zipped_shapefiles/
│   └── [your .zip shapefiles here]
├── requirements.txt
└── README.md
```

---

## API Endpoints

### From `main.py` (Port 8000)

- `GET /api/geojson/{layer_name}` — Returns GeoJSON for the specified spatial layer.

### From `zip_downloads.py` (Port 8001)

- `GET /api/shapefiles/{filename}` — Returns a `.zip` shapefile for download.

---

## Notes

- Ensure that `cpad.sqlite` is present in the `backend/` directory.
- Place all zipped shapefiles inside the `zipped_shapefiles/` folder.
- **CORS is configured to allow all origins** for development purposes. Be sure to restrict this in production environments for security.

---