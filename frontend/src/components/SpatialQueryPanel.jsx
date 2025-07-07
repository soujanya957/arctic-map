import React, { useEffect, useState } from 'react';

const SpatialQueryPanel = ({ highlightedFeatures }) => {
  const [groupedFeatures, setGroupedFeatures] = useState({});

  useEffect(() => {
    if (highlightedFeatures && highlightedFeatures.length > 0) {
      // Group features by layer_name in the backend
      const newGroupedFeatures = highlightedFeatures.reduce((acc, feature) => {
        const layerName = feature.properties?.layer_name || 'unknown_layer';
        if (!acc[layerName]) {
          acc[layerName] = [];
        }
        acc[layerName].push(feature);
        return acc;
      }, {});
      setGroupedFeatures(newGroupedFeatures);
    } else {
      setGroupedFeatures({}); // Clear features if none are highlighted
    }
  }, [highlightedFeatures]);

  const handleDownload = (layerName) => {
    const featuresToDownload = groupedFeatures[layerName];
    if (!featuresToDownload || featuresToDownload.length === 0) {
      console.warn(`No features to download for layer: ${layerName}`);
      return;
    }

    const geojsonBlob = new Blob([
      JSON.stringify(
        {
          type: 'FeatureCollection',
          features: featuresToDownload,
        },
        null,
        2
      ),
    ], { type: 'application/geo+json' });

    const url = URL.createObjectURL(geojsonBlob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${layerName}_query_results.geojson`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url); // Clean up the URL object
  };

  if (!highlightedFeatures || highlightedFeatures.length === 0) {
    return null; // Don't render if no features are highlighted
  }

  return (
    <div style={{
      position: 'absolute',
      bottom: '50px', 
      right: '10px', 
      backgroundColor: 'rgba(255, 255, 255, 0.7)', // White with 70% opacity
      padding: '15px',
      borderRadius: '8px',
    //   boxShadow: '0 2px 10px rgba(0,0,0,0.2)',
      zIndex: 1000, // Ensure it's above the map
      maxWidth: '250px', // Limit width
      maxHeight: '300px', // Limit height
      overflowY: 'auto' // Add scroll if content exceeds height
    }}>
      <h6 style={{ margin: '0 0 10px 0', fontSize: '1em' }}>Query Results</h6>
      {Object.keys(groupedFeatures).length > 0 ? (
        <ul>
          {Object.entries(groupedFeatures).map(([layerName, features]) => (
            <li key={layerName} style={{ marginBottom: '8px', fontSize: '0.9em' }}>
              <strong>{layerName}</strong> ({features.length} features)
              <button
                onClick={() => handleDownload(layerName)}
                style={{
                  marginLeft: '10px',
                  padding: '5px 10px',
                  backgroundColor: '#007bff',
                  color: 'white',
                  border: 'none',
                  borderRadius: '5px',
                  cursor: 'pointer'
                }}
              >
                Download
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p>No features found for download in selected layers.</p>
      )}
    </div>
  );
};

export default SpatialQueryPanel;