import React, { useState } from "react";
import Map from "./components/Map";
import Sidebar from "./components/Sidebar";
import "./components/Sidebar.css";

const App = () => {
  // Track which layers are active
  const [activeLayers, setActiveLayers] = useState({});

  // Toggle layer visibility
  const handleLayerToggle = (layerName) => {
    setActiveLayers((prev) => ({
      ...prev,
      [layerName]: !prev[layerName],
    }));
  };

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      <Sidebar activeLayers={activeLayers} onLayerToggle={handleLayerToggle} />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Map activeLayers={activeLayers} />
      </div>
    </div>
  );
};

export default App;
