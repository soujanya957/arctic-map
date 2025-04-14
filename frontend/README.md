# 🌐 Arctic Map Frontend

This is the **frontend** for the Arctic Map project — a web-based tool for exploring and downloading geospatial layers.  
The frontend is built using **React** with **Vite** for fast development and bundling. The map is rendered using **Mapbox GL JS**.

---

## 📁 File Structure

```bash
frontend/
├── .env                  # Environment variables (e.g. Mapbox token)
├── index.html            # Main HTML template
├── package.json          # Project dependencies and scripts
├── vite.config.js        # Vite configuration
└── src/
    ├── App.jsx           # Main app component
    ├── main.jsx          # Entry point
    └── components/
        ├── Map.jsx       # Mapbox map component
        ├── Sidebar.jsx   # Sidebar UI component
        └── ...           # Additional components
```

---

## 🚀 Running the Frontend Locally

### 1️⃣ Navigate to the `frontend` folder

```bash
cd frontend
```

---

### 2️⃣ Install dependencies

```bash
npm install
```

---

### 3️⃣ Set up your Mapbox token

Create a `.env` file in the `frontend/` directory with the following content:

```env
VITE_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here
```

You can get a Mapbox public access token from:  
👉 [https://account.mapbox.com/access-tokens](https://account.mapbox.com/access-tokens)

---

### 4️⃣ Start the development server

```bash
npm run dev
```

This will start the frontend on:  
👉 [http://localhost:5173](http://localhost:5173)

---

## 🧊 Notes

- Make sure the backend (FastAPI) is running to serve map layer data.
- The frontend communicates with backend endpoints for layer and shapefile access.

---

## 📄 License

This project is licensed under the **MIT License**.
