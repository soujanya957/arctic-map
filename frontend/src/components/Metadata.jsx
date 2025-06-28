// Metadata.jsx

import React, { useState } from "react";
import "./Sidebar.css";

// Pretty-print XML with indentation
function formatXml(xml) {
  if (!xml) return "";
  let formatted = "";
  const reg = /(>)(<)(\/*)/g;
  xml = xml.replace(reg, "$1\n$2$3");
  let pad = 0;
  xml.split("\n").forEach((node) => {
    let indent = 0;
    if (node.match(/.+<\/\w[^>]*>$/)) {
      indent = 0;
    } else if (node.match(/^<\/\w/)) {
      if (pad !== 0) pad -= 1;
    } else if (node.match(/^<\w([^>]*[^/])?>.*$/)) {
      indent = 1;
    } else {
      indent = 0;
    }
    const padding = "  ".repeat(pad);
    formatted += padding + node.trim() + "\n";
    pad += indent;
  });
  return formatted.trim();
}

// Parse XML string to DOM
function parseXml(xmlStr) {
  try {
    return new window.DOMParser().parseFromString(xmlStr, "text/xml");
  } catch {
    return null;
  }
}

// Get text content of first matching tag
function getText(xml, tag) {
  const el = xml.getElementsByTagName(tag)[0];
  return el ? el.textContent : "";
}

// Get all attribute fields
function getAttributes(xml) {
  const attrs = [];
  const detailed = xml.getElementsByTagName("detailed");
  if (detailed.length) {
    const attrEls = detailed[0].getElementsByTagName("attr");
    for (let i = 0; i < attrEls.length; i++) {
      const attr = attrEls[i];
      attrs.push({
        name: getText(attr, "attrlabl"),
        alias: getText(attr, "attalias"),
        type: getText(attr, "attrtype"),
        width: getText(attr, "attwidth"),
        description: getText(attr, "attrdef"),
      });
    }
  }
  return attrs;
}

const Metadata = ({ open, onClose, layerName, metadata, loading }) => {
  const [showRaw, setShowRaw] = useState(false);

  if (!open) return null;

  let formattedContent = null;
  let xml = null;

  if (!loading && metadata) {
    xml = parseXml(metadata);
    if (xml && xml.documentElement.nodeName !== "parsererror") {
      // Extract fields
      const title = getText(xml, "resTitle") || getText(xml, "itemName");
      const desc = getText(xml, "descriptio");
      const crs = getText(xml, "geogcsn") || getText(xml, "type");
      const created = getText(xml, "CreaDate");
      const modified = getText(xml, "ModDate");
      const attrs = getAttributes(xml);

      formattedContent = (
        <div>
          <div style={{ marginBottom: 12 }}>
            <strong>Title:</strong> {title || <em>(none)</em>}
          </div>
          {desc && (
            <div style={{ marginBottom: 12 }}>
              <strong>Description:</strong> {desc}
            </div>
          )}
          {crs && (
            <div style={{ marginBottom: 12 }}>
              <strong>CRS:</strong> {crs}
            </div>
          )}
          <div style={{ marginBottom: 12 }}>
            <strong>Created:</strong> {created || <em>(unknown)</em>}
            {" | "}
            <strong>Modified:</strong> {modified || <em>(unknown)</em>}
          </div>
          {attrs.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <strong>Attributes:</strong>
              <table style={{ width: "100%", fontSize: 13, marginTop: 6, borderCollapse: "collapse" }}>
                <thead>
                  <tr>
                    <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Name</th>
                    <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Alias</th>
                    <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Type</th>
                    <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Width</th>
                    <th style={{ borderBottom: "1px solid #ccc", textAlign: "left" }}>Description</th>
                  </tr>
                </thead>
                <tbody>
                  {attrs.map((a, i) => (
                    <tr key={i}>
                      <td>{a.name}</td>
                      <td>{a.alias}</td>
                      <td>{a.type}</td>
                      <td>{a.width}</td>
                      <td>{a.description}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      );
    }
  }

  return (
    <div className="attribute-popup" role="dialog" aria-modal="true">
      <div className="popup-content">
        <h3>{layerName ? `${layerName} - Meta data` : "Meta data"}</h3>
        <button className="close-btn" onClick={onClose}>✕</button>
        <div style={{ marginBottom: 16 }}>
          <button
            style={{
              background: showRaw ? "#eee" : "#0077cc",
              color: showRaw ? "#222" : "#fff",
              border: "none",
              borderRadius: "4px 0 0 4px",
              padding: "6px 16px",
              cursor: "pointer",
              fontWeight: showRaw ? 400 : 600,
              fontSize: 14,
              outline: "none",
            }}
            onClick={() => setShowRaw(false)}
            disabled={!metadata || loading || !formattedContent}
          >
            Formatted
          </button>
          <button
            style={{
              background: showRaw ? "#0077cc" : "#eee",
              color: showRaw ? "#fff" : "#222",
              border: "none",
              borderRadius: "0 4px 4px 0",
              padding: "6px 16px",
              cursor: "pointer",
              fontWeight: showRaw ? 600 : 400,
              fontSize: 14,
              outline: "none",
            }}
            onClick={() => setShowRaw(true)}
            disabled={!metadata || loading}
          >
            Raw XML
          </button>
        </div>
        {loading ? (
          <p>Loading metadata...</p>
        ) : !metadata ? (
          <p>No metadata found.</p>
        ) : showRaw ? (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 400,
              overflow: "auto",
              background: "#f5f5f5",
              padding: 12,
              borderRadius: 4,
              fontSize: 13,
              color: "#000",
            }}
          >
            {formatXml(metadata)}
          </pre>
        ) : formattedContent ? (
          formattedContent
        ) : (
          <pre
            style={{
              whiteSpace: "pre-wrap",
              wordBreak: "break-word",
              maxHeight: 400,
              overflow: "auto",
              background: "#f5f5f5",
              padding: 12,
              borderRadius: 4,
              fontSize: 13,
              color: "#000",
            }}
          >
            {formatXml(metadata)}
          </pre>
        )}
      </div>
    </div>
  );
};

export default Metadata;
