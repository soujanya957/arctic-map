import React, { useEffect, useRef, useCallback, useState} from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { flatten } from "@turf/turf";
import FeatureHighlighter from './FeatureHighlighter';
import SearchBar from './SearchBar';
import DrawControls from './DrawControls';
import SpatialQueryPanel from './SpatialQueryPanel';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

// these are the props sent by App.jsx
const Map = ({ activeLayers, onDrawGeometry, highlightedFeatures }) => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const loadingLayers = useRef(new Set());
  const [mapboxMap, setMapboxMap] = useState(null); // holds initialized Mapbox map instance once loaded

  // Add or Remove data layers from side bar
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
    if (validFeatures.length === 0) return;
    const cleanedGeojson = { ...geojson, features: validFeatures };
    const processedGeojson = flatten(cleanedGeojson);

    mapRef.current.addSource(sourceId, {
      type: "geojson",
      data: processedGeojson,
    });
    const geometryTypes = new Set(
      processedGeojson.features.map((f) => f.geometry?.type)
    );
    if (geometryTypes.has("Point")) {
      mapRef.current.addLayer({
        id: `${layerId}-points`,
        type: "circle",
        source: sourceId,
        filter: ["==", "$type", "Point"],
        paint: {
          "circle-radius": 5,
          "circle-color": "#ff6600",
        },
      });

      // attribute popup for point features
      mapRef.current.on("click", `${layerId}-points`, (e) => {
        const props = e.features[0].properties;
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<pre>${JSON.stringify(props, null, 2)}</pre>`)
          .addTo(mapRef.current);
      });
    }
    if (geometryTypes.has("LineString")) {
      mapRef.current.addLayer({
        id: `${layerId}-lines`,
        type: "line",
        source: sourceId,
        filter: ["==", "$type", "LineString"],
        paint: {
          "line-color": "#0000ff",
          "line-width": 2,
        },
      });

      // attribute popup for line features
      mapRef.current.on("click", `${layerId}-lines`, (e) => {
        const props = e.features[0].properties;
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<pre>${JSON.stringify(props, null, 2)}</pre>`)
          .addTo(mapRef.current);
      });
    }
    if (geometryTypes.has("Polygon")) {
      mapRef.current.addLayer({
        id: `${layerId}-polygons`,
        type: "fill",
        source: sourceId,
        filter: ["==", "$type", "Polygon"],
        paint: {
          "fill-color": "#ff0000",
          "fill-opacity": 0.35,
        },
      });

      // attribute popup for polygon features
      mapRef.current.on("click", `${layerId}-polygons`, (e) => {
        const props = e.features[0].properties;
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<pre>${JSON.stringify(props, null, 2)}</pre>`)
          .addTo(mapRef.current);
      });

      mapRef.current.addLayer({
        id: `${layerId}-outline`,
        type: "line",
        source: sourceId,
        filter: ["==", "$type", "Polygon"],
        paint: {
          "line-color": "#000000",
          "line-width": 1,
        },
      });
    }
    // Fit bounds
    const bounds = new mapboxgl.LngLatBounds();
    processedGeojson.features.forEach((feature) => {
      const { type, coordinates } = feature.geometry;
      if (type === "Point") {
        bounds.extend(coordinates);
      } else if (type === "MultiPoint" || type === "LineString") {
        coordinates.forEach((coord) => bounds.extend(coord));
      } else if (type === "MultiLineString" || type === "Polygon") {
        coordinates.forEach((ring) => {
          ring.forEach((coord) => bounds.extend(coord));
        });
      } else if (type === "MultiPolygon") {
        coordinates.forEach((polygon) => {
          polygon.forEach((ring) => {
            ring.forEach((coord) => bounds.extend(coord));
          });
        });
      }
    });
    if (!bounds.isEmpty()) {
      mapRef.current.fitBounds(bounds, { padding: 20 });
    }
  }, []);

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
      setMapboxMap(mapRef.current); // store the actual map object in state after load
    });
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();

        mapRef.current.off('zoomend'); // Clean up event listener

        mapRef.current = null;
      }
    };
  }, []); // No dependencies for this effect, it runs once on mount

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
  }, [activeLayers, addLayerToMap, removeLayerFromMap]);

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