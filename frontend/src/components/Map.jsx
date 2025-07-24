import React, { useEffect, useRef, useCallback, useState} from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { flatten } from "@turf/turf"; // Keep flatten for now if your data needs it, but we're passing original geojson for now
import FeatureHighlighter from './FeatureHighlighter';
import SearchBar from './SearchBar';
import DrawControls from './DrawControls';
import SpatialQueryPanel from './SpatialQueryPanel';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// these are the props sent by App.jsx
const Map = ({
  activeLayers,
  onDrawGeometry,
  highlightedFeatures,
  activeThematicLayerConfig, 
  selectedThematicAttribute, 
}) => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const loadingLayers = useRef(new Set());
  const [mapboxMap, setMapboxMap] = useState(null);

  // Function to apply styling (default or thematic)
  const applyLayerStyling = useCallback((map, layerName, sourceId, layerId, geojson, thematicAttribute = null) => {
    console.log(`Applying styling for layer: ${layerName}, Thematic Attribute: ${thematicAttribute}`);
    console.log(`GeoJSON features count in applyLayerStyling: ${geojson.features.length}`);

    // Remove existing layers first to ensure fresh styling
    ["points", "lines", "polygons", "outline"].forEach((type) => {
      const id = `${layerId}-${type}`;
      if (map.getLayer(id)) {
        map.removeLayer(id);
        console.log(`Removed existing layer: ${id}`);
      }
    });

    let thematicExpression = null; // Will hold the Mapbox GL JS expression for thematic styling

    if (thematicAttribute && geojson && geojson.features.length > 0) {
      const numericValues = geojson.features
        .map(f => f.properties?.[thematicAttribute])
        .filter(val => typeof val === 'number' && !isNaN(val)); // Filter out non-numeric or NaN values

      console.log(`Thematic attribute '${thematicAttribute}' numeric values count: ${numericValues.length}`);

      if (numericValues.length > 0) {
        const minVal = Math.min(...numericValues);
        const maxVal = Math.max(...numericValues);

        console.log(`MinVal: ${minVal}, MaxVal: ${maxVal}`);

        if (minVal !== maxVal) { // Only create interpolate expression if there's a range of values
          thematicExpression = [
            'interpolate',
            ['linear'],
            ['get', thematicAttribute],
            minVal, '#00FF00', // Green for min value
            maxVal, '#FF0000'  // Red for max value
          ];
        } else {
            // If all numeric values are the same, use a single color, e.g., the min value color
            thematicExpression = ['case', ['has', thematicAttribute], '#00FF00', '#808080']; // Green if attribute exists, gray otherwise
        }
      }
    }
    console.log(`Final thematicExpression for ${layerName}:`, thematicExpression);

    // Default colors if no thematic or problematic thematic data
    const defaultPointColor = "#ff6600"; // Orange
    const defaultLineColor = "#0000ff"; // Blue
    const defaultFillColor = "#ff0000"; // Red (with opacity)
    const defaultOutlineColor = "#000000"; // Black

    const geometryTypes = new Set(
      geojson.features.map((f) => f.geometry?.type)
    );

    // Add layers with calculated styling (thematicExpression or default)
    if (geometryTypes.has("Point") || geometryTypes.has("MultiPoint")) {
      map.addLayer({
        id: `${layerId}-points`,
        type: "circle",
        source: sourceId,
        filter: ["==", "$type", "Point"], // RE-ENABLED FILTER
        paint: {
          "circle-radius": 5, // BACK TO DEFAULT SIZE
          "circle-color": thematicExpression || defaultPointColor, // RE-ENABLED THEMATIC
        },
      });
      // RE-ENABLED CLICK HANDLER
      map.on("click", `${layerId}-points`, (e) => {
        const props = e.features[0].properties;
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<pre>${JSON.stringify(props, null, 2)}</pre>`)
          .addTo(map);
      });
    }

    if (geometryTypes.has("LineString") || geometryTypes.has("MultiLineString")) {
      map.addLayer({
        id: `${layerId}-lines`,
        type: "line",
        source: sourceId,
        filter: ["==", "$type", "LineString"], 
        paint: {
          "line-color": thematicExpression || defaultLineColor, 
          "line-width": 2, 
        },
      });
      // RE-ENABLED CLICK HANDLER
      map.on("click", `${layerId}-lines`, (e) => {
        const props = e.features[0].properties;
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<pre>${JSON.stringify(props, null, 2)}</pre>`)
          .addTo(map);
      });
    }

    if (geometryTypes.has("Polygon") || geometryTypes.has("MultiPolygon")) {
      map.addLayer({
        id: `${layerId}-polygons`,
        type: "fill",
        source: sourceId,
        filter: ["==", "$type", "Polygon"], 
        paint: {
          "fill-color": thematicExpression || defaultFillColor, 
          "fill-opacity": 0.35, 
        },
      });
      // RE-ENABLED CLICK HANDLER
      map.on("click", `${layerId}-polygons`, (e) => {
        const props = e.features[0].properties;
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<pre>${JSON.stringify(props, null, 2)}</pre>`)
          .addTo(map);
      });

      map.addLayer({
        id: `${layerId}-outline`,
        type: "line",
        source: sourceId,
        filter: ["==", "$type", "Polygon"], 
        paint: {
          "line-color": defaultOutlineColor, // Outline can remain black
          "line-width": 1,
        },
      });
    }

    // fit bounds
    const bounds = new mapboxgl.LngLatBounds();
    geojson.features.forEach((feature) => {
      const { type, coordinates } = feature.geometry;
      if (type === "Point" || type === "MultiPoint") {
        if (type === "Point") bounds.extend(coordinates);
        else coordinates.forEach((coord) => bounds.extend(coord));
      } else if (type === "LineString" || type === "MultiLineString") {
        if (type === "LineString") coordinates.forEach((coord) => bounds.extend(coord));
        else coordinates.forEach((line) => line.forEach((coord) => bounds.extend(coord)));
      } else if (type === "Polygon" || type === "MultiPolygon") {
        if (type === "Polygon") coordinates.forEach((polygon) => polygon.forEach((ring) => ring.forEach((coord) => bounds.extend(coord))));
      }
    });
    if (!bounds.isEmpty()) {
      map.fitBounds(bounds, { padding: 20 });
    }
}, []); 


  const addLayerToMap = useCallback((layerName, geojson) => {
    if (!mapRef.current) return;

    const sourceId = `source-${layerName}`;
    const layerId = `layer-${layerName}`;

    if (mapRef.current.getSource(sourceId)) {
      return;
    }

    const validFeatures = geojson.features.filter(
      (f) => f.geometry && f.geometry.coordinates
    );

    console.log(`Layer ${layerName}: Original features count: ${geojson.features.length}, Valid features count (initial check): ${validFeatures.length}`);
    if (validFeatures.length === 0) {
      console.warn(`Layer ${layerName} has no valid features after initial filter. Skipping layer addition.`);
      return;
    }

    // Using the original geojson directly for source data, skipping `flatten`
    mapRef.current.addSource(sourceId, {
      type: "geojson",
      data: geojson,
    });
    console.log(`Added source: ${sourceId}`, mapRef.current.getSource(sourceId));

    // Apply default styling initially. Thematic styling will be applied by thematicEffect.
    // Pass null for thematicAttribute to get default colors
    applyLayerStyling(mapRef.current, layerName, sourceId, layerId, geojson, null);
  }, [applyLayerStyling]);


  const removeLayerFromMap = useCallback((layerName) => {
    if (!mapRef.current) return;

    const sourceId = `source-${layerName}`;
    const layerId = `layer-${layerName}`;
    ["points", "lines", "polygons", "outline"].forEach((type) => {
      const id = `${layerId}-${type}`;
      if (mapRef.current.getLayer(id)) {
        mapRef.current.removeLayer(id);
      }
    });

    if (mapRef.current.getSource(sourceId)) {
      mapRef.current.removeSource(sourceId);
    }
  }, []);

  // Map setup
  useEffect(() => {
    document.title = "CPAD Web GIS Maps Visualization";

    if (mapRef.current) {
      console.log("Map already initialized, returning.");
      return;
    };

    if (!mapContainer.current) {
      console.error("mapContainer.current is null! Cannot initialize map.");
      return;
    }

    mapRef.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/streets-v11",
      center: [-160, 75],
      zoom: 3.35,
      projection: "globe",
    });

    mapRef.current.on("load", () => {
      mapRef.current.setFog({
        color: "white",
        "high-color": "#add8e6",
        "horizon-blend": 0.2,
        "space-color": "#000000",
        "star-intensity": 0.15,
      });
      setMapboxMap(mapRef.current);
    });
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();

        mapRef.current.off('zoomend');

        mapRef.current = null;
      }
    };
  }, []);

  // Data layers 
  useEffect(() => {
    if (!mapRef.current) return;
    Object.entries(activeLayers).forEach(([layerName, isActive]) => {
      const sourceId = `source-${layerName}`;
      if (isActive) {
        if (
          !mapRef.current.getSource(sourceId) &&
          !loadingLayers.current.has(layerName)
        ) {
          loadingLayers.current.add(layerName);
          console.log(`Attempting to fetch GeoJSON for layer: ${layerName}`);
          fetch(`http://localhost:8000/api/geojson/${layerName}`)
            .then((res) => {
              if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
              return res.json();
            })
            .then((response) => {
              const geojson = response;
              console.log(`Received GeoJSON for ${layerName}:`, geojson);
              if (!geojson || !geojson.features || geojson.features.length === 0) {
                console.warn(`GeoJSON for ${layerName} has no features or is malformed.`);
                return;
              }
              // Add layer with default styling. Thematic styling will be applied in a separate effect.
              addLayerToMap(layerName, geojson);
            })
            .catch((err) => console.error(`Failed to load ${layerName}:`, err))
            .finally(() => loadingLayers.current.delete(layerName));
        }
      } else {
        removeLayerFromMap(layerName);
      }
    });
  }, [activeLayers, addLayerToMap, removeLayerFromMap]);

  // Thematic Styling
  useEffect(() => {
    if (!mapboxMap || !activeThematicLayerConfig || !selectedThematicAttribute) {
      // If no thematic layer is active or no attribute selected, ensure default styling (if any)
      // or simply do nothing if the layer isn't even on the map.
      return;
    }

    const thematicLayerName = activeThematicLayerConfig.id;
    const sourceId = `source-${thematicLayerName}`;
    const layerId = `layer-${thematicLayerName}`;

    if (mapboxMap.getSource(sourceId)) {
      // Fetch the GeoJSON again to ensure we have the features with properties
      fetch(`http://localhost:8000/api/geojson/${thematicLayerName}`)
        .then((res) => {
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          return res.json();
        })
        .then((geojson) => {
          if (!geojson || !geojson.features || geojson.features.length === 0) {
            console.warn(`GeoJSON for thematic layer ${thematicLayerName} has no features or is malformed.`);
            return;
          }
          // Apply thematic styling
          applyLayerStyling(mapboxMap, thematicLayerName, sourceId, layerId, geojson, selectedThematicAttribute);
        })
        .catch((err) => console.error(`Failed to re-style thematic layer ${thematicLayerName}:`, err));
    }
  }, [mapboxMap, activeThematicLayerConfig, selectedThematicAttribute, applyLayerStyling]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />

      {/* User interface controls */}
      {mapboxMap && <SearchBar map={mapboxMap} />}
      {mapboxMap && <DrawControls map={mapboxMap} onDrawGeometry={onDrawGeometry} />}

      {/* Highlighting features */}
      <FeatureHighlighter mapboxMap={mapboxMap} highlightedFeatures={highlightedFeatures} />

      {/* Spatial query results and download panel */}
      {mapboxMap && highlightedFeatures && highlightedFeatures.length > 0 && (
        <SpatialQueryPanel highlightedFeatures={highlightedFeatures} />
      )}

    </div>
  );
};

export default Map;