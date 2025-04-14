# 🧊 Arctic Map

**Arctic Map** is a web-based tool to explore and download geospatial layers.  
- **Backend:** FastAPI serves data and shapefiles  
- **Frontend:** Built with React + Vite  
- **Map rendering:** Powered by Mapbox GL JS  

---

## 📁 File Structure

```bash
arctic-map/
├── backend/
│   ├── batch_downloads.py
│   ├── bundled_zips/
│   ├── cpad.sqlite
│   ├── main.py
│   ├── README.md
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

## 🚀 Run This Project

### 1️⃣ Clone the repository

```bash
git clone https://github.com/your-username/arctic-map.git
cd arctic-map
```

---

### 2️⃣ Run the Backend

In one terminal:

```bash
cd backend
uvicorn main:app --reload --port 8000
```

In another terminal (also inside `backend/`):

```bash
uvicorn zip_downloads:app --reload --port 8001
```

---

### 3️⃣ Run the Frontend

In a third terminal:

```bash
cd frontend
npm install
npm run dev
```

The frontend will run at:  
👉 [http://localhost:5173](http://localhost:5173)

---

## 📝 Notes

- The `zipped_shapefiles/` folder is empty by default. Add zipped shapefiles locally.
- To generate zipped shapefiles from raw shapefiles, run:

```bash
python zip_shapefiles.py
```

It assumes a folder with raw shapefiles exists in the same directory as `arctic-map/`. It creates `.zip` files for each layer and stores them in `zipped_shapefiles/`.

- In `frontend/`, create a `.env` file with your Mapbox token:

```
VITE_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here
```

Get your token from [Mapbox Access Tokens](https://account.mapbox.com/access-tokens).  
Use a public token that starts with `pk.`

---

## 📚 References

This project is based on the **CPAD (Conservation Planning Atlas Database)** and was developed under the supervision of **Professor Seda Salap-Ayca**.

---

## 📄 License

This project is licensed under the **MIT License**.
