// Map.jsx

import React, { useEffect, useRef, useCallback, useState } from "react";
import mapboxgl from "mapbox-gl";
import MapboxDraw from "@mapbox/mapbox-gl-draw";
import "mapbox-gl/dist/mapbox-gl.css";
import "@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css";
import { flatten } from "@turf/turf";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const Map = ({ activeLayers, onDrawGeometry }) => {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const draw = useRef(null);
  const loadingLayers = useRef(new Set());
  const [drawMode, setDrawMode] = useState(false);

  // Add/Remove data layers (unchanged)
  const addLayerToMap = useCallback((layerName, geojson) => {
    if (!mapInstance.current) return;
    const sourceId = `source-${layerName}`;
    const layerId = `layer-${layerName}`;
    if (mapInstance.current.getSource(sourceId)) return;
    const validFeatures = geojson.features.filter(
      (f) => f.geometry && f.geometry.coordinates
    );
    if (validFeatures.length === 0) return;
    const cleanedGeojson = { ...geojson, features: validFeatures };
    const processedGeojson = flatten(cleanedGeojson);
    mapInstance.current.addSource(sourceId, {
      type: "geojson",
      data: processedGeojson,
    });
    const geometryTypes = new Set(
      processedGeojson.features.map((f) => f.geometry?.type)
    );
    if (geometryTypes.has("Point")) {
      mapInstance.current.addLayer({
        id: `${layerId}-points`,
        type: "circle",
        source: sourceId,
        filter: ["==", "$type", "Point"],
        paint: {
          "circle-radius": 5,
          "circle-color": "#ff6600",
        },
      });
      mapInstance.current.on("click", `${layerId}-points`, (e) => {
        const props = e.features[0].properties;
        new mapboxgl.Popup()
          .setLngLat(e.lngLat)
          .setHTML(`<pre>${JSON.stringify(props, null, 2)}</pre>`)
          .addTo(mapInstance.current);
      });
    }
    if (geometryTypes.has("LineString")) {
      mapInstance.current.addLayer({
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
      mapInstance.current.addLayer({
        id: `${layerId}-polygons`,
        type: "fill",
        source: sourceId,
        filter: ["==", "$type", "Polygon"],
        paint: {
          "fill-color": "#ff0000",
          "fill-opacity": 0.35,
        },
      });
      mapInstance.current.addLayer({
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
      mapInstance.current.fitBounds(bounds, { padding: 20 });
    }
  }, []);

  const removeLayerFromMap = useCallback((layerName) => {
    if (!mapInstance.current) return;
    const sourceId = `source-${layerName}`;
    const layerId = `layer-${layerName}`;
    ["points", "lines", "polygons", "outline"].forEach((type) => {
      const id = `${layerId}-${type}`;
      if (mapInstance.current.getLayer(id)) {
        mapInstance.current.removeLayer(id);
      }
    });
    if (mapInstance.current.getSource(sourceId)) {
      mapInstance.current.removeSource(sourceId);
    }
  }, []);

  // Map and Draw setup
  useEffect(() => {
    if (mapInstance.current) return;
    mapInstance.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/outdoors-v12",
      center: [-160, 75],
      zoom: 3.35,
      projection: "globe",
    });
    mapInstance.current.on("load", () => {
      mapInstance.current.setFog({
        color: "white",
        "high-color": "#add8e6",
        "horizon-blend": 0.2,
        "space-color": "#000000",
        "star-intensity": 0.15,
      });
    });
    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
    // eslint-disable-next-line
  }, []);

  // Drawing controls
  useEffect(() => {
    if (!mapInstance.current) return;
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
        mapInstance.current.addControl(draw.current, "top-left");
        mapInstance.current.on("draw.create", handleDrawChange);
        mapInstance.current.on("draw.update", handleDrawChange);
        mapInstance.current.on("draw.delete", () => {
          if (onDrawGeometry) onDrawGeometry(null);
        });
      }
    } else {
      if (draw.current) {
        mapInstance.current.removeControl(draw.current);
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
    if (!mapInstance.current) return;
    Object.entries(activeLayers).forEach(([layerName, isActive]) => {
      const sourceId = `source-${layerName}`;
      if (isActive) {
        if (
          !mapInstance.current.getSource(sourceId) &&
          !loadingLayers.current.has(layerName)
        ) {
          loadingLayers.current.add(layerName);
          fetch(`http://localhost:8000/api/geojson/${layerName}`)
            .then((res) => {
              if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
              return res.json();
            })
            .then((response) => {
              const geojson = response.geojson;
              if (!geojson || !geojson.features || geojson.features.length === 0) {
                console.warn(`GeoJSON for ${layerName} has no features.`);
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
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
      <button
        style={{
          position: "absolute",
          top: 18,
          right: 18,
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
            top: 56,
            right: 18,
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
