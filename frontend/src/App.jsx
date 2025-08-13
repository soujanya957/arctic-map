import React, { useState, useCallback, useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Map from "./components/Map";
import Sidebar from "./components/Sidebar";
import ThematicMap from "./components/ThematicMap";
import thematicMapConfigs from "./config/thematicMapConfigs";
import "./styles/Sidebar.css";
import "./styles/ThematicMap.css";

// Set Mapbox access token from environment variables
mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const App = () => {
  const [mapboxMap, setMapboxMap] = useState(null); // Stores the Mapbox GL JS map instance
  const mapContainerRef = useRef(null); // DOM reference for the map container

  // Tracks which layers are currently active/visible on the map
  const [activeLayers, setActiveLayers] = useState({}); 
  
  // Spatial query related state
  const [drawnGeometry, setDrawnGeometry] = useState(null); // Stores user-drawn geometry for spatial queries
  const [highlightedFeatures, setHighlightedFeatures] = useState(null); // Features to highlight on the map
  const [spatialQueryResults, setSpatialQueryResults] = useState(null); // Results from spatial queries

  // UI state management
  const [isThematicMode, setIsThematicMode] = useState(false); // Toggle between main map and thematic map views
  const [isSidebarOpen, setIsSidebarOpen] = useState(true); // Controls sidebar visibility

  // Handle layer toggle events from the sidebar
  // When user checks/unchecks a layer checkbox, this updates the activeLayers state
  const handleLayerToggle = useCallback((layerId, isSelected) => {
    setActiveLayers(prev => ({
      ...prev,
      [layerId]: isSelected  // Store boolean directly to indicate if layer should be visible
    }));
  }, []);

  // Toggle between main map and thematic map modes
  // Clears all current selections and queries when switching modes
  const handleThematicModeToggle = useCallback(() => {
    setIsThematicMode(prevMode => !prevMode);
    // Clear all current state when switching modes
    setDrawnGeometry(null);
    setHighlightedFeatures(null);
    setSpatialQueryResults(null);
    setActiveLayers({});
  }, []);

  // Toggle sidebar visibility (collapse/expand)
  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  // Handle map resize when UI elements change
  // Ensures the map renders correctly when sidebar is toggled or thematic mode changes
  useEffect(() => {
    if (mapboxMap && mapContainerRef.current) {
      const resizeMap = () => {
        mapboxMap.resize();
      };
      const id = requestAnimationFrame(resizeMap);
      return () => cancelAnimationFrame(id);
    }
  }, [mapboxMap, isThematicMode, isSidebarOpen]);

  // Handle spatial query operations when user draws geometry on the map
  const handleDrawnGeometry = useCallback(async (geometry) => {
    setDrawnGeometry(geometry);

    if (geometry) {
      // Find all currently active layers to query against
      const userSelectedLayers = Object.keys(activeLayers).filter(key => activeLayers[key] === true);

      if (userSelectedLayers.length === 0) {
        console.warn("No active layers to perform spatial query against.");
        return;
      }

      try {
        // Send spatial query request to backend API
        const response = await fetch('http://localhost:8000/api/spatial-query', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                drawn_boundary: geometry,
                target_layers: userSelectedLayers,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const queriedFeatures = data.features || [];
        // Update state with query results for highlighting and display
        setSpatialQueryResults(queriedFeatures);
        setHighlightedFeatures(queriedFeatures);
      } catch (error) {
          console.error('Error during spatial query:', error);
          // Clear results on error
          setSpatialQueryResults(null);
          setHighlightedFeatures(null);
      }
    } else {
      // Clear query results when no geometry is drawn
      setSpatialQueryResults(null);
      setHighlightedFeatures(null);
    }
  }, [activeLayers]);

  // Initialize the Mapbox map instance
  // This effect runs once when the component mounts
  useEffect(() => {
    if (mapContainerRef.current && !mapboxMap) {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current, 
        style: "mapbox://styles/mapbox/streets-v11", // Base map style
        center: [-160, 75], // Initial center coordinates (Arctic region)
        zoom: 3.35, // Initial zoom level
        projection: "globe", // Use globe projection for better Arctic visualization
      });

      // Configure map appearance once it loads
      map.on('load', () => {
        // Add atmospheric fog effect for globe view
        map.setFog({
          color: "white",
          "high-color": "#add8e6",
          "horizon-blend": 0.2,
          "space-color": "#000000",
          "star-intensity": 0.15,
        });
        setMapboxMap(map); // Store map instance in state
      });

      // Cleanup function to remove map when component unmounts
      return () => {
        if (map) {
          map.remove();
          setMapboxMap(null);
        }
      };
    }
  }, []);

  return (
    <div style={{ display: "flex", height: "100vh", width: "100vw", overflow: 'hidden'}}>
      
      {/* Render sidebar only in main map mode (not in thematic mode) */}
      {!isThematicMode && (
        <Sidebar
          onLayerToggle={handleLayerToggle}
          isThematicMode={isThematicMode}
          onThematicModeToggle={handleThematicModeToggle}
          isSidebarOpen={isSidebarOpen}
        />
      )}

      {/* Main map container */}
      <div style={{ flexGrow: 1, height: '100%', position: 'relative' }}>
        {/* Mapbox GL JS map container */}
        <div
          ref={mapContainerRef}
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        />

        {/* Sidebar toggle button (only visible in main map mode) */}
        {!isThematicMode && (
          <div
            className={`sidebar-toggle-button ${isSidebarOpen ? 'is-open' : 'is-closed'}`}
            onClick={toggleSidebar}
          >
            {isSidebarOpen ? '◀' : '▶'}
          </div>
        )}
        
        {/* Thematic mode toggle (only visible when in thematic mode) */}
        {mapboxMap && isThematicMode && (
          <div className="thematic-mode-toggle-standalone">
            <label htmlFor="thematic-mode-toggle" className="toggle-switch">
              <input
                type="checkbox"
                id="thematic-mode-toggle"
                checked={isThematicMode}
                onChange={handleThematicModeToggle}
              />
              <span className="slider"></span>
            </label>
            <span className="toggle-label-text">
              {isThematicMode ? "Switch to Main Map" : "Switch to Thematic Map"}
            </span>
          </div>
        )}

        {/* Loading indicator while map initializes */}
        {!mapboxMap ? (
          <div style={{
            position: 'absolute',
            top: 0, left: 0, right: 0, bottom: 0,
            display: 'flex',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'rgba(255, 255, 255, 0.69)',
            zIndex: 999,
            color: 'black',
            fontSize: '1.5em',
          }}>
            Loading map...
          </div>
        ) : (
          <>
            {/* Render appropriate map component based on current mode */}
            {!isThematicMode ? (
              // Main map with layer management and spatial query functionality
              <Map
                mapboxMap={mapboxMap}
                activeLayers={activeLayers}
                onDrawGeometry={handleDrawnGeometry}
                highlightedFeatures={highlightedFeatures}
                isSidebarOpen={isSidebarOpen}
              />
            ) : (
              // Thematic map for data visualization
              <ThematicMap
                mapboxMap={mapboxMap}
              />
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default App;