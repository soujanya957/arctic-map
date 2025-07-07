// Sidebar.jsx

import React, { useState, useEffect } from "react";
import "./Sidebar.css";
import AttributeTable from "./AttributeTable";
import Metadata from "./Metadata";
import SpatialQueryPopup from "./SpatialQueryPopup";

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

  // Metadata popup state
  const [showMetadataPopup, setShowMetadataPopup] = useState(false);
  const [metadataContent, setMetadataContent] = useState("");
  const [loadingMetadata, setLoadingMetadata] = useState(false);
  const [metadataLayer, setMetadataLayer] = useState("");

  // Spatial Query popup state
  const [showSpatialQueryPopup, setShowSpatialQueryPopup] = useState(false);

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
        if (geojson.geojson && geojson.geojson.features && geojson.geojson.features.length > 0) {
          const attributes = geojson.geojson.features.map((feature) => ({
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

  // Handle "Meta data" click
  const handleViewMetadata = (layer) => {
    setLoadingMetadata(true);
    setMetadataLayer(formatLayerName(layer));
    fetch(`http://localhost:8000/api/geojson/${layer}`)
      .then((res) => res.json())
      .then((data) => {
        setMetadataContent(data.metadata || "No metadata found.");
        setShowMetadataPopup(true);
        setLoadingMetadata(false);
      })
      .catch((err) => {
        setMetadataContent("Failed to load metadata.");
        setShowMetadataPopup(true);
        setLoadingMetadata(false);
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
        <button
          className="spatial-query-btn"
          style={{ marginBottom: "1em" }}
          onClick={() => setShowSpatialQueryPopup(true)}
        >
          Spatial Queries
        </button>
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
                  />
                </div>
                {openDropdowns[layer] && (
                  <ul className="dropdown-menu">
                    <li onClick={() => handleViewAttributes(layer)}>
                      View Attribute Table
                    </li>
                    <li onClick={() => setConfirmDownloadLayer(layer)}>
                      Download SHP File
                    </li>
                    <li onClick={() => handleViewMetadata(layer)}>
                      Meta data
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

      {/* Metadata popup */}
      <Metadata
        open={showMetadataPopup}
        onClose={() => setShowMetadataPopup(false)}
        layerName={metadataLayer}
        metadata={metadataContent}
        loading={loadingMetadata}
      />

      {/* Spatial Query popup */}
      {showSpatialQueryPopup && (
        <SpatialQueryPopup onClose={() => setShowSpatialQueryPopup(false)} />
      )}
    </div>
  );
};

export default Sidebar;
