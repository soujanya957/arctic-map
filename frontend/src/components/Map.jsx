import React, { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import FeatureHighlighter from './FeatureHighlighter';
import SearchBar from './SearchBar';
import DrawControls from './DrawControls';
import SpatialQueryPanel from './SpatialQueryPanel';

// these are the props sent by App.jsx
const Map = ({
  mapboxMap,
  activeLayers,
  onDrawGeometry,
  highlightedFeatures,
}) => {

  const loadingLayers = useRef(new Set());

//   // Function to apply styling (default or thematic)
//   const applyLayerStyling = useCallback((map, layerName, sourceId, layerId, geojson, thematicAttribute = null) => {
//     console.log(`Applying styling for layer: ${layerName}, Thematic Attribute: ${thematicAttribute}`);
//     console.log(`GeoJSON features count in applyLayerStyling: ${geojson.features.length}`);

//     // Remove existing layers first to ensure fresh styling
//     ["points", "lines", "polygons", "outline"].forEach((type) => {
//       const id = `${layerId}-${type}`;
//       if (map.getLayer(id)) {
//         map.removeLayer(id);
//         console.log(`Removed existing layer: ${id}`);
//       }
//     });

//     let thematicExpression = null; // Will hold the Mapbox GL JS expression for thematic styling

//     if (thematicAttribute && geojson && geojson.features.length > 0) {
//       const numericValues = geojson.features
//         .map(f => f.properties?.[thematicAttribute])
//         .filter(val => typeof val === 'number' && !isNaN(val)); // Filter out non-numeric or NaN values

//       console.log(`Thematic attribute '${thematicAttribute}' numeric values count: ${numericValues.length}`);

//       if (numericValues.length > 0) {
//         const minVal = Math.min(...numericValues);
//         const maxVal = Math.max(...numericValues);

//         console.log(`MinVal: ${minVal}, MaxVal: ${maxVal}`);

//         if (minVal !== maxVal) { // Only create interpolate expression if there's a range of values
//           thematicExpression = [
//             'interpolate',
//             ['linear'],
//             ['get', thematicAttribute],
//             minVal, '#00FF00', // Green for min value
//             maxVal, '#FF0000'  // Red for max value
//           ];
//         } else {
//             // If all numeric values are the same, use a single color, e.g., the min value color
//             thematicExpression = ['case', ['has', thematicAttribute], '#00FF00', '#808080']; // Green if attribute exists, gray otherwise
//         }
//       }
//     }
//     console.log(`Final thematicExpression for ${layerName}:`, thematicExpression);

//     // Default colors if no thematic or problematic thematic data
//     const defaultPointColor = "#ff6600"; // Orange
//     const defaultLineColor = "#0000ff"; // Blue
//     const defaultFillColor = "#ff0000"; // Red (with opacity)
//     const defaultOutlineColor = "#000000"; // Black

//     const geometryTypes = new Set(
//       geojson.features.map((f) => f.geometry?.type)
//     );

//     // Add layers with calculated styling (thematicExpression or default)
//     if (geometryTypes.has("Point") || geometryTypes.has("MultiPoint")) {
//       map.addLayer({
//         id: `${layerId}-points`,
//         type: "circle",
//         source: sourceId,
//         filter: ["==", "$type", "Point"], // RE-ENABLED FILTER
//         paint: {
//           "circle-radius": 5, // BACK TO DEFAULT SIZE
//           "circle-color": thematicExpression || defaultPointColor, // RE-ENABLED THEMATIC
//         },
//       });
//       // RE-ENABLED CLICK HANDLER
//       map.on("click", `${layerId}-points`, (e) => {
//         const props = e.features[0].properties;
//         new mapboxgl.Popup()
//           .setLngLat(e.lngLat)
//           .setHTML(`<pre>${JSON.stringify(props, null, 2)}</pre>`)
//           .addTo(map);
//       });
//     }

//     if (geometryTypes.has("LineString") || geometryTypes.has("MultiLineString")) {
//       map.addLayer({
//         id: `${layerId}-lines`,
//         type: "line",
//         source: sourceId,
//         filter: ["==", "$type", "LineString"], 
//         paint: {
//           "line-color": thematicExpression || defaultLineColor, 
//           "line-width": 2, 
//         },
//       });
//       // RE-ENABLED CLICK HANDLER
//       map.on("click", `${layerId}-lines`, (e) => {
//         const props = e.features[0].properties;
//         new mapboxgl.Popup()
//           .setLngLat(e.lngLat)
//           .setHTML(`<pre>${JSON.stringify(props, null, 2)}</pre>`)
//           .addTo(map);
//       });
//     }

//     if (geometryTypes.has("Polygon") || geometryTypes.has("MultiPolygon")) {
//       map.addLayer({
//         id: `${layerId}-polygons`,
//         type: "fill",
//         source: sourceId,
//         filter: ["==", "$type", "Polygon"], 
//         paint: {
//           "fill-color": thematicExpression || defaultFillColor, 
//           "fill-opacity": 0.35, 
//         },
//       });
//       // RE-ENABLED CLICK HANDLER
//       map.on("click", `${layerId}-polygons`, (e) => {
//         const props = e.features[0].properties;
//         new mapboxgl.Popup()
//           .setLngLat(e.lngLat)
//           .setHTML(`<pre>${JSON.stringify(props, null, 2)}</pre>`)
//           .addTo(map);
//       });

//       map.addLayer({
//         id: `${layerId}-outline`,
//         type: "line",
//         source: sourceId,
//         filter: ["==", "$type", "Polygon"], 
//         paint: {
//           "line-color": defaultOutlineColor, // Outline can remain black
//           "line-width": 1,
//         },
//       });
//     }

//     // fit bounds
//     const bounds = new mapboxgl.LngLatBounds();
//     geojson.features.forEach((feature) => {
//       const { type, coordinates } = feature.geometry;
//       if (type === "Point" || type === "MultiPoint") {
//         if (type === "Point") bounds.extend(coordinates);
//         else coordinates.forEach((coord) => bounds.extend(coord));
//       } else if (type === "LineString" || type === "MultiLineString") {
//         if (type === "LineString") coordinates.forEach((coord) => bounds.extend(coord));
//         else coordinates.forEach((line) => line.forEach((coord) => bounds.extend(coord)));
//       } else if (type === "Polygon" || type === "MultiPolygon") {
//         if (type === "Polygon") coordinates.forEach((polygon) => polygon.forEach((ring) => ring.forEach((coord) => bounds.extend(coord))));
//       }
//     });
//     if (!bounds.isEmpty()) {
//       map.fitBounds(bounds, { padding: 20 });
//     }
// }, []); 


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

  // managing active data layers in sidebar
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