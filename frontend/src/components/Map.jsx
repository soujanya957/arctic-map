import React, { useEffect, useRef, useCallback } from "react";
import * as mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import FeatureHighlighter from './FeatureHighlighter';
import SearchBar from './SearchBar';
import DrawControls from './DrawControls';
import SpatialQueryPanel from './SpatialQueryPanel';
import bbox from '@turf/bbox';

const Map = ({
  mapboxMap,
  activeLayers,
  onDrawGeometry,
  highlightedFeatures,
}) => {

  const loadingLayers = useRef(new Set()); // tracks user's most recently checked layer, fetching from backend API
  const clickListeners = useRef(new window.Map()); // Store references to click listeners
  const prevActiveLayers = useRef({}); // Track previous state to detect changes
  
  // This function adds a click event listener to a layer to show a popup
  const addPopupClickListeners = useCallback((layerId, layerName) => {
    if (!mapboxMap) return;

    // Remove any existing listener to prevent duplicates
    if (clickListeners.current.has(layerId)) {
      const existingListener = clickListeners.current.get(layerId);
      mapboxMap.off("click", layerId, existingListener);
    }

    const onClick = (e) => {
        // Prevent default behavior to avoid interfering with other events
        e.preventDefault(); 
        
        // Use the first feature in the array for the popup
        const feature = e.features[0];
        if (!feature) return;

        // Get properties and filter out Mapbox-specific ones
        const properties = Object.entries(feature.properties)
            .filter(([key, value]) => !key.startsWith('_'))
            .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
        
        // Format properties for display
        const displayProps = Object.entries(properties)
            .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
            .join('<br>');
        
        new mapboxgl.Popup()
            .setLngLat(e.lngLat)
            .setHTML(`
                <div style="max-height: 250px; overflow-y: auto; padding-right: 10px;">
                    <h4>Layer: ${layerName}</h4>
                    <p>${displayProps}</p>
                </div>
            `)
            .addTo(mapboxMap);
    };

    // Store the listener reference
    clickListeners.current.set(layerId, onClick);
    mapboxMap.on("click", layerId, onClick);

    // Return cleanup function
    return () => {
      if (clickListeners.current.has(layerId)) {
        mapboxMap.off("click", layerId, clickListeners.current.get(layerId));
        clickListeners.current.delete(layerId);
      }
    };
  }, [mapboxMap]);

  // This is the core function for adding a new layer to the map
  const addLayerToMap = useCallback((layerName, geojson) => {
    if (!mapboxMap) {
      console.warn("addLayerToMap: mapboxMap is not available. Cannot add layer.");
      return;
    }

    const sourceId = `source-${layerName}`;
    const layerId = `layer-${layerName}`;
    
    if (mapboxMap.getSource(sourceId)) {
      console.log(`Source ${sourceId} already exists for layer ${layerName}.`);
      return;
    }

    const validFeatures = geojson.features.filter(
      (f) => f.geometry && f.geometry.coordinates
    );

    if (validFeatures.length === 0) {
      console.warn(`Layer ${layerName} has no valid features. Skipping.`);
      return;
    }
    const cleanedGeojson = { ...geojson, features: validFeatures };

    mapboxMap.addSource(sourceId, {
      type: "geojson",
      data: cleanedGeojson,
    });

    const layerTypes = new Set(validFeatures.map(f => f.geometry.type));
    
    // Add layers for polygons, lines, points and their click listeners
    if (layerTypes.has("Polygon") || layerTypes.has("MultiPolygon")) {
      mapboxMap.addLayer({
        id: `${layerId}-polygons`,
        type: "fill",
        source: sourceId,
        filter: ["==", "$type", "Polygon"],
        paint: {
          "fill-color": "#007bff",
          "fill-opacity": 0.35,
        },
      });
      mapboxMap.addLayer({
        id: `${layerId}-outline`,
        type: "line",
        source: sourceId,
        filter: ["==", "$type", "Polygon"],
        paint: {
          "line-color": "#0056b3",
          "line-width": 2,
        },
      });
      addPopupClickListeners(`${layerId}-polygons`, layerName);
    }
    
    if (layerTypes.has("LineString") || layerTypes.has("MultiLineString")) {
      mapboxMap.addLayer({
        id: `${layerId}-lines`,
        type: "line",
        source: sourceId,
        filter: ["==", "$type", "LineString"],
        paint: {
          "line-color": "#28a745",
          "line-width": 3,
        },
      });
      addPopupClickListeners(`${layerId}-lines`, layerName);
    }
    
    if (layerTypes.has("Point") || layerTypes.has("MultiPoint")) {
      mapboxMap.addLayer({
        id: `${layerId}-points`,
        type: "circle",
        source: sourceId,
        filter: ["==", "$type", "Point"],
        paint: {
          "circle-radius": 6,
          "circle-color": "#dc3545",
          "circle-stroke-color": "#a71d2a",
          "circle-stroke-width": 2,
        },
      });
      addPopupClickListeners(`${layerId}-points`, layerName);
    }

    // Fit map view to the bounding box of the user's most recently selected layer's features
    const allFeatures = cleanedGeojson.features;
    if (allFeatures.length > 0) {
      const bounds = bbox({
        type: 'FeatureCollection',
        features: allFeatures,
      });

      mapboxMap.fitBounds(bounds, {
        padding: 50,
        maxZoom: 10,
        duration: 1500,
      });
    }
  }, [mapboxMap, addPopupClickListeners]);

  // when users uncheck layers
  const removeLayerFromMap = useCallback((layerName) => {
    if (!mapboxMap) return;

    const sourceId = `source-${layerName}`;
    const layerId = `layer-${layerName}`;
    
    // An array of all layer IDs that might exist for this layer name
    const allLayerIds = [
      `${layerId}-polygons`,
      `${layerId}-outline`,
      `${layerId}-lines`,
      `${layerId}-points`
    ];

    allLayerIds.forEach(id => {
      // Remove the click listener properly
      if (clickListeners.current.has(id)) {
        const listener = clickListeners.current.get(id);
        mapboxMap.off("click", id, listener);
        clickListeners.current.delete(id);
      }
      
      if (mapboxMap.getLayer(id)) {
        mapboxMap.removeLayer(id);
      }
    });

    if (mapboxMap.getSource(sourceId)) {
      mapboxMap.removeSource(sourceId);
    }
  }, [mapboxMap]);

  // manages active data layers in sidebar 
  useEffect(() => {
    if (!mapboxMap) return;

    // Get the previous state
    const prevLayers = prevActiveLayers.current;
    
    // Find layers that changed state
    const layersToAdd = [];
    const layersToRemove = [];
    
    // Check each layer in current activeLayers
    Object.entries(activeLayers).forEach(([layerName, isActive]) => {
      const wasActive = prevLayers[layerName] || false;
      
      if (isActive && !wasActive) {
        // Layer was turned on
        layersToAdd.push(layerName);
      } else if (!isActive && wasActive) {
        // Layer was turned off
        layersToRemove.push(layerName);
      }
    });
    
    // Check for layers that were removed from activeLayers entirely
    Object.entries(prevLayers).forEach(([layerName, wasActive]) => {
      if (wasActive && !(layerName in activeLayers)) {
        layersToRemove.push(layerName);
      }
    });

    // Remove layers that should be removed
    layersToRemove.forEach(layerName => {
      const sourceId = `source-${layerName}`;
      const layerId = `layer-${layerName}`;
      
      const allLayerIds = [
        `${layerId}-polygons`,
        `${layerId}-outline`,
        `${layerId}-lines`,
        `${layerId}-points`
      ];

      allLayerIds.forEach(id => {
        if (clickListeners.current.has(id)) {
          const listener = clickListeners.current.get(id);
          mapboxMap.off("click", id, listener);
          clickListeners.current.delete(id);
        }
        
        if (mapboxMap.getLayer(id)) {
          mapboxMap.removeLayer(id);
        }
      });

      if (mapboxMap.getSource(sourceId)) {
        mapboxMap.removeSource(sourceId);
      }
    });

    // Add layers that should be added
    layersToAdd.forEach(layerName => {
      const sourceId = `source-${layerName}`;
      
      if (!mapboxMap.getSource(sourceId) && !loadingLayers.current.has(layerName)) {
        loadingLayers.current.add(layerName);
        
        fetch(`http://localhost:8000/api/geojson/${layerName}`)
          .then((res) => {
            if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
            return res.json();
          })
          .then((geojson) => {
            // Check if layer is still supposed to be active and doesn't already exist
            if (activeLayers[layerName] && !mapboxMap.getSource(sourceId)) {
              const validFeatures = geojson.features.filter(
                (f) => f.geometry && f.geometry.coordinates
              );

              if (validFeatures.length === 0) {
                console.warn(`Layer ${layerName} has no valid features. Skipping.`);
                return;
              }
              
              const cleanedGeojson = { ...geojson, features: validFeatures };

              mapboxMap.addSource(sourceId, {
                type: "geojson",
                data: cleanedGeojson,
              });

              const layerTypes = new Set(validFeatures.map(f => f.geometry.type));
              const layerId = `layer-${layerName}`;
              
              // Add layers for polygons, lines, points and their click listeners
              if (layerTypes.has("Polygon") || layerTypes.has("MultiPolygon")) {
                mapboxMap.addLayer({
                  id: `${layerId}-polygons`,
                  type: "fill",
                  source: sourceId,
                  filter: ["==", "$type", "Polygon"],
                  paint: {
                    "fill-color": "#007bff",
                    "fill-opacity": 0.35,
                  },
                });
                mapboxMap.addLayer({
                  id: `${layerId}-outline`,
                  type: "line",
                  source: sourceId,
                  filter: ["==", "$type", "Polygon"],
                  paint: {
                    "line-color": "#0056b3",
                    "line-width": 2,
                  },
                });
                
                // Add click listener for polygons
                const onClick = (e) => {
                  e.preventDefault();
                  const feature = e.features[0];
                  if (!feature) return;

                  const properties = Object.entries(feature.properties)
                      .filter(([key, value]) => !key.startsWith('_'))
                      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
                  
                  const displayProps = Object.entries(properties)
                      .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                      .join('<br>');
                  
                  new mapboxgl.Popup()
                      .setLngLat(e.lngLat)
                      .setHTML(`
                          <div style="max-height: 250px; overflow-y: auto; padding-right: 10px;">
                              <h4>Layer: ${layerName}</h4>
                              <p>${displayProps}</p>
                          </div>
                      `)
                      .addTo(mapboxMap);
                };
                
                clickListeners.current.set(`${layerId}-polygons`, onClick);
                mapboxMap.on("click", `${layerId}-polygons`, onClick);
              }
              
              if (layerTypes.has("LineString") || layerTypes.has("MultiLineString")) {
                mapboxMap.addLayer({
                  id: `${layerId}-lines`,
                  type: "line",
                  source: sourceId,
                  filter: ["==", "$type", "LineString"],
                  paint: {
                    "line-color": "#28a745",
                    "line-width": 3,
                  },
                });
                
                // Add click listener for lines
                const onClick = (e) => {
                  e.preventDefault();
                  const feature = e.features[0];
                  if (!feature) return;

                  const properties = Object.entries(feature.properties)
                      .filter(([key, value]) => !key.startsWith('_'))
                      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
                  
                  const displayProps = Object.entries(properties)
                      .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                      .join('<br>');
                  
                  new mapboxgl.Popup()
                      .setLngLat(e.lngLat)
                      .setHTML(`
                          <div style="max-height: 250px; overflow-y: auto; padding-right: 10px;">
                              <h4>Layer: ${layerName}</h4>
                              <p>${displayProps}</p>
                          </div>
                      `)
                      .addTo(mapboxMap);
                };
                
                clickListeners.current.set(`${layerId}-lines`, onClick);
                mapboxMap.on("click", `${layerId}-lines`, onClick);
              }
              
              if (layerTypes.has("Point") || layerTypes.has("MultiPoint")) {
                mapboxMap.addLayer({
                  id: `${layerId}-points`,
                  type: "circle",
                  source: sourceId,
                  filter: ["==", "$type", "Point"],
                  paint: {
                    "circle-radius": 6,
                    "circle-color": "#dc3545",
                    "circle-stroke-color": "#a71d2a",
                    "circle-stroke-width": 2,
                  },
                });
                
                // Add click listener for points
                const onClick = (e) => {
                  e.preventDefault();
                  const feature = e.features[0];
                  if (!feature) return;

                  const properties = Object.entries(feature.properties)
                      .filter(([key, value]) => !key.startsWith('_'))
                      .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {});
                  
                  const displayProps = Object.entries(properties)
                      .map(([key, value]) => `<strong>${key}:</strong> ${value}`)
                      .join('<br>');
                  
                  new mapboxgl.Popup()
                      .setLngLat(e.lngLat)
                      .setHTML(`
                          <div style="max-height: 250px; overflow-y: auto; padding-right: 10px;">
                              <h4>Layer: ${layerName}</h4>
                              <p>${displayProps}</p>
                          </div>
                      `)
                      .addTo(mapboxMap);
                };
                
                clickListeners.current.set(`${layerId}-points`, onClick);
                mapboxMap.on("click", `${layerId}-points`, onClick);
              }

              // Fit map view to the bounding box of the most recently selected layer's features
              const allFeatures = cleanedGeojson.features;
              if (allFeatures.length > 0) {
                const bounds = bbox({
                  type: 'FeatureCollection',
                  features: allFeatures,
                });

                mapboxMap.fitBounds(bounds, {
                  padding: 50,
                  maxZoom: 10,
                  duration: 1500,
                });
              }
            }
          })
          .catch((err) => console.error(`Failed to load ${layerName}:`, err))
          .finally(() => loadingLayers.current.delete(layerName));
      }
    });

    // Update the previous state
    prevActiveLayers.current = { ...activeLayers };

  }, [activeLayers, mapboxMap]); // Removed addLayerToMap and removeLayerFromMap from dependencies

  // Cleanup function when Map.jsx component unmounts
  useEffect(() => {
    return () => {
      if (mapboxMap) {
        const layerIdsToRemove = new Set();
        const sourceIdsToRemove = new Set();

        Object.keys(activeLayers).forEach(layerName => {
          layerIdsToRemove.add(`layer-${layerName}-polygons`);
          layerIdsToRemove.add(`layer-${layerName}-outline`);
          layerIdsToRemove.add(`layer-${layerName}-lines`);
          layerIdsToRemove.add(`layer-${layerName}-points`);
          sourceIdsToRemove.add(`source-${layerName}`);
        });

        layerIdsToRemove.forEach(id => {
          // Remove listener properly
          if (clickListeners.current.has(id)) {
            const listener = clickListeners.current.get(id);
            mapboxMap.off("click", id, listener);
            clickListeners.current.delete(id);
          }
          if (mapboxMap.getLayer(id)) {
            mapboxMap.removeLayer(id);
          }
        });
        sourceIdsToRemove.forEach(id => {
          if (mapboxMap.getSource(id)) {
            mapboxMap.removeSource(id);
          }
        });

        // Ensure any open popups are closed
        const existingPopups = mapboxMap._popups || [];
        while (existingPopups.length > 0) {
            existingPopups[0].remove();
        }
      }
    };
  }, []); // Empty dependency array for cleanup only

  return (
    <>
      {mapboxMap && (
          <SearchBar map={mapboxMap} />
      )}

      {mapboxMap && (
          <DrawControls map={mapboxMap} onDrawGeometry={onDrawGeometry} />
      )}

      {mapboxMap && <FeatureHighlighter mapboxMap={mapboxMap} highlightedFeatures={highlightedFeatures} />}

      {mapboxMap && highlightedFeatures && highlightedFeatures.length > 0 && (
          <SpatialQueryPanel highlightedFeatures={highlightedFeatures} />
      )}
    </>
  );
};

export default Map;