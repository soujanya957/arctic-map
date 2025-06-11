import React, { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { flatten } from "@turf/turf";

mapboxgl.accessToken = import.meta.env.VITE_MAPBOX_ACCESS_TOKEN;

const Map = ({ activeLayers }) => {
  const mapContainer = useRef(null);
  const mapInstance = useRef(null);
  const loadingLayers = useRef(new Set());

  const addLayerToMap = useCallback((layerName, geojson) => {
    if (!mapInstance.current) return;

    const sourceId = `source-${layerName}`;
    const layerId = `layer-${layerName}`;

    if (mapInstance.current.getSource(sourceId)) {
      console.log(`Source ${sourceId} already exists. Skipping.`);
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

  useEffect(() => {
    document.title = "CPAD Maps Visualization";

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
  }, []);

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

  return <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />;

  // return (
  //   <>
  //     <div ref={mapContainer} style={{ width: "100%", height: "100%" }} />
  //     {mapReady && mapInstance.current && (
  //       <GeocoderControl map={mapInstance.current} />
  //     )}
  //   </>
  // );


};

export default Map;
