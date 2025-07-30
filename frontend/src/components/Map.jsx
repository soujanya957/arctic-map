import React, { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import FeatureHighlighter from './FeatureHighlighter';
import SearchBar from './SearchBar';
import DrawControls from './DrawControls';
import SpatialQueryPanel from './SpatialQueryPanel';

const Map = ({
  mapboxMap,
  activeLayers,
  onDrawGeometry,
  highlightedFeatures,
}) => {

  const loadingLayers = useRef(new Set());

  const addLayerToMap = useCallback((layerName, geojson) => {
    if (!mapboxMap) {
      console.warn("addLayerToMap: mapboxMap is not available. Cannot add layer.");
      return;
    }

    const sourceId = `source-${layerName}`;
    const layerId = `layer-${layerName}`;

    // If source already exists, just return (layer might be hidden, or already processed)
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

  // Add layers for polygons, lines, points
    if (validFeatures.some(f => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'))) {
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

      // view attribute popup when user clicks on polygons
      mapboxMap.on("click", `${layerId}-polygons`, (e) => {
        const props = e.features[0].properties;
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<pre>${JSON.stringify(props, null, 2)}</pre>`)
          .addTo(mapboxMap);
      });
    }

    if (validFeatures.some(f => f.geometry && (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString'))) {
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

      // view attribute popup when user clicks on lines
      mapboxMap.on("click", `${layerId}-lines`, (e) => {
        const props = e.features[0].properties;
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<pre>${JSON.stringify(props, null, 2)}</pre>`)
          .addTo(mapboxMap);
      });
    }

    if (validFeatures.some(f => f.geometry && (f.geometry.type === 'Point' || f.geometry.type === 'MultiPoint'))) {
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

      // view attribute popup when user clicks on points
      mapboxMap.on("click", `${layerId}-points`, (e) => {
        const props = e.features[0].properties;
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<pre>${JSON.stringify(props, null, 2)}</pre>`)
          .addTo(mapboxMap);
      });
    }

    console.log(`Layer ${layerName} added to map.`);
  }, [mapboxMap]);


  // when users uncheck layers
  const removeLayerFromMap = useCallback((layerName) => {
    if (!mapboxMap) return;

    const sourceId = `source-${layerName}`;
    const layerId = `layer-${layerName}`;

    [`${layerId}-polygons`, `${layerId}-outline`, `${layerId}-lines`, `${layerId}-points`].forEach(id => {
      if (mapboxMap.getLayer(id)) {
        mapboxMap.removeLayer(id);
        console.log(`Removed layer: ${id}`);
      }
    });

    if (mapboxMap.getSource(sourceId)) {
      mapboxMap.removeSource(sourceId);
      console.log(`Removed source: ${sourceId}`);
    }
  }, [mapboxMap]);

  // manages active data layers in sidebar
  useEffect(() => {
    if (!mapboxMap) return;

    Object.entries(activeLayers).forEach(([layerName, isActive]) => {
      const sourceId = `source-${layerName}`;
      if (isActive) {
        if (!mapboxMap.getSource(sourceId) && !loadingLayers.current.has(layerName)) {
          loadingLayers.current.add(layerName);
          console.log(`Attempting to fetch GeoJSON for layer: ${layerName}`);
          fetch(`http://localhost:8000/api/geojson/${layerName}`)
            .then((res) => {
              if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
              return res.json();
            })
            .then((response) => {
              const geojson = response;
              if (!geojson || !geojson.features || geojson.features.length === 0) {
                console.warn(`GeoJSON for ${layerName} has no features or is malformed.`);
                return;
              }
              addLayerToMap(layerName, geojson);
            })
            .catch((err) => console.error(`Failed to load ${layerName}:`, err))
            .finally(() => loadingLayers.current.delete(layerName));
        }
      } else {
        removeLayerFromMap(layerName);
      }
    });

    // Cleanup function when Map.jsx component unmounts
    return () => {
      if (mapboxMap) {
        // Iterate over ALL active layers and ensure they are removed from the map
        const layerIdsToRemove = new Set();
        const sourceIdsToRemove = new Set();

        // Collect IDs based on the naming convention used by this component
        Object.keys(activeLayers).forEach(layerName => {
          layerIdsToRemove.add(`layer-${layerName}-polygons`);
          layerIdsToRemove.add(`layer-${layerName}-outline`);
          layerIdsToRemove.add(`layer-${layerName}-lines`);
          layerIdsToRemove.add(`layer-${layerName}-points`);
          sourceIdsToRemove.add(`source-${layerName}`);
        });

        // Execute removal
        layerIdsToRemove.forEach(id => {
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
  }, [activeLayers, addLayerToMap, removeLayerFromMap, mapboxMap]);

  return (
    <>
      {/* User interface controls - Position them individually */}
      {mapboxMap && (
          <SearchBar map={mapboxMap} />
      )}

      {mapboxMap && (
          <DrawControls map={mapboxMap} onDrawGeometry={onDrawGeometry} />
      )}

      {/* Highlighting features - This component doesn't render any visible UI, it just adds map layers */}
      {mapboxMap && <FeatureHighlighter mapboxMap={mapboxMap} highlightedFeatures={highlightedFeatures} />}

      {/* Spatial query results and download panel */}
      {mapboxMap && highlightedFeatures && highlightedFeatures.length > 0 && (
          <SpatialQueryPanel highlightedFeatures={highlightedFeatures} />
      )}
    </>
  );
};

export default Map;