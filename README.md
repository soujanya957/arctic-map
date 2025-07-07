# Arctic Map

**Arctic Map** is a web-based tool for exploring and downloading geospatial layers.

* **Backend**: FastAPI serves spatial data and zipped shapefiles
* **Frontend**: React + Vite
* **Map Rendering**: Mapbox GL JS

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
├── frontend/
│   ├── .env
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   └── src/
│       ├── App.jsx
│       ├── main.jsx
│       └── components/
│           ├── Map.jsx
│           ├── Sidebar.jsx
│           └── ...
└── run_0.sh
```

---

## Prerequisites

Ensure the following tools are installed on your system:

### Python and pip

**macOS:**

```bash
brew install python
```

**Windows:**
Download from [https://www.python.org/downloads/](https://www.python.org/downloads/)
➡️ Be sure to check **"Add Python to PATH"** during installation.

Verify:

```bash
python --version
pip --version
```

### Node.js and npm

**macOS:**

```bash
brew install node
```

**Windows:**
Download from [https://nodejs.org/](https://nodejs.org/)

Verify:

```bash
node --version
npm --version
```

### Tmux

Used to automate starting all services in one command.

**macOS:**

```bash
brew install tmux
```

**Linux:**

```bash
sudo apt install tmux
```

**Windows:**
Use [WSL](https://learn.microsoft.com/en-us/windows/wsl/) and follow Linux instructions.

Verify:

```bash
tmux -V
```

---

## Clone the Repository

```bash
git clone https://github.com/soujanya957/arctic-map.git
cd arctic-map
```

---

## One-Command Run (After Initial Setup)

After first-time setup (see below), run everything via:

```bash
tmux
./run_0.sh
```

This script:

* Starts both FastAPI backends (ports 8000 & 8001)
* Starts the frontend (Vite on port 5173)
* Opens each in a separate tmux pane

➡️ **Detach from tmux**: `Ctrl + b`, then `d`
➡️ **Reattach later**: `tmux attach`

---

## First-Time Setup (Required Once)

### Backend Setup

1. Create and activate a virtual environment:

   ```bash
   cd backend
   python3 -m venv venv
   source venv/bin/activate  # or venv\Scripts\activate on Windows
   ```

2. Install dependencies:

   ```bash
   pip install -r requirements.txt
   ```

3. Make sure `cpad.sqlite` is present in the `backend/` directory.

4. Create the necessary directories:

   ```bash
   mkdir -p zipped_shapefiles bundled_zips
   ```

---

### Frontend Setup

1. Install dependencies:

   ```bash
   cd ../frontend
   npm install
   ```

2. Add your Mapbox token to `frontend/.env`:

   ```env
   VITE_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here
   ```

   You can get a free token at [https://account.mapbox.com/access-tokens](https://account.mapbox.com/access-tokens)

---

## Generating Zipped Shapefiles (Optional)

If you have a folder named `Arctic_CPAD/` (containing shapefiles) in the **same parent directory** as `arctic-map/`, you can generate zipped shapefiles like so:

```bash
cd backend
python zip_shapefiles.py
```

* Output: `backend/zipped_shapefiles/`
* You must run this at least once if you don't manually place zipped shapefiles in that folder.

---

## Notes

* The backend serves two FastAPI apps on ports **8000** (main) and **8001** (download).
* The frontend runs at [http://localhost:5173](http://localhost:5173)
* The directory `backend/zipped_shapefiles/` is initially empty — either generate shapefiles with the script or add them manually.
* Make sure your Mapbox token is correctly set in `.env` for the map to load.

---

## License

This project is licensed under the MIT License.
