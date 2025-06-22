import React, { useEffect, useRef, useCallback, useState} from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { flatten } from "@turf/turf";
import SearchBar from './SearchBar';

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const Map = ({ activeLayers }) => {
  const mapContainer = useRef(null);
  const mapRef = useRef(null); // renamed mapInstance to mapRef
  const loadingLayers = useRef(new Set());
  const [mapboxMap, setMapboxMap] = useState(null); // holds actual Mapbox map object

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
    if (validFeatures.length === 0) {
      console.warn(`No valid features found in ${layerName}.`);
      return;
    }

    const cleanedGeojson = { ...geojson, features: validFeatures };
    
    
    // onst hasMultiPolygon = cleanedGeojson.features.some(
    //   (f) => f.geometry?.type === "MultiPolygon"
    // );
    // const processedGeojson = hasMultiPolygon
    //   ? flatten(cleanedGeojson)
    //   : cleanedGeojson;

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

    // Safely compute bounds for all geometry types
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

    // comment this out for no zoom
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
        mapRef.current = null;
      }
    };
  }, []); // No dependencies for this effect, it runs once on mount

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
              if (!res.ok) {
                throw new Error(`HTTP error! status: ${res.status}`);
              }
              return res.json();
            })
            .then((geojson) => {
              if (!geojson.features || geojson.features.length === 0) {
                console.warn(`GeoJSON for ${layerName} has no features.`);
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
    <div style={{ flex: 1, position: "relative" }}>
      {/* The actual Mapbox container */}
      <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
      {/* Only render SearchBar when mapboxMap (the actual map object) is available and not null */}
      {mapboxMap && <SearchBar map={mapboxMap} />}
    </div>
  );
};

export default Map;
