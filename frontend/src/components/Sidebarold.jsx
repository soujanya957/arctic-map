import React, { useState, useEffect } from "react";
import "./Sidebar.css";

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

  useEffect(() => {
    fetch("http://localhost:8000/api/layers")
      .then((res) => res.json())
      .then((data) => {
        if (data.layers) {
          const initialState = {};
          const dropdownState = {};
          data.layers.forEach((layer) => {
            initialState[layer] = false;
            dropdownState[layer] = false;
          });
          setLayers(data.layers);
          setSelectedLayers(initialState);
          setOpenDropdowns(dropdownState);
        }
      })
      .catch((err) => console.error("Failed to fetch layers:", err));
  }, []);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === "Escape") {
        if (showPopup) {
          e.preventDefault();
          e.stopPropagation();
          setShowPopup(false);
        }
        if (confirmDownloadLayer) {
          e.preventDefault();
          e.stopPropagation();
          setConfirmDownloadLayer(null);
        }
        if (showBatchDownloadPopup) {
          e.preventDefault();
          e.stopPropagation();
          setShowBatchDownloadPopup(false);
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [showPopup, confirmDownloadLayer, showBatchDownloadPopup]);

  const formatLayerName = (name) => {
    return name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  };

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
          const attributes = geojson.features.map((feature) => feature.properties || {});
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

  return (
    <div className="sidebar">
      <div className="sidebar-content">
        <h2>Layers</h2>
        {layers.length === 0 ? (
          <p>No layers available.</p>
        ) : (
          <ul className="layer-list">
            {layers.map((layer) => (
              <li key={layer} className="layer-item">
                <div className="layer-header">
                  <label>
                    <input
                      type="checkbox"
                      checked={selectedLayers[layer] || false}
                      onChange={() => handleToggle(layer)}
                    />
                    {formatLayerName(layer)}
                  </label>
                  <button
                    className={`dropdown-toggle ${openDropdowns[layer] ? "open" : ""}`}
                    onClick={() => toggleDropdown(layer)}
                    aria-label="Toggle layer options"
                  >
                    {openDropdowns[layer] ? "▲" : "▼"}
                  </button>
                </div>
                {openDropdowns[layer] && (
                  <ul className="dropdown-menu">
                    <li onClick={() => handleViewAttributes(layer)}>
                      View Attribute Table
                    </li>
                    <li onClick={() => setConfirmDownloadLayer(layer)}>
                      Download SHP File
                    </li>
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}

        <button className="download-all-btn" onClick={handleDownloadAll}>
          ⬇ Download Selected Layers
        </button>
      </div>

      {showPopup && (
        <div className="attribute-popup" role="dialog" aria-modal="true">
          <div className="popup-content">
            <h3 id="popup-title">{formatLayerName(activeLayer)} - Attribute Table</h3>
            <button className="close-btn" onClick={() => setShowPopup(false)}>✕</button>
            <div className="table-container">
              {loadingAttributes ? (
                <p>Loading attributes...</p>
              ) : attributeData.length > 0 ? (
                <table>
                  <thead>
                    <tr>
                      {Object.keys(attributeData[0]).map((key) => (
                        <th key={key}>{key}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {attributeData.map((row, idx) => (
                      <tr key={idx}>
                        {Object.values(row).map((val, i) => (
                          <td key={i}>{val !== null ? val.toString() : ""}</td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p className="empty-message">No attribute data available for this layer.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {confirmDownloadLayer && (
        <div className="attribute-popup" role="dialog" aria-modal="true">
          <div className="popup-content">
            <h3>Download Confirmation</h3>
            <p>Download <strong>{formatLayerName(confirmDownloadLayer)}</strong>'s shape files?</p>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button onClick={() => setConfirmDownloadLayer(null)}>No</button>
              <button onClick={confirmDownload}>Yes</button>
            </div>
          </div>
        </div>
      )}

      {showBatchDownloadPopup && (
        <div className="attribute-popup" role="dialog" aria-modal="true">
          <div className="popup-content">
            <h3>Download Selected Layers</h3>
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
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "20px" }}>
              <button onClick={() => setShowBatchDownloadPopup(false)}>Cancel</button>
              <button onClick={confirmBatchDownload} disabled={selectedLayerNames.length === 0}>
                Download
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Sidebar;
