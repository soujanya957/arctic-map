import React, { useState, useEffect } from "react";
import "./Sidebar.css";
import AttributeTable from "./AttributeTable";

const Popup = ({ title, onClose, children }) => (
  <div className="attribute-popup" role="dialog" aria-modal="true">
    <div className="popup-content">
      <h3>{title}</h3>
      <button className="close-btn" onClick={onClose}>✕</button>
      {children}
    </div>
  </div>
);

const Sidebar = ({ onLayerToggle }) => {
  const [layers, setLayers] = useState([]);
  const [selectedLayers, setSelectedLayers] = useState({});
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [attributeData, setAttributeData] = useState([]);
  const [activeLayer, setActiveLayer] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [confirmDownloadLayer, setConfirmDownloadLayer] = useState(null);
  const [showBatchDownloadPopup, setShowBatchDownloadPopup] = useState(false);

  // this is the old implementation of populating all the datasets in the sidebar
  // it's since been updated to rely on a google sheets ordering of datasets
  //
  // useEffect(() => {
  //   // fetch("http://127.0.0.1:8000/api/layers")
  //   fetch("http://localhost:8000/api/layers")
  //     .then((res) => res.json())
  //     .then((data) => {
  //       if (data.layers) {
  //         const initialState = {};
  //         const dropdownState = {};
  //         data.layers.forEach((layer) => {
  //           initialState[layer] = false;
  //           dropdownState[layer] = false;
  //         });
  //         setLayers(data.layers);
  //         setSelectedLayers(initialState);
  //         setOpenDropdowns(dropdownState);
  //       }
  //     })
  //     .catch((err) => console.error("Failed to fetch layers:", err));
  // }, []);

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
                theme,
                subtheme,
                layer_name: entry.layer_name,
                display_name: entry.display_name,
              };
              allLayers.push(layerEntry);
              initialState[entry.layer_name] = false;
              dropdownState[entry.layer_name] = false;
            }
          }
        }
  
        setLayers(allLayers); // this now contains objects, not just strings
        setSelectedLayers(initialState);
        setOpenDropdowns(dropdownState);
      })
      .catch((err) => console.error("Failed to fetch layer hierarchy:", err));
  }, []);  

  const formatLayerName = (name) =>
    name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const handleToggle = (layer) => {
    const updated = {
      ...selectedLayers,
      [layer]: !selectedLayers[layer],
    };
    setSelectedLayers(updated);
    onLayerToggle(layer, !selectedLayers[layer]);
  };

  const toggleDropdown = (layer) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [layer]: !prev[layer],
    }));
  };

  const handleViewAttributes = (layer) => {
    setLoadingAttributes(true);
    fetch(`http://localhost:8000/api/geojson/${layer}`)
      .then((res) => res.json())
      .then((geojson) => {
        if (geojson.features && geojson.features.length > 0) {
          const attributes = geojson.features.map((feature) => ({
            ...feature.properties,
            geometry: feature.geometry,
          }));
          setAttributeData(attributes);
        } else {
          setAttributeData([]);
        }
        setActiveLayer(layer);
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

  const handleDownloadShp = (layer) => {
    const link = document.createElement("a");
    link.href = `http://localhost:8001/api/shapefiles/${layer}.zip`;
    link.download = `${layer}.zip`;
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
                      <li key={layer.layer_name} className="layer-item">
                        <div className="layer-header">
                          <label>
                            <input
                              type="checkbox"
                              checked={selectedLayers[layer.layer_name] || false}
                              onChange={() => handleToggle(layer.layer_name)}
                            />
                            {layer.display_name}
                          </label>
                          <button
                            className={`dropdown-toggle ${openDropdowns[layer.layer_name] ? "open" : ""}`}
                            onClick={() => toggleDropdown(layer.layer_name)}
                            aria-label="Toggle layer options"
                          >
                            {openDropdowns[layer.layer_name] ? "▲" : "▼"}
                          </button>
                        </div>
                        {openDropdowns[layer.layer_name] && (
                          <ul className="dropdown-menu">
                            <li onClick={() => handleViewAttributes(layer.layer_name)}>
                              View Attribute Table
                            </li>
                            <li onClick={() => setConfirmDownloadLayer(layer.layer_name)}>
                              Download SHP File
                            </li>
                            <li
                              onClick={() =>
                                window.open(`http://localhost:8000/api/metadata_html/${layer.layer_name}`, "_blank")
                              }
                            >
                              View Metadata
                            </li>
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
          title={`${formatLayerName(activeLayer)} - Attribute Table`}
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
    </div>
  );
};

export default Sidebar;
