import React, { useState, useEffect } from "react";
import "../styles/Sidebar.css";
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

const Sidebar = ({ onLayerToggle, isThematicMode, onThematicModeToggle, isSidebarOpen }) => {
  const [layers, setLayers] = useState([]);
  const [selectedLayers, setSelectedLayers] = useState({});
  const [openDropdowns, setOpenDropdowns] = useState({});
  const [attributeData, setAttributeData] = useState([]);
  const [activeLayerForAttributeTable, setActiveLayerForAttributeTable] = useState(null);
  const [showPopup, setShowPopup] = useState(false);
  const [loadingAttributes, setLoadingAttributes] = useState(false);
  const [confirmDownloadLayer, setConfirmDownloadLayer] = useState(null);
  const [showBatchDownloadPopup, setShowBatchDownloadPopup] = useState(false);
  const [showAboutPopup, setShowAboutPopup] = useState(false);

  useEffect(() => {
    fetch("http://localhost:8000/api/layer_hierarchy")
      .then((res) => res.json())
      .then((data) => {
        const themeGroups = [];
        const initialState = {};
        const dropdownState = {};
  
        for (const theme in data) {
          const subthemesForCurrentTheme = [];

          for (const subtheme in data[theme]) {
            const datasets = data[theme][subtheme];
            const formattedDatasets = datasets.map(entry => {
              initialState[entry.layer_name] = false;
              return {
                layer_name: entry.layer_name,
                display_name: entry.display_name,
                theme: entry.theme,
                subtheme: entry.subtheme
              };
            });
            
            const uniqueSubthemeId = `${theme}-${subtheme}`; 

            subthemesForCurrentTheme.push({
              id: uniqueSubthemeId,
              name: subtheme,
              datasets: formattedDatasets
            });
            dropdownState[uniqueSubthemeId] = false;
          }

          themeGroups.push({
            id: theme, 
            name: theme,
            subthemes: subthemesForCurrentTheme
          });
        }
        setLayers(themeGroups);
        setSelectedLayers(initialState);
        setOpenDropdowns(dropdownState);
      })
      .catch((err) => console.error("Failed to fetch layer hierarchy:", err));
  }, []);  

  const formatLayerName = (name) =>
    name.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());

  const handleToggle = (layer) => {
    const newValue = !selectedLayers[layer];
    const updated = {
      ...selectedLayers,
      [layer]: newValue,
    };
    setSelectedLayers(updated);
    onLayerToggle(layer, newValue); // Use the new value, not the old negated value
  };

  const toggleDropdown = (subtheme) => {
    setOpenDropdowns((prev) => ({
      ...prev,
      [subtheme]: !prev[subtheme],
    }));
  };

  const handleViewAttributes = (layer) => {
    setLoadingAttributes(true);
    fetch(`http://localhost:8000/api/geojson/${layer}`)
      .then((res) => res.json())
      .then((geojson) => {

        if (geojson && geojson.type == "FeatureCollection" && geojson.features && geojson.features.length > 0) {
          const attributes = geojson.features.map((feature) => ({
            ...feature.properties,
            geometry: feature.geometry,
          }));
          setAttributeData(attributes);
        } else {
          setAttributeData([]);
        }
        setActiveLayerForAttributeTable(layer);
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
    <div className={`sidebar ${isSidebarOpen ? '' : 'sidebar-collapsed'}`}>
      
      <div className="sidebar-instructions">
        {/* Make header clickable to open the new popup */}
        <div className="about-header-container">
          <h3
            onClick={() => setShowAboutPopup(true)}
            style={{ cursor: 'pointer' }}
          >
            About Arctic Map ⓘ
          </h3>
          
        </div>

        {/* Thematic Mode Toggle Switch and Label */}
        <div className="toggle-container">
          <label htmlFor="thematic-mode-toggle" className="toggle-switch">
            <input
              type="checkbox"
              id="thematic-mode-toggle"
              checked={isThematicMode}
              onChange={onThematicModeToggle}
            />
            <span className="slider"></span>
          </label>
          <span className="toggle-label-text">
            {isThematicMode ? "Switch to Main Map" : "Switch to Thematic Map"}
          </span>
        </div>
      </div>

      <div className="sidebar-data-layers">
        <h2>Dataset Layers</h2>
        
        <ul className="layer-list">
          {layers.map((themeGroup) => ( 
            <li key={themeGroup.id} className="theme-item">
              <h3 className="theme-header">{formatLayerName(themeGroup.name)}</h3>
              <ul className="subtheme-list">
                {themeGroup.subthemes.map((subthemeGroup) => (
                  <li key={subthemeGroup.id} className="subtheme-item"> 
                    <div 
                      className="layer-group-header"
                      onClick={() => toggleDropdown(subthemeGroup.id)} 
                    >
                      <h3>{formatLayerName(subthemeGroup.name)}</h3>
                      <span className={`collapse-icon ${openDropdowns[subthemeGroup.id]}`}
                      >
                        {openDropdowns[subthemeGroup.id] ? "▼" : "▶"} 
                      </span>
                    </div>
                    {openDropdowns[subthemeGroup.id] && (
                      <ul className="subtheme-dataset-list">
                        {subthemeGroup.datasets.map((dataset) => (
                        <li key={dataset.layer_name} className="dataset-item-row">
                          <label>
                          <input
                            type="checkbox"
                            checked={selectedLayers[dataset.layer_name] || false}
                            onChange={() => handleToggle(dataset.layer_name)}
                          />
                          {dataset.display_name}
                          </label>
                          <div className="layer-actions-below">
                            <button onClick={() => handleViewAttributes(dataset.layer_name)}>
                              View Attributes
                            </button>
                            <button onClick={() => setConfirmDownloadLayer(dataset.layer_name)}>
                              Download
                            </button>
                            <button onClick={() => window.open(`http://localhost:8000/api/metadata_html/${dataset.layer_name}`, "_blank")}>
                              View Metadata
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                    )}
                  </li>
                ))}
              </ul>
            </li>
          ))}
        </ul>
      </div>

      <button className="download-all-btn" onClick={handleDownloadAll}>
        ⬇ Download All Selected Layers
      </button>

      {showAboutPopup && (
        <Popup title="About Arctic Map" onClose={() => setShowAboutPopup(false)}>
          <p>
            Arctic Map is a tool for exploring & analyzing a robust collection of 80+ cleaned, geospatial datasets related to the Arctic region.
            Explore the app's following features: 
          </p>
          <ul style={{ paddingLeft: '20px', fontSize: '0.9em' }}>
            <li>
              <strong>Layers:</strong> Toggle layers on and off to visualize different datasets.
            </li>
            <li>
              <strong>Spatial Query:</strong> Use the drawing tools to select an area and find intersecting features.
            </li>
            <li>
              <strong>Download Data:</strong> Download entire datasets as zipped shapefiles and custom areas/queries as GeoJSON files. 
            </li>
            <li>
              <strong>Thematic Map:</strong> Switch to Thematic Mode to color map layers based on attribute data.
            </li>
            <li>
              <strong>Search:</strong> Use the search bar to find locations and features of interest.
            </li>
          </ul>

          <p>
            This web application is a project of the <a href="https://nna-cpad.org/">CPAD consortium</a> and is licensed under the <a href="https://opensource.org/licenses/MIT">MIT License</a>.
          </p>

          <p>
            Credits: Developed by Brown University students Soujanya Aryal and Noreen Chen.
          </p>
        </Popup>
      )}

      {showPopup && (
        <Popup
          title={`${formatLayerName(activeLayerForAttributeTable)} - Attribute Table`}
          onClose={() => setShowPopup(false)}
        >
          {loadingAttributes ? (
            <p>Loading attributes...</p>
          ) : (
            <AttributeTable data={attributeData} fieldTypes={fieldTypes} layerName={activeLayerForAttributeTable}/>
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