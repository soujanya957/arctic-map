import React, { useEffect, useRef, useCallback, useState} from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { flatten } from "@turf/turf";
import SearchBar from './SearchBar';
import DrawControls from './DrawControls';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const Map = ({ activeLayers, onDrawGeometry }) => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null);
  const draw = useRef(null);
  const loadingLayers = useRef(new Set());
  const [mapboxMap, setMapboxMap] = useState(null); // holds initialized Mapbox map instance once loaded
  const [drawMode, setDrawMode] = useState(false);

  // Add/Remove data layers (unchanged)
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

  // Map and Draw setup
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

  // Drawing controls
  useEffect(() => {
    if (!mapRef.current) return;
    if (drawMode) {
      if (!draw.current) {
        draw.current = new MapboxDraw({
          displayControlsDefault: false,
          controls: {
            polygon: true,
            point: true,
            line_string: true,
            trash: true,
          },
        });
        mapRef.current.addControl(draw.current, "top-left");
        mapRef.current.on("draw.create", handleDrawChange);
        mapRef.current.on("draw.update", handleDrawChange);
        mapRef.current.on("draw.delete", () => {
          if (onDrawGeometry) onDrawGeometry(null);
        });
      }
    } else {
      if (draw.current) {
        mapRef.current.removeControl(draw.current);
        draw.current = null;
        if (onDrawGeometry) onDrawGeometry(null);
      }
    }
    // eslint-disable-next-line
  }, [drawMode]);

  // Handle geometry drawn on the map
  function handleDrawChange() {
    if (!draw.current) return;
    const features = draw.current.getAll().features;
    if (features.length > 0 && onDrawGeometry) {
      onDrawGeometry(features[features.length - 1]);
    }
  }

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

  // UI: Minimal Toggle
  return (
    <div style={{ width: "100%", height: "100%", position: "relative" }}>
    {/* <div style={{ flex: 1, position: "relative" }}> */}
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
      {mapboxMap && <SearchBar map={mapboxMap} />}
      <button
        style={{
          position: "absolute",
          top: 50,
          right: 10,
          zIndex: 10,
          background: drawMode ? "#1976d2" : "#f7f7f7",
          color: drawMode ? "#fff" : "#1976d2",
          border: "1.5px solid #1976d2",
          borderRadius: 5,
          padding: "7px 14px",
          fontWeight: 500,
          fontSize: 15,
          cursor: "pointer",
          outline: "none",
        }}
        onClick={() => setDrawMode((prev) => !prev)}
        title="Draw for Spatial Queries"
      >
        {drawMode ? "Exit Draw" : "Draw for Spatial Query"}
      </button>
      {drawMode && (
        <div
          style={{
            position: "absolute",
            top: 93,
            right: 10,
            zIndex: 10,
            background: "rgba(255,255,255,0.95)",
            borderRadius: 5,
            padding: "7px 12px",
            fontSize: 13,
            color: "#1976d2",
            border: "1px solid #e0e0e0",
            maxWidth: 200,
            lineHeight: 1.5,
          }}
        >
          Draw a polygon, line, or point.<br />
          Use the trash icon to delete.
        </div>
      )}
    </div>
  );
};

export default Map;