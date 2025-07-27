import React, { useEffect } from 'react';

const FeatureHighlighter = ({ mapboxMap, highlightedFeatures }) => {
  const highlightSourceId = 'highlight-source';
  const highlightLayerPointId = 'highlight-layer-points';
  const highlightLayerLineId = 'highlight-layer-lines';
  const highlightLayerPolygonId = 'highlight-layer-polygons';
  const highlightLayerPolygonOutlineId = `${highlightLayerPolygonId}-outline`;

  // Effect to handle changes in highlightedFeatures
  useEffect(() => {
    if (!mapboxMap) return;

    if (highlightedFeatures && highlightedFeatures.length > 0) {
      // Update or add the source
      if (mapboxMap.getSource(highlightSourceId)) {
        mapboxMap.getSource(highlightSourceId).setData({
          type: 'FeatureCollection',
          features: highlightedFeatures,
        });
      } else {
        mapboxMap.addSource(highlightSourceId, {
          type: 'geojson',
          data: {
            type: 'FeatureCollection',
            features: highlightedFeatures,
          },
        });
      }

      // Helper to add a layer if it doesn't exist
      const ensureLayer = (id, type, source, filter, paint) => {
        if (!mapboxMap.getLayer(id)) {
          mapboxMap.addLayer({ id, type, source, filter, paint });
        }
      };

      // Add/Update Point Layer (if points exist)
      const hasPoints = highlightedFeatures.some(f => f.geometry && (f.geometry.type === 'Point' || f.geometry.type === 'MultiPoint'));
      if (hasPoints) {
        ensureLayer(highlightLayerPointId, 'circle', highlightSourceId, ['==', '$type', 'Point'], {
          'circle-radius': 5,
          'circle-color': '#00FFFF', // Bright cyan for highlight
          'circle-stroke-color': '#FFFFFF', // White border
          'circle-stroke-width': 2,
          'circle-opacity': 1,
        });
      } else { // No points, ensure layer is removed if it exists
        if (mapboxMap.getLayer(highlightLayerPointId)) mapboxMap.removeLayer(highlightLayerPointId);
      }

      // Add/Update Line Layer (if lines exist)
      const hasLines = highlightedFeatures.some(f => f.geometry && (f.geometry.type === 'LineString' || f.geometry.type === 'MultiLineString'));
      if (hasLines) {
        ensureLayer(highlightLayerLineId, 'line', highlightSourceId, ['==', '$type', 'LineString'], {
          'line-color': '#00FFFF', // Bright cyan
          'line-width': 4, // Thicker line
        });
      } else { // No lines, remove layer
        if (mapboxMap.getLayer(highlightLayerLineId)) mapboxMap.removeLayer(highlightLayerLineId);
      }

      // Add/Update Polygon Layer (if polygons exist)
      const hasPolygons = highlightedFeatures.some(f => f.geometry && (f.geometry.type === 'Polygon' || f.geometry.type === 'MultiPolygon'));
      if (hasPolygons) {
        ensureLayer(highlightLayerPolygonId, 'fill', highlightSourceId, ['==', '$type', 'Polygon'], {
          'fill-color': '#00FFFF', // Bright cyan
          'fill-opacity': 0.5,
        });
        ensureLayer(highlightLayerPolygonOutlineId, 'line', highlightSourceId, ['==', '$type', 'Polygon'], {
          'line-color': '#FFFFFF', // White outline for contrast
          'line-width': 2,
        });
      } else { // No polygons, remove layers
        if (mapboxMap.getLayer(highlightLayerPolygonId)) mapboxMap.removeLayer(highlightLayerPolygonId);
        if (mapboxMap.getLayer(highlightLayerPolygonOutlineId)) mapboxMap.removeLayer(highlightLayerPolygonOutlineId);
      }

    } else { // highlightedFeatures is null or empty, so remove all highlight layers and source
      [
        highlightLayerPointId,
        highlightLayerLineId,
        highlightLayerPolygonId,
        highlightLayerPolygonOutlineId
      ].forEach(id => {
        if (mapboxMap && mapboxMap.getLayer(id)) mapboxMap.removeLayer(id);
      });
      if (mapboxMap.getSource(highlightSourceId)) mapboxMap.removeSource(highlightSourceId);
    }

    // Cleanup function for this effect on unmount or mapboxMap change
    return () => {
      if (mapboxMap) {
        [
          highlightLayerPointId,
          highlightLayerLineId,
          highlightLayerPolygonId,
          highlightLayerPolygonOutlineId
        ].forEach(id => {
          if (mapboxMap && mapboxMap.getLayer(id)) mapboxMap.removeLayer(id);
        });
        if (mapboxMap && mapboxMap.getSource(highlightSourceId)) mapboxMap.removeSource(highlightSourceId);
      }
    };

  }, [mapboxMap, highlightedFeatures]); // Dependencies

  return null; // This component doesn't render any UI
};

export default FeatureHighlighter;