import React, { useState, useCallback, useRef, useEffect } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import Map from "./components/Map";
import Sidebar from "./components/Sidebar";
import ThematicMap from "./components/ThematicMap";
import thematicMapConfigs from "./config/thematicMapConfigs";
import "./styles/Sidebar.css";
import "./styles/ThematicMap.css";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const App = () => {
  const [mapboxMap, setMapboxMap] = useState(null);
  const mapContainerRef = useRef(null);

  const [activeLayers, setActiveLayers] = useState({});
  const [drawnGeometry, setDrawnGeometry] = useState(null);
  const [highlightedFeatures, setHighlightedFeatures] = useState(null);
  const [spatialQueryResults, setSpatialQueryResults] = useState(null);

  const [isThematicMode, setIsThematicMode] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleLayerToggle = useCallback((layerId, isSelected, displayName) => {
    setActiveLayers(prev => ({
      ...prev,
      [layerId]: {
        isSelected,
        displayName
      }
    }));
  }, []);

  const handleThematicModeToggle = useCallback(() => {
    setIsThematicMode(prevMode => !prevMode);
    setDrawnGeometry(null);
    setHighlightedFeatures(null);
    setSpatialQueryResults(null);
    setActiveLayers({});
  }, []);

  const toggleSidebar = useCallback(() => {
    setIsSidebarOpen(prev => !prev);
  }, []);

  useEffect(() => {
    if (mapboxMap && mapContainerRef.current) {
      const resizeMap = () => {
        mapboxMap.resize();
      };
      const id = requestAnimationFrame(resizeMap);
      return () => cancelAnimationFrame(id);
    }
  }, [mapboxMap, isThematicMode, isSidebarOpen]);

  const handleDrawnGeometry = useCallback(async (geometry) => {
    setDrawnGeometry(geometry);

    if (geometry) {
      const userSelectedLayers = Object.keys(activeLayers).filter(key => activeLayers[key]);

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
                drawn_boundary: geometry,
                target_layers: userSelectedLayers,
            }),
        });

        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }

        const data = await response.json();
        const queriedFeatures = data.features || [];
        setSpatialQueryResults(queriedFeatures);
        setHighlightedFeatures(queriedFeatures);
      } catch (error) {
          console.error('Error during spatial query:', error);
          setSpatialQueryResults(null);
          setHighlightedFeatures(null);
      }
    } else {
      setSpatialQueryResults(null);
      setHighlightedFeatures(null);
    }
  }, [activeLayers]);

  useEffect(() => {
    if (mapContainerRef.current && !mapboxMap) {
      const map = new mapboxgl.Map({
        container: mapContainerRef.current, 
        style: "mapbox://styles/mapbox/streets-v11", 
        center: [-160, 75],
        zoom: 3.35,
        projection: "globe", 
      });

      map.on('load', () => {
        map.setFog({
          color: "white",
          "high-color": "#add8e6",
          "horizon-blend": 0.2,
          "space-color": "#000000",
          "star-intensity": 0.15,
        });
        setMapboxMap(map); 
      });
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
      
      {!isThematicMode && (
        <Sidebar
          onLayerToggle={handleLayerToggle}
          isThematicMode={isThematicMode}
          onThematicModeToggle={handleThematicModeToggle}
          isSidebarOpen={isSidebarOpen}
        />
      )}

      <div style={{ flexGrow: 1, height: '100%', position: 'relative' }}>
        <div
          ref={mapContainerRef}
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        />

        {!isThematicMode && (
          <div
            className={`sidebar-toggle-button ${isSidebarOpen ? 'is-open' : 'is-closed'}`}
            onClick={toggleSidebar}
          >
            {isSidebarOpen ? '❮' : '❯'}
          </div>
        )}
        
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
            {!isThematicMode ? (
              <Map
                mapboxMap={mapboxMap}
                activeLayers={activeLayers}
                onDrawGeometry={handleDrawnGeometry}
                highlightedFeatures={highlightedFeatures}
                isSidebarOpen={isSidebarOpen} // ⬅️ NEW: Pass sidebar state to Map
              />
            ) : (
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