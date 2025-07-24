// import React, { useState, useEffect } from "react";

// const SPATIAL_OPERATIONS = [
//   { value: "intersects", label: "Intersects" },
//   { value: "within", label: "Within" },
//   { value: "contains", label: "Contains" },
//   { value: "touches", label: "Touches" },
//   { value: "crosses", label: "Crosses" },
//   { value: "overlaps", label: "Overlaps" },
//   { value: "equals", label: "Equals" },
//   { value: "disjoint", label: "Disjoint" },
// ];

// function FeatureTable({ features }) {
//   if (!features || features.length === 0) return <div className="empty-message">No results found.</div>;
//   // Collect all unique property keys
//   const allKeys = Array.from(
//     features.reduce((set, f) => {
//       Object.keys(f.properties || {}).forEach((k) => set.add(k));
//       return set;
//     }, new Set())
//   );
//   return (
//     <div className="spatial-query-table-container">
//       <table className="spatial-query-table">
//         <thead>
//           <tr>
//             {allKeys.map((k) => (
//               <th key={k}>{k}</th>
//             ))}
//           </tr>
//         </thead>
//         <tbody>
//           {features.map((f, i) => (
//             <tr key={i}>
//               {allKeys.map((k) => (
//                 <td key={k}>
//                   {String(f.properties?.[k] ?? "")}
//                 </td>
//               ))}
//             </tr>
//           ))}
//         </tbody>
//       </table>
//     </div>
//   );
// }

// export default function SpatialQueryPopup({ onClose }) {
//   const [layers, setLayers] = useState([]);
//   const [layer, setLayer] = useState("");
//   const [operation, setOperation] = useState("intersects");
//   const [geometry, setGeometry] = useState("");
//   const [result, setResult] = useState(null);
//   const [error, setError] = useState("");
//   const [layerSearch, setLayerSearch] = useState("");
//   const [loadingLayers, setLoadingLayers] = useState(true);
//   const [loadingQuery, setLoadingQuery] = useState(false);

//   // Fetch layers from backend on mount
//   useEffect(() => {
//     setLoadingLayers(true);
//     fetch("http://localhost:8000/api/layers")
//       .then((res) => res.json())
//       .then((data) => {
//         setLayers(data.layers || []);
//         setLoadingLayers(false);
//       })
//       .catch(() => {
//         setLayers([]);
//         setLoadingLayers(false);
//       });
//   }, []);

//   // Filter layers based on search
//   const filteredLayers = layers.filter((l) =>
//     l.toLowerCase().includes(layerSearch.toLowerCase())
//   );

//   // Set default layer when layers or search changes
//   useEffect(() => {
//     if (filteredLayers.length > 0) {
//       setLayer(filteredLayers[0]);
//     } else {
//       setLayer("");
//     }
//     // eslint-disable-next-line
//   }, [layerSearch, layers]);

//   const handleSubmit = async (e) => {
//     e.preventDefault();
//     setError("");
//     setResult(null);
//     setLoadingQuery(true);

//     let parsedGeometry;
//     try {
//       parsedGeometry = JSON.parse(geometry);
//     } catch {
//       setError("Invalid GeoJSON geometry.");
//       setLoadingQuery(false);
//       return;
//     }

//     try {
//       const res = await fetch("http://localhost:8000/api/spatial-query", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({
//           layer_name: layer,
//           geometry: parsedGeometry,
//           operation,
//         }),
//       });
//       if (!res.ok) throw new Error(await res.text());
//       const data = await res.json();
//       setResult(data.geojson?.features || []);
//     } catch (err) {
//       setError("Query failed: " + err.message);
//     }
//     setLoadingQuery(false);
//   };

//   return (
//     <div className="attribute-popup" role="dialog" aria-modal="true">
//       <div className="popup-content spatial-query-popup-content">
//         <h3>Spatial Query</h3>
//         <button className="close-btn" onClick={onClose}>✕</button>
//         <form onSubmit={handleSubmit} autoComplete="off">
//           <div className="query-group">
//             <label htmlFor="layer-search">Search Layer:</label>
//             <input
//               id="layer-search"
//               type="text"
//               value={layerSearch}
//               onChange={e => setLayerSearch(e.target.value)}
//               placeholder="Type to search layers..."
//               autoFocus
//               disabled={loadingLayers}
//             />
//           </div>
//           <div className="query-group">
//             <label htmlFor="layer-select">Layer:</label>
//             <select
//               id="layer-select"
//               value={layer}
//               onChange={e => setLayer(e.target.value)}
//               required
//               disabled={loadingLayers}
//             >
//               {filteredLayers.length === 0 && (
//                 <option value="" disabled>
//                   No layers found
//                 </option>
//               )}
//               {filteredLayers.map(l => (
//                 <option key={l} value={l}>{l}</option>
//               ))}
//             </select>
//           </div>
//           <div className="query-group">
//             <label htmlFor="operation-select">Operation:</label>
//             <select
//               id="operation-select"
//               value={operation}
//               onChange={e => setOperation(e.target.value)}
//             >
//               {SPATIAL_OPERATIONS.map(op => (
//                 <option key={op.value} value={op.value}>{op.label}</option>
//               ))}
//             </select>
//           </div>
//           <div className="query-group">
//             <label htmlFor="geometry-input">Geometry (GeoJSON):</label>
//             <textarea
//               id="geometry-input"
//               value={geometry}
//               onChange={e => setGeometry(e.target.value)}
//               placeholder='{"type":"Polygon","coordinates":[[[...]]]}'
//               rows={4}
//               required
//             />
//             <div style={{ fontSize: 12, color: "#888" }}>
//               (Paste GeoJSON geometry. Drawing coming soon!)
//             </div>
//           </div>
//           <div className="button-row" style={{ marginTop: 16 }}>
//             <button type="submit" disabled={!layer || !geometry || loadingQuery}>
//               {loadingQuery ? "Running..." : "Run Query"}
//             </button>
//           </div>
//         </form>
//         {error && <div style={{ color: "red", marginTop: 8 }}>{error}</div>}
//         {result && (
//           <div style={{ marginTop: 16 }}>
//             <b>Results: {result.length} features found.</b>
//             <FeatureTable features={result} />
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }
