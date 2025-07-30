import React, { useState, useEffect, useCallback } from 'react';
import thematicMapConfigs from '../config/thematicMapConfigs';

// Helper function to apply thematic styling 
const applyThematicStyling = async (map, layerConfig, attribute, setMinMaxValues) => {
  if (!map || !layerConfig || !attribute) {
    console.log("Not enough info (map, layerConfig, or attribute) to apply thematic styling. Clearing existing thematic layers.");
    setMinMaxValues({ min: null, max: null });
    return;
  }

  const sourceId = `thematic-source-${layerConfig.layerName}`;
  const layerIdFill = `thematic-layer-${layerConfig.layerName}-fill`;
  const layerIdOutline = `thematic-layer-${layerConfig.layerName}-outline`;

  if (map.getLayer(layerIdFill)) map.removeLayer(layerIdFill);
  if (map.getLayer(layerIdOutline)) map.removeLayer(layerIdOutline);
  if (map.getSource(sourceId)) map.removeSource(sourceId);

  try {
    const res = await fetch(`http://localhost:8000/api/geojson/${layerConfig.layerName}`);
    if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
    const geojson = await res.json();

    if (!geojson || !geojson.features || geojson.features.length === 0) {
      console.warn(`GeoJSON for thematic layer '${layerConfig.layerName}' has no features or is malformed.`);
      setMinMaxValues({ min: null, max: null });
      return;
    }

    map.addSource(sourceId, {
      type: 'geojson',
      data: geojson,
    });

    const attributeValues = geojson.features
      .map(f => f.properties?.[attribute])
      .filter(val => typeof val === 'number' && !isNaN(val));

    if (attributeValues.length > 0) {
      const minVal = Math.min(...attributeValues);
      const maxVal = Math.max(...attributeValues);
      setMinMaxValues({ min: minVal, max: maxVal });

      const fillColorExpression = [
        'interpolate',
        ['linear'],
        ['get', attribute],
        minVal, 'rgba(255, 255, 204, 0.7)',
        minVal + (maxVal - minVal) * 0.25, 'rgba(254, 217, 118, 0.7)',
        minVal + (maxVal - minVal) * 0.5, 'rgba(254, 178, 76, 0.7)',
        minVal + (maxVal - minVal) * 0.75, 'rgba(253, 141, 60, 0.7)',
        maxVal, 'rgba(227, 26, 28, 0.7)'
      ];

      map.addLayer({
        id: layerIdFill,
        type: 'fill',
        source: sourceId,
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'fill-color': fillColorExpression,
          'fill-opacity': 0.8
        }
      });

      map.addLayer({
        id: layerIdOutline,
        type: 'line',
        source: sourceId,
        filter: ['==', '$type', 'Polygon'],
        paint: {
          'line-color': '#FFFFFF',
          'line-width': 1
        }
      });

    } else {
      console.warn(`Attribute '${attribute}' is not numeric or has no valid values for thematic styling on layer '${layerConfig.layerName}'.`);
      setMinMaxValues({ min: null, max: null });
    }
  } catch (error) {
    console.error("Error fetching or processing thematic GeoJSON:", error);
    setMinMaxValues({ min: null, max: null });
  }
};

