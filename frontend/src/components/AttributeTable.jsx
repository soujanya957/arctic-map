// Enhanced AttributeTable.jsx with ArcGIS-style query refinement
import React, { useState } from "react";
import bboxPolygon from "@turf/bbox-polygon";
import booleanPointInPolygon from "@turf/boolean-point-in-polygon";
import distance from "@turf/distance";
import { point as turfPoint } from "@turf/helpers";

const AttributeTable = ({ data, fieldTypes }) => {
  const [queryField, setQueryField] = useState("");
  const [queryOperator, setQueryOperator] = useState("");
  const [queryValue, setQueryValue] = useState("");
  const [spatialFilterType, setSpatialFilterType] = useState("");
  const [spatialFilterValue, setSpatialFilterValue] = useState(null);
  const [submittedQuery, setSubmittedQuery] = useState(null);

  const applyAttributeFilter = (row) => {
    if (!submittedQuery) return true;
    const { field, operator, value } = submittedQuery;
    const fieldType = fieldTypes[field];
    const rowValue = row[field];

    if (fieldType === "number") {
      const num = parseFloat(value);
      if (isNaN(num)) return true;
      if (operator === "==") return rowValue === num;
      if (operator === ">") return rowValue > num;
      if (operator === "<") return rowValue < num;
    } else {
      const str = rowValue?.toString().toLowerCase();
      const input = value.toLowerCase();
      if (!str) return false;
      if (operator === "contains") return str.includes(input);
      if (operator === "startsWith") return str.startsWith(input);
      if (operator === "endsWith") return str.endsWith(input);
    }

    return true;
  };

  const applySpatialFilter = (features) => {
    if (!spatialFilterType || !spatialFilterValue) return features;

    return features.filter((row) => {
      const geom = row.geometry;
      if (!geom || geom.type !== "Point") return false;

      const pt = turfPoint(geom.coordinates);

      if (spatialFilterType === "within") {
        const coords = spatialFilterValue.split(",").map(Number);
        if (coords.length !== 4 || coords.some(isNaN)) return false;
        const bbox = bboxPolygon(coords);
        return booleanPointInPolygon(pt, bbox);
      }

      if (spatialFilterType === "near") {
        const { point, distance: maxDist } = spatialFilterValue;
        if (!point || typeof maxDist !== "number") return false;
        const [lng, lat] = point.split(",").map(Number);
        if ([lng, lat].some(isNaN)) return false;
        const center = turfPoint([lng, lat]);
        return distance(center, pt, { units: "kilometers" }) <= maxDist;
      }

      return true;
    });
  };

  const filteredData = applySpatialFilter(data.filter(applyAttributeFilter));

  return (
    <>
      <div className="query-bar">
        <div className="query-group">
          <label>Field</label>
          <select value={queryField} onChange={(e) => {
            setQueryField(e.target.value);
            setQueryOperator("");
            setQueryValue("");
          }}>
            <option value="">Select field</option>
            {Object.keys(fieldTypes).map((field) => (
              <option key={field} value={field}>{field}</option>
            ))}
          </select>
        </div>

        {queryField && (
          <div className="query-group">
            <label>Operator</label>
            <select value={queryOperator} onChange={(e) => setQueryOperator(e.target.value)}>
              <option value="">Select operator</option>
              {fieldTypes[queryField] === "number" ? (
                ["==", ">", "<"].map(op => <option key={op} value={op}>{op}</option>)
              ) : (
                ["contains", "startsWith", "endsWith"].map(op => <option key={op} value={op}>{op}</option>)
              )}
            </select>
          </div>
        )}

        {queryOperator && (
          <div className="query-group">
            <label>Value</label>
            <input
              type={fieldTypes[queryField] === "number" ? "number" : "text"}
              value={queryValue}
              onChange={(e) => setQueryValue(e.target.value)}
            />
          </div>
        )}

        <div className="query-group">
          <label>Spatial Filter</label>
          <select value={spatialFilterType} onChange={(e) => {
            setSpatialFilterType(e.target.value);
            setSpatialFilterValue(null);
          }}>
            <option value="">None</option>
            <option value="within">Within Bounding Box</option>
            <option value="near">Near Point</option>
          </select>
        </div>

        {spatialFilterType === "within" && (
          <div className="query-group">
            <label>Bounding Box (minLng,minLat,maxLng,maxLat)</label>
            <input
              type="text"
              placeholder="-75,40,-74,41"
              value={spatialFilterValue || ""}
              onChange={(e) => setSpatialFilterValue(e.target.value)}
            />
          </div>
        )}

        {spatialFilterType === "near" && (
          <>
            <div className="query-group">
              <label>Point (lng,lat)</label>
              <input
                type="text"
                placeholder="-74.5,40.7"
                value={spatialFilterValue?.point || ""}
                onChange={(e) =>
                  setSpatialFilterValue((prev) => ({
                    ...prev,
                    point: e.target.value
                  }))
                }
              />
            </div>
            <div className="query-group">
              <label>Distance (km)</label>
              <input
                type="number"
                min="0"
                placeholder="10"
                value={spatialFilterValue?.distance || ""}
                onChange={(e) =>
                  setSpatialFilterValue((prev) => ({
                    ...prev,
                    distance: parseFloat(e.target.value)
                  }))
                }
              />
            </div>
          </>
        )}

        <div className="query-group">
          <label>&nbsp;</label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <button
              className="query-submit-btn"
              onClick={() =>
                setSubmittedQuery({ field: queryField, operator: queryOperator, value: queryValue })
              }
            >
              Submit
            </button>
            <button
              className="query-reset-btn"
              onClick={() => {
                setQueryField("");
                setQueryOperator("");
                setQueryValue("");
                setSpatialFilterType("");
                setSpatialFilterValue(null);
                setSubmittedQuery(null);
              }}
            >
              Reset
            </button>
          </div>
        </div>
      </div>

      <div className="table-container">
        {filteredData.length > 0 ? (
          <table>
            <thead>
              <tr>
                {Object.keys(filteredData[0]).map((key) =>
                  key !== "geometry" ? <th key={key}>{key}</th> : null
                )}
              </tr>
            </thead>
            <tbody>
              {filteredData.map((row, idx) => (
                <tr key={idx}>
                  {Object.entries(row).map(
                    ([key, val], i) =>
                      key !== "geometry" && (
                        <td key={i}>{val !== null ? val.toString() : ""}</td>
                      )
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          <p className="empty-message">No matching records found.</p>
        )}
      </div>
    </>
  );
};

export default AttributeTable;
