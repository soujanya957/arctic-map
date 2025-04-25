# Arctic Map

**Arctic Map** is a web-based tool for exploring and downloading geospatial layers.  
- **Backend**: FastAPI serves spatial data and zipped shapefiles  
- **Frontend**: React + Vite  
- **Map Rendering**: Mapbox GL JS  

---

## Project Structure

```
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

---

## Prerequisites

Before setting up, make sure you have the following tools installed:

### Python and pip

**MacOS:**
```bash
brew install python
```

**Windows:**
Download and install Python from [https://www.python.org/downloads/](https://www.python.org/downloads/).  
During installation, check the option **"Add Python to PATH"**.

Verify installation:
```bash
python --version
pip --version
```

### Node.js and npm

**MacOS:**
```bash
brew install node
```

**Windows:**
Download and install from [https://nodejs.org/](https://nodejs.org/).

Verify installation:
```bash
node --version
npm --version
```

---

## Clone the Repository

```bash
git clone https://github.com/soujanya957/arctic-map.git
cd arctic-map
```

---

## Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. (Optional but recommended) Create a virtual environment:

**MacOS/Linux:**
```bash
python3 -m venv venv
source venv/bin/activate
```

**Windows:**
```cmd
python -m venv venv
venv\Scripts\activate
```

3. Install the Python dependencies:

```bash
pip install -r requirements.txt
```

4. Make sure you have a `cpad.sqlite` file in the `backend/` directory.

5. Create directories to store shapefiles:

```bash
mkdir -p zipped_shapefiles bundled_zips
```

6. Run the backend servers in two separate terminals:

**Terminal 1:**
```bash
uvicorn main:app --reload --port 8000
```

**Terminal 2:**
```bash
uvicorn zip_downloads:app --reload --port 8001
```

---

## Frontend Setup

1. Navigate to the frontend directory:

```bash
cd ../frontend
```

2. Install frontend dependencies:

```bash
npm install
```

3. Run the frontend server:

```bash
npm run dev
```

The frontend will be available at:  
[http://localhost:5173](http://localhost:5173)

---

## Mapbox Token

1. Go to [https://account.mapbox.com/access-tokens](https://account.mapbox.com/access-tokens) and copy your public token (starts with `pk.`).

2. Create a `.env` file inside the `frontend/` directory and add the following line:

```
VITE_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here
```

---

## Generating Zipped Shapefiles (Optional)

If you have a folder called `Arctic_CPAD/` containing shapefiles in the **same parent directory** as `arctic-map/`, you can generate `.zip` files by running:

```bash
cd backend
python zip_shapefiles.py
```

The zipped files will appear in `backend/zipped_shapefiles/`.

---

## Notes

- The `zipped_shapefiles/` directory is initially empty. You must add zipped shapefiles manually or generate them using the provided script.
- The two backend apps serve spatial data and zipped shapefiles on separate ports (8000 and 8001).
- Ensure your Mapbox token is correctly added to `.env` for the map to load.

---

## License

This project is licensed under the MIT License.