const ThematicMap = ({ mapboxMap, onThematicModeToggle }) => {
  const availableLayerIds = thematicMapConfigs ? Object.keys(thematicMapConfigs) : [];

  const [selectedLayerId, setSelectedLayerId] = useState('');
  const [selectedAttributeId, setSelectedAttributeId] = useState('');
  const [currentThematicLayerConfig, setCurrentThematicLayerConfig] = useState(null);
  const [minMaxValues, setMinMaxValues] = useState({ min: null, max: null });

  useEffect(() => {
    if (selectedLayerId && thematicMapConfigs[selectedLayerId]) {
      const config = thematicMapConfigs[selectedLayerId];
      setCurrentThematicLayerConfig(config);

      if (config.attributes && config.attributes.length > 0) {
        if (!config.attributes.some(attr => attr.id === selectedAttributeId)) {
          setSelectedAttributeId('');
        }
      } else {
        setSelectedAttributeId('');
      }
    } else {
      setCurrentThematicLayerConfig(null);
      setSelectedAttributeId('');
    }
  }, [selectedLayerId]);

  // applies thematic map styling
  useEffect(() => {
    if (mapboxMap && currentThematicLayerConfig && selectedAttributeId) {
      console.log(`Applying thematic map for layer: ${currentThematicLayerConfig.layerName}, attribute: ${selectedAttributeId}`);
      applyThematicStyling(mapboxMap, currentThematicLayerConfig, selectedAttributeId, setMinMaxValues);
    } else if (mapboxMap) {
      const style = mapboxMap.getStyle();
      if (style && style.layers) {
        [...style.layers].forEach(layer => {
          if (layer.id.startsWith('thematic-layer-')) {
            if (mapboxMap.getLayer(layer.id)) mapboxMap.removeLayer(layer.id);
          }
        });
      }
      if (style && style.sources) {
        for (const sourceId in style.sources) {
            if (sourceId.startsWith('thematic-source-')) {
                if (mapboxMap.getSource(sourceId)) mapboxMap.removeSource(sourceId);
            }
        }
      }
      setMinMaxValues({ min: null, max: null });
    }

    return () => {
      if (mapboxMap) {
        const style = mapboxMap.getStyle();
        if (style && style.layers) {
            [...style.layers].forEach(layer => {
                if (layer.id.startsWith('thematic-layer-')) {
                    if (mapboxMap.getLayer(layer.id)) mapboxMap.removeLayer(layer.id);
                }
            });
        }
        if (style && style.sources) {
            for (const sourceId in style.sources) {
                if (sourceId.startsWith('thematic-source-')) {
                    if (mapboxMap.getSource(sourceId)) mapboxMap.removeSource(sourceId);
                }
            }
        }
      }
    };
  }, [mapboxMap, currentThematicLayerConfig, selectedAttributeId, applyThematicStyling]);


  const handleLayerChange = (event) => {
    setSelectedLayerId(event.target.value);
  };

  const handleAttributeChange = (event) => {
    setSelectedAttributeId(event.target.value);
  };

  const getSelectedAttributeDetails = useCallback(() => {
    if (currentThematicLayerConfig && selectedAttributeId) {
      return currentThematicLayerConfig.attributes.find(attr => attr.id === selectedAttributeId);
    }
    return null;
  }, [currentThematicLayerConfig, selectedAttributeId]);

  const selectedAttributeDetails = getSelectedAttributeDetails();

  const generateColorSteps = (min, max) => {
    if (min === null || max === null || min === max) return [];
    const steps = 5;
    const range = max - min;
    const interval = range / (steps - 1);

    const colors = [
      'rgba(255, 255, 204, 0.7)',
      'rgba(254, 217, 118, 0.7)',
      'rgba(254, 178, 76, 0.7)',
      'rgba(253, 141, 60, 0.7)',
      'rgba(227, 26, 28, 0.7)'
    ];

    return Array.from({ length: steps }).map((_, i) => {
      const value = min + i * interval;
      return {
        value: value.toFixed(2),
        color: colors[i]
      };
    });
  };

  const colorSteps = generateColorSteps(minMaxValues.min, minMaxValues.max);


  return (
    <>
      {/* Thematic Controls Overlay (Dropdowns) - MOVED TO TOP-MIDDLE */}
      <div style={{
        position: 'absolute',
        top: '20px', // Distance from the top
        left: '50%', // Start at 50% from the left
        transform: 'translateX(-50%)', // Pull back by half its width to truly center
        zIndex: 2,
        pointerEvents: 'auto',
        backgroundColor: 'white',
        padding: '10px',
        borderRadius: '5px',
        boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
        display: 'flex', // Use flexbox for internal layout
        gap: '10px', // Space between dropdowns
        alignItems: 'center'
      }}>
        {/* Removed H2 "Thematic Map Options" to make it more compact */}
        {/* Optional: Button to switch back to normal mode if desired here */}
        {onThematicModeToggle && (
          <button onClick={onThematicModeToggle} style={{ padding: '8px 12px', borderRadius: '4px', border: '1px solid #ccc', cursor: 'pointer' }}>
            Switch to Normal Map
          </button>
        )}

        <div>
          <label htmlFor="thematic-layer-select" style={{ marginRight: '5px' }}>Layer:</label>
          <select id="thematic-layer-select" value={selectedLayerId} onChange={handleLayerChange} style={{ padding: '5px', borderRadius: '3px' }}>
            <option value="">Select a Layer</option>
            {availableLayerIds.map(layerId => (
              <option key={layerId} value={layerId}>
                {thematicMapConfigs[layerId].layerName || layerId}
              </option>
            ))}
          </select>
        </div>

        {currentThematicLayerConfig && currentThematicLayerConfig.attributes && currentThematicLayerConfig.attributes.length > 0 && (
          <div>
            <label htmlFor="thematic-attribute-select" style={{ marginRight: '5px' }}>Attribute:</label>
            <select
              id="thematic-attribute-select"
              value={selectedAttributeId}
              onChange={handleAttributeChange}
              disabled={!currentThematicLayerConfig}
              style={{ padding: '5px', borderRadius: '3px' }}
            >
              <option value="">Select an Attribute</option>
              {currentThematicLayerConfig.attributes.map(attr => (
                <option key={attr.id} value={attr.id}>{attr.name}</option>
              ))}
            </select>
          </div>
        )}
      </div>

      {/* Thematic Legend Overlay */}
      {selectedLayerId && selectedAttributeId && minMaxValues.min !== null && (
        <div style={{
          position: 'absolute',
          bottom: '50px',
          right: '20px',
          zIndex: 2,
          pointerEvents: 'auto',
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '5px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
          maxWidth: '250px'
        }}>
          <h3>
            Legend: {selectedAttributeDetails ? selectedAttributeDetails.name : selectedAttributeId} 
            {selectedAttributeDetails && selectedAttributeDetails.units && (
              <span style={{ fontSize: '0.8em', color: '#666', marginLeft: '5px' }}>
                ({selectedAttributeDetails.units})
              </span>
            )}
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '5px', marginTop: '10px' }}>
            {colorSteps.map((step, index) => (
              <div key={index} style={{ display: 'flex', alignItems: 'center' }}>
                <div
                  style={{
                    width: '20px',
                    height: '20px',
                    backgroundColor: step.color,
                    border: '1px solid #ccc',
                    marginRight: '10px',
                  }}
                ></div>
                <span>{step.value}</span>
              </div>
            ))}
          </div>
          <p style={{ fontSize: '0.8em', color: '#666', marginTop: '10px' }}>
            Values range from {minMaxValues.min !== null ? minMaxValues.min.toFixed(2) : 'N/A'} to {minMaxValues.max !== null ? minMaxValues.max.toFixed(2) : 'N/A'}.
          </p>
        </div>
      )}

      {/* Attribute Description/Key Overlay */}
      {selectedAttributeDetails && selectedAttributeDetails.description && (
        <div style={{
          position: 'absolute',
          top: '20px',
          right: '20px',
          zIndex: 2,
          pointerEvents: 'auto',
          backgroundColor: 'white',
          padding: '15px',
          borderRadius: '5px',
          boxShadow: '0 2px 5px rgba(0,0,0,0.2)',
          maxWidth: '300px'
        }}>
          <h3>Attribute Key: {selectedAttributeDetails.name}</h3>
          <p style={{ fontSize: '0.9em', color: '#333' }}>
            {selectedAttributeDetails.description}
          </p>
        </div>
      )}
    </>
  );
};

export default ThematicMap;