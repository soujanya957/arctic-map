import React, { useState, useCallback } from "react";
import Map from "./components/Map";
import Sidebar from "./components/Sidebar";
import "./styles/Sidebar.css";

const App = () => {
  // Track which layers are active
  const [activeLayers, setActiveLayers] = useState({});

  // State to hold the geometry drawn by the user on the map
  const [drawnGeometry, setDrawnGeometry] = useState(null);
  const [spatialQueryResults, setSpatialQueryResults] = useState(null); // For a popup or detailed list
  const [highlightedFeatures, setHighlightedFeatures] = useState(null); // The features to highlight on the map
  const [activeThematicLayerConfig, setActiveThematicLayerConfig] = useState(null);
  const [selectedThematicAttribute, setSelectedThematicAttribute] = useState('');

  // Handler to update active layers (already exists)
  const handleLayerToggle = (layerId, isSelected) => {
    setActiveLayers(prev => ({
      ...prev,
      [layerId]: isSelected
    }));
    // If a layer is deselected, and it was the active thematic layer, clear thematic config
    if (!isSelected && activeThematicLayerConfig && activeThematicLayerConfig.id === layerId) {
      setActiveThematicLayerConfig(null);
      setSelectedThematicAttribute('');
    }
  };

  // handler for when Sidebar.jsx tells App.jsx about active thematic layer configuration
  const handleActiveThematicLayerChange = (config) => {
    setActiveThematicLayerConfig(config);
  };

  // handler for when Sidebar.jsx tells App.jsx about the user's selected thematic attribute
  const handleThematicAttributeChange = (attributeId) => {
    setSelectedThematicAttribute(attributeId);
  };


  // This function receives the geoJSON feature whenever a geometry is drawn, updated, or deleted.
  const handleDrawnGeometry = useCallback(async (geometry) => {
    setDrawnGeometry(geometry); // Store the user's drawn geometry in App's state

    if (geometry) {
      const userSelectedLayers = Object.keys(activeLayers).filter(key => activeLayers[key]);

      // first, check if user hasn't even selected any layers
      if (userSelectedLayers.length === 0) {
        console.warn("No active layers to perform spatial query against.");
        return;
      }

      try {
        const response = await fetch('http://localhost:8000/api/spatial-query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                drawn_boundary: geometry, // Send the drawn GeoJSON feature
                target_layers: userSelectedLayers, // Send array of active layer names
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const queriedFeatures = data.features || []; // Ensure it's an array

        console.log('Spatial query results (intersecting features):', queriedFeatures);

        // Pass these features to the map for highlighting
        setSpatialQueryResults(queriedFeatures); // Example: store for a popup or list
        setHighlightedFeatures(queriedFeatures); // This is what Map.jsx will use for highlighting

      } catch (error) {
          console.error('Error during spatial query:', error);
          // Handle error, e.g., show an error message to the user
          setSpatialQueryResults(null);
          setHighlightedFeatures(null);
      }
    } else { // if user's cleared the drawing or exited draw mode, then clear the results and highlighting
      setSpatialQueryResults(null);
      setHighlightedFeatures(null);
    }
  }, [activeLayers]);

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw" }}>
      <Sidebar
        onLayerToggle={handleLayerToggle}
        onThematicAttributeChange={handleThematicAttributeChange}
        onActiveThematicLayerChange={handleActiveThematicLayerChange}
      />
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
        <Map
          activeLayers={activeLayers}
          onDrawGeometry={handleDrawnGeometry}
          highlightedFeatures={highlightedFeatures}
          // ADD THESE NEW PROPS:
          activeThematicLayerConfig={activeThematicLayerConfig}
          selectedThematicAttribute={selectedThematicAttribute}
        />
      </div>
    </div>
  );
};

export default App;