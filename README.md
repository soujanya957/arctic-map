
# Arctic Map

**Arctic Map** is a web-based tool for exploring and downloading geospatial layers.  
- **Backend:** FastAPI serves data and shapefiles  
- **Frontend:** Built with React + Vite  
- **Map Rendering:** Powered by Mapbox GL JS  

## File Structure

```bash
arctic-map/
├── backend/
│   ├── batch_downloads.py
│   ├── bundled_zips/
│   ├── cpad.sqlite
│   ├── main.py
│   ├── requirements.txt
│   ├── venv/
│   ├── zip_downloads.py
│   ├── zip_shapefiles.py
│   └── zipped_shapefiles/
└── frontend/
    ├── .env
    ├── index.html
    ├── package.json
    ├── vite.config.js
    └── src/
        ├── App.jsx
        ├── main.jsx
        └── components/
            ├── Map.jsx
            ├── Sidebar.jsx
            └── ...
```

## Setup

### 1. Clone the Repository

```bash
git clone https://github.com/your-username/arctic-map.git
cd arctic-map
```

### 2. Backend Setup

In the `backend/` directory:

1. **Install dependencies:**

```bash
pip install -r requirements.txt
```

2. **Run the Backend:**

```bash
uvicorn main:app --reload --port 8000
```

In a separate terminal (inside `backend/`):

```bash
uvicorn zip_downloads:app --reload --port 8001
```

3. **Add your `cpad.sqlite` database** to the `backend/` directory.

4. Create two directories within `backend/` for storing shapefiles:

```bash
mkdir backend/zipped_shapefiles
mkdir backend/bundled_zips
```

### 3. Frontend Setup

In the `frontend/` directory:

1. **Install dependencies:**

```bash
npm install
```

2. **Run the Frontend:**

```bash
npm run dev
```

The frontend will be available at [http://localhost:5173](http://localhost:5173).

### 4. Mapbox Token Setup

In `frontend/`, create a `.env` file with your Mapbox token:

```
VITE_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here
```

Get your token from [Mapbox Access Tokens](https://account.mapbox.com/access-tokens). Use a public token starting with `pk.`

## Additional Notes

- The `zipped_shapefiles/` directory is empty by default. Add your zipped shapefiles manually.
- To generate zipped shapefiles from raw shapefiles, run:

```bash
python zip_shapefiles.py
```

This will create `.zip` files for each layer in the `zipped_shapefiles/` directory.

## License

This project is licensed under the **MIT License**.
```

You can now copy and paste everything into your `README.md` file! Let me know if you need any other changes.