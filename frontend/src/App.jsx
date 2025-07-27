import React, { useState, useCallback, useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Map from "./components/Map";
// import ThematicMap from "./components/ThematicMap";
import Sidebar from "./components/Sidebar";
import "./styles/Sidebar.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const App = () => {
  const [mapboxMap, setMapboxMap] = useState(null);
  const mapContainerRef = useRef(null);

  const [activeLayers, setActiveLayers] = useState({}); // Track which layers are active

  // State to hold the geometry drawn by the user on the map
  const [drawnGeometry, setDrawnGeometry] = useState(null);
  const [highlightedFeatures, setHighlightedFeatures] = useState(null); // The features to highlight on the map
  const [spatialQueryResults, setSpatialQueryResults] = useState(null); // For a popup or detailed list

  // Handler to update active layers (already exists)
  const handleLayerToggle = useCallback((layerId, isSelected) => {
    setActiveLayers(prev => ({
      ...prev,
      [layerId]: isSelected
    }));
  }, []);

  // receives the geoJSON feature whenever a geometry is drawn, updated, or deleted.
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

  // Initialize Mapbox map instance
  useEffect(() => {
    // Only initialize if the map container ref is available AND map hasn't been initialized yet
    if (mapContainerRef.current && !mapboxMap) {
      console.log("App.jsx: Initializing Mapbox map into mapContainerRef.");

      const map = new mapboxgl.Map({
        container: mapContainerRef.current, 
        style: "mapbox://styles/mapbox/streets-v11", 
        center: [-160, 75],
        zoom: 3.35,
        projection: "globe", // Use 'globe' for a global view effect
      });

      map.on('load', () => {
        console.log("App.jsx: Map 'load' event fired. Setting mapboxMap state.");
        // Set fog for globe projection (optional)
        map.setFog({
          color: "white",
          "high-color": "#add8e6",
          "horizon-blend": 0.2,
          "space-color": "#000000",
          "star-intensity": 0.15,
        });
        setMapboxMap(map); // This will trigger a re-render of App and its children
      });

      map.on('error', (e) => {
        console.error("App.jsx: Mapbox Map Error Event Caught:", e);
        setMapboxMap(null); // Reset map state on error
      });

      // Cleanup function: remove map instance when component unmounts
      return () => {
        if (map) {
          console.log("App.jsx: Cleanup function running. Removing map instance.");
          map.remove();
          setMapboxMap(null); // Ensure state is reset on cleanup
        }
      };
    }
  }, []);


  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: 'hidden'}}>
      <Sidebar
        onLayerToggle={handleLayerToggle}
      />

      {/* Main Map Area Container */}
      <div style={{ flexGrow: 1, height: '100%', position: 'relative' }}>
        <div
          ref={mapContainerRef}
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        />
        
        {/* Conditional rendering for loading message OR the map UI components */}
        {!mapboxMap ? (
          // Show loading message ON TOP of the empty map container
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.9)', // Semi-transparent white overlay
            zIndex: 999, // Ensure it's above the map canvas
            color: 'black',
            fontSize: '1.5em',
          }}>
            Loading map...
          </div>
        ) : (
          <Map
            mapboxMap={mapboxMap} // pass map instance to map.jsx
            activeLayers={activeLayers}
            onDrawGeometry={handleDrawnGeometry}
            highlightedFeatures={highlightedFeatures}
          />
        )}
      </div>
    </div>
  );
};

export default App;