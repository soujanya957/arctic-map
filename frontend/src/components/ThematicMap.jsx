import React from 'react';

const ThematicControls = ({ activeThematicLayerConfig, selectedThematicAttribute, onThematicAttributeChange }) => {
  // Ensure we have a config and attributes before rendering
  if (!activeThematicLayerConfig || !activeThematicLayerConfig.thematicAttributes || activeThematicLayerConfig.thematicAttributes.length === 0) {
    return null; // Don't render if no thematic attributes are available
  }

  return (
    <li className="thematic-controls-item">
      <label htmlFor={`thematic-select-${activeThematicLayerConfig.id}`}>Generate Thematic Map By:</label>
      <select
        id={`thematic-select-${activeThematicLayerConfig.id}`}
        value={selectedThematicAttribute}
        onChange={onThematicAttributeChange}
      >
        {activeThematicLayerConfig.thematicAttributes.map(attr => (
          <option key={attr.id} value={attr.id}>
            {attr.label}
          </option>
        ))}
      </select>
    </li>
  );
};

export default ThematicControls;