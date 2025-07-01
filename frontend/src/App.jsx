import React, { useState, useCallback } from "react";
import Map from "./components/Map";
import Sidebar from "./components/Sidebar";
import "./components/Sidebar.css";

const App = () => {
  // Track which layers are active
  const [activeLayers, setActiveLayers] = useState({});

  // State to hold the geometry drawn by the user on the map
  const [drawnGeometry, setDrawnGeometry] = useState(null);

  // Toggle layer visibility
  const handleLayerToggle = useCallback((layerName) => {
    setActiveLayers((prev) => ({
      ...prev,
      [layerName]: !prev[layerName],
    }));
  }, []);

  // This function receives the geoJSON feature whenever a geometry is drawn, updated, or deleted.
  const handleDrawnGeometry = useCallback((geometry) => {
    console.log("Drawn geometry received in App.jsx:", geometry);
    setDrawnGeometry(geometry); // Store the drawn geometry in App's state
  }, [activeLayers]);

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      <Sidebar activeLayers={activeLayers} onLayerToggle={handleLayerToggle} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Map 
          activeLayers={activeLayers} 
          onDrawGeometry={handleDrawnGeometry}
        />
      </div>
    </div>
  );
};

export default App;
