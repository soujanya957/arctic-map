import React, { useEffect, useState } from 'react';

const SpatialQueryPanel = ({ highlightedFeatures, layerDisplayNames = {} }) => {
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

    // Use display name for the filename if available
    const displayName = layerDisplayNames[layerName] || layerName;
    const fileName = displayName.replace(/[^a-z0-9]/gi, '_').toLowerCase(); // Clean filename

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
    a.download = `${fileName}_query_results.geojson`;
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
      zIndex: 1000, // Ensure it's above the map
      maxWidth: '250px', // Limit width
      maxHeight: '300px', // Limit height
      overflowY: 'auto' // Add scroll if content exceeds height
    }}>
      <h6 style={{ margin: '0 0 10px 0', fontSize: '1em' }}>Query Results</h6>
      {Object.keys(groupedFeatures).length > 0 ? (
        <ul>
          {Object.entries(groupedFeatures).map(([layerName, features]) => {
            // Get display name or fall back to layer name
            const displayName = layerDisplayNames[layerName] || layerName;
            
            return (
              <li key={layerName} style={{ marginBottom: '8px', fontSize: '0.9em' }}>
                <strong>{displayName}</strong> ({features.length} features)
                <button
                  onClick={() => handleDownload(layerName)}
                  style={{
                    marginLeft: '0px',
                    padding: '5px 10px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '5px',
                    cursor: 'pointer'
                  }}
                >
                  Download GeoJSON
                </button>
              </li>
            );
          })}
        </ul>
      ) : (
        <p>No features found for download in selected layers.</p>
      )}
    </div>
  );
};

export default SpatialQueryPanel;