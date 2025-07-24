import React, { useState, useEffect, useCallback } from "react";
import "./Sidebar.css";
import AttributeTable from "./AttributeTable";
import SpatialQueryPopup from "./SpatialQueryPopup";
import ThematicControls from "./ThematicControls";

const Popup = ({ title, onClose, children }) => (
  <div className="attribute-popup" role="dialog" aria-modal="true">
    <div className="popup-content">
      <h3>{title}</h3>
      <button className="close-btn" onClick={onClose}>✕</button>
      {children}
    </div>
  </div>
);

const Sidebar = ({ onLayerToggle, onThematicAttributeChange, onActiveThematicLayerChange }) => {
  const [layers, setLayers] = useState([]);
  const [selectedLayers, setSelectedLayers] = useState({});
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [attributeData, setAttributeData] = useState([]);
  const [activeLayerForAttributeTable, setActiveLayerForAttributeTable] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [confirmDownloadLayer, setConfirmDownloadLayer] = useState(null);
  const [showBatchDownloadPopup, setShowBatchDownloadPopup] = useState(false);
  const [showSpatialQueryPopup, setShowSpatialQueryPopup] = useState(false);
  const [selectedThematicAttribute, setSelectedThematicAttribute] = useState('');
  const [activeThematicLayerConfig, setActiveThematicLayerConfig] = useState(null);

  useEffect(() => {
    fetch("http://localhost:8000/api/layer_hierarchy")
      .then((res) => res.json())
      .then((data) => {
        const allLayers = [];
        const initialState = {};
        const dropdownState = {};

        // Flatten the theme > subtheme > layers structure
        for (const theme in data) {
          for (const subtheme in data[theme]) {
            const entries = data[theme][subtheme];
            for (const entry of entries) {
              const layerEntry = {
                theme: theme,
                subtheme: subtheme,
                id: entry.layer_name,
                displayName: entry.display_name,
                isThematic: entry.isThematic,
              };
              allLayers.push(layerEntry);
              initialState[entry.layer_name] = false;
              dropdownState[entry.layer_name] = false;
            }
          }
        }

        setLayers(allLayers);
        setSelectedLayers(initialState);
        setOpenDropdowns(dropdownState);
      })
      .catch((err) => console.error("Failed to fetch layer hierarchy:", err));
  }, []);

  const formatLayerName = (name) =>
    name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const getLayerConfig = useCallback((layerId) => {
    return layers.find(l => l.id === layerId);
  }, [layers]);

  const handleToggle = useCallback(async (layerId) => {
    // 1. Immediately determine the new selected state based on current `selectedLayers`
    const isNowSelected = !selectedLayers[layerId];

    // 2. Synchronously update `selectedLayers` state. This will trigger a re-render
    //    and update the checkbox's `checked` attribute immediately.
    setSelectedLayers(prevSelectedLayers => ({
      ...prevSelectedLayers,
      [layerId]: isNowSelected,
    }));

    // 3. Notify parent about layer toggle (this is also synchronous)
    onLayerToggle(layerId, isNowSelected);

    // 4. Proceed with thematic logic (this part can remain asynchronous)
    const layerConfig = getLayerConfig(layerId);

    if (layerConfig && layerConfig.isThematic) {
      if (isNowSelected) {
        // If a thematic layer is being turned ON
        try {
          // Fetch GeoJSON to get properties for thematic attributes
          const res = await fetch(`http://localhost:8000/api/geojson/${layerId}`);
          if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
          const geojson = await res.json();

          if (!geojson || !geojson.features || geojson.features.length === 0) {
            console.warn(`GeoJSON for ${layerId} has no features or is malformed.`);
            setActiveThematicLayerConfig(null);
            setSelectedThematicAttribute('');
            onActiveThematicLayerChange(null); // Notify parent
            onThematicAttributeChange(''); // Notify parent
            return; // Exit here as no features for thematic processing
          }

          const attributes = Object.keys(geojson.features[0].properties)
            .filter(key => {
              const value = geojson.features[0].properties[key];
              // YOU MUST CUSTOMIZE THIS FILTER for your 6 raster attributes
              return !['id', '_id', 'geometry', 'geom', 'type', 'name'].includes(key) &&
                     (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean');
            })
            .map(key => ({
              id: key,
              label: key // Use raw attribute name. Customize if you want friendly labels.
            }));

          if (attributes.length > 0) {
            const newThematicConfig = {
              id: layerId,
              displayName: layerConfig.displayName,
              thematicAttributes: attributes
            };
            setActiveThematicLayerConfig(newThematicConfig);
            setSelectedThematicAttribute(attributes[0].id); // Select the first attribute by default

            // Notify parent (App.jsx) about the active thematic layer and selected attribute
            onActiveThematicLayerChange(newThematicConfig);
            onThematicAttributeChange(attributes[0].id);
          } else {
            setActiveThematicLayerConfig(null);
            setSelectedThematicAttribute('');
            onActiveThematicLayerChange(null);
            onThematicAttributeChange('');
            console.warn(`No suitable thematic attributes found for ${layerId}.`);
          }

        } catch (error) {
          console.error(`Failed to load thematic attributes for ${layerId}:`, error);
          setActiveThematicLayerConfig(null);
          setSelectedThematicAttribute('');
          onActiveThematicLayerChange(null);
          onThematicAttributeChange('');
        }
      } else {
        // If the thematic layer is being turned OFF
        setActiveThematicLayerConfig(null);
        setSelectedThematicAttribute('');
        onActiveThematicLayerChange(null); // Notify parent
        onThematicAttributeChange(''); // Notify parent
      }
    } else if (!isNowSelected && activeThematicLayerConfig && activeThematicLayerConfig.id === layerId) {
        // Edge case: if a non-thematic layer was somehow tracked as activeThematicLayerId, clear it.
        // This should ideally not happen if isThematic check is correct, but for robustness.
        setActiveThematicLayerConfig(null);
        setSelectedThematicAttribute('');
        onActiveThematicLayerChange(null);
        onThematicAttributeChange('');
    }
  }, [selectedLayers, getLayerConfig, onLayerToggle, onThematicAttributeChange, onActiveThematicLayerChange, activeThematicLayerConfig]); // Dependencies updated to include `selectedLayers`


  const toggleDropdown = (layerId) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [layerId]: !prev[layerId],
    }));
  };

  // handles thematic attribute dropdown change
  const handleThematicAttributeChange = (event) => {
    const newAttribute = event.target.value;
    setSelectedThematicAttribute(newAttribute);
    onThematicAttributeChange(newAttribute);
  };

  const handleViewAttributes = (layerId) => {
    setLoadingAttributes(true);
    fetch(`http://localhost:8000/api/geojson/${layerId}`)
      .then((res) => res.json())
      .then((geojson) => {
        // FIX: Changed '==' to '===' for strict equality comparison
        if (geojson && geojson.type === "FeatureCollection" && geojson.features && geojson.features.length > 0) {
          const attributes = geojson.features.map((feature) => ({
            ...feature.properties,
            geometry: feature.geometry,
          }));
          setAttributeData(attributes);
        } else {
          setAttributeData([]);
        }
        // FIX: Use activeLayerForAttributeTable here
        setActiveLayerForAttributeTable(layerId);
        setShowPopup(true);
        setLoadingAttributes(false);
      })
      .catch((err) => {
        console.error("Failed to fetch GeoJSON:", err);
        setAttributeData([]);
        setShowPopup(true);
        setLoadingAttributes(false);
      });
  };

  const handleDownloadShp = (layerId) => {
    const link = document.createElement("a");
    link.href = `http://localhost:8001/api/shapefiles/${layerId}.zip`;
    link.download = `${layerId}.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleDownloadAll = () => {
    setShowBatchDownloadPopup(true);
  };

  const confirmBatchDownload = () => {
    const selected = Object.entries(selectedLayers)
      .filter(([_, isSelected]) => isSelected)
      .map(([layer]) => layer);

    if (selected.length === 0) return;

    const query = selected.join(",");
    const link = document.createElement("a");
    link.href = `http://localhost:8001/api/shapefiles/batch?layers=${encodeURIComponent(query)}`;
    link.download = `selected_layers.zip`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setShowBatchDownloadPopup(false);
  };

  const confirmDownload = () => {
    if (confirmDownloadLayer) {
      handleDownloadShp(confirmDownloadLayer);
      setConfirmDownloadLayer(null);
    }
  };

  const selectedLayerNames = Object.entries(selectedLayers)
    .filter(([_, isSelected]) => isSelected)
    .map(([layer]) => layer);

  const getFieldTypes = (data) => {
    if (!data || data.length === 0) return {};
    const sample = data[0];
    const types = {};
    Object.entries(sample).forEach(([key, value]) => {
      if (key === "geometry") return;
      types[key] = typeof value === "number" ? "number" : "string";
    });
    return types;
  };

  const fieldTypes = getFieldTypes(attributeData);

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        <h2>Layers</h2>
        {/* <button
          className="spatial-query-btn"
          style={{ marginBottom: "1em" }}
          onClick={() => setShowSpatialQueryPopup(true)}
        >
          Spatial Queries
        </button> */}
        {layers.length === 0 ? (
          <p>No layers available.</p>
        ) : (
          Object.entries(
            layers.reduce((acc, layer) => {
              if (!acc[layer.theme]) acc[layer.theme] = {};
              if (!acc[layer.theme][layer.subtheme]) acc[layer.theme][layer.subtheme] = [];
              acc[layer.theme][layer.subtheme].push(layer);
              return acc;
            }, {})
          ).map(([theme, subthemes]) => (
            <div key={theme}>
              <h3>{theme}</h3>
              {Object.entries(subthemes).map(([subtheme, layerEntries]) => (
                <div key={subtheme}>
                  <h4>{subtheme}</h4>
                  <ul className="layer-list">
                    {layerEntries.map((layer) => (
                      <li key={layer.id} className="layer-item">
                        <div className="layer-header">
                          <label>
                            <input
                              type="checkbox"
                              checked={selectedLayers[layer.id] || false}
                              onChange={() => handleToggle(layer.id)}
                            />
                            {layer.displayName}
                          </label>
                          <button
                            className={`dropdown-toggle ${openDropdowns[layer.id] ? "open" : ""}`}
                            onClick={() => toggleDropdown(layer.id)}
                            aria-label="Toggle layer options"
                          >
                            {openDropdowns[layer.id] ? "▲" : "▼"}
                          </button>
                        </div>
                        {openDropdowns[layer.id] && (
                          <ul className="dropdown-menu">
                            <li onClick={() => handleViewAttributes(layer.id)}>
                              View Attribute Table
                            </li>
                            <li onClick={() => setConfirmDownloadLayer(layer.id)}>
                              Download SHP File
                            </li>
                            <li
                              onClick={() =>
                                window.open(`http://localhost:8000/api/metadata_html/${layer.id}`, "_blank")
                              }
                            >
                              View Metadata
                            </li>
                            {/* Thematic controls for enriched hexagon layer for raster data */}
                            {layer.isThematic && selectedLayers[layer.id] && activeThematicLayerConfig?.id === layer.id && (
                                <ThematicControls
                                  activeThematicLayerConfig={activeThematicLayerConfig}
                                  selectedThematicAttribute={selectedThematicAttribute}
                                  onThematicAttributeChange={handleThematicAttributeChange}
                                />
                            )}
                          </ul>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          ))
        )}

        <button className="download-all-btn" onClick={handleDownloadAll}>
          ⬇ Download Selected Layers
        </button>
      </div>

      {showPopup && (
        <Popup
          title={`${formatLayerName(activeLayerForAttributeTable)} - Attribute Table`}
          onClose={() => setShowPopup(false)}
        >
          {loadingAttributes ? (
            <p>Loading attributes...</p>
          ) : (
            <AttributeTable data={attributeData} fieldTypes={fieldTypes} />
          )}
        </Popup>
      )}

      {confirmDownloadLayer && (
        <Popup
          title="Download Confirmation"
          onClose={() => setConfirmDownloadLayer(null)}
        >
          <p>
            Download <strong>{formatLayerName(confirmDownloadLayer)}</strong>'s shape files?
          </p>
          <div className="button-row">
            <button onClick={() => setConfirmDownloadLayer(null)}>No</button>
            <button onClick={confirmDownload}>Yes</button>
          </div>
        </Popup>
      )}

      {showBatchDownloadPopup && (
        <Popup
          title="Download Selected Layers"
          onClose={() => setShowBatchDownloadPopup(false)}
        >
          {selectedLayerNames.length === 0 ? (
            <p>No layers selected for download.</p>
          ) : (
            <>
              <p>The following layers will be downloaded:</p>
              <ul>
                {selectedLayerNames.map((layer) => (
                  <li key={layer}>{formatLayerName(layer)}</li>
                ))}
              </ul>
            </>
          )}
          <div className="button-row">
            <button onClick={() => setShowBatchDownloadPopup(false)}>Cancel</button>
            <button onClick={confirmBatchDownload} disabled={selectedLayerNames.length === 0}>
              Download
            </button>
          </div>
        </Popup>
      )}

      {/* Spatial Query popup */}
      {showSpatialQueryPopup && (
        <SpatialQueryPopup onClose={() => setShowSpatialQueryPopup(false)} />
      )}
    </div>
  );
};

export default Sidebar;