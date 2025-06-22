import React, { useState } from 'react';

export default function SearchBar({ map }) {
  const [query, setQuery] = useState("");

  const handleSearch = async () => {
    if (!query) return;

    try {
      const res = await fetch(`http://localhost:8000/api/geocode?query=${encodeURIComponent(query)}`);
      
      // First, check if the response was successful (HTTP status code 200-299)
      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.detail || `HTTP error! Status: ${res.status}`);
      }

      const data = await res.json();

      if (data && data.lat && data.lon) {
        const { lat, lon, bounds } = data; // extract 'bounds' from json response

        let useFitBoundsForThisQuery = false;
        const defaultCountryZoom = 3.5; // general zoom for large continental countries
        const defaultCityZoom = 10;   // general zoom for cities
        const globalSpanThreshold = 100; // Degrees longitude. Adjust this based on your testing.

        let longitudeSpan = 0; // Initialize outside if block

        if (bounds && bounds.length === 4) {
            const minLon = parseFloat(bounds[0]);
            const maxLon = parseFloat(bounds[2]);
            longitudeSpan = Math.abs(maxLon - minLon);

            if (longitudeSpan < globalSpanThreshold) {
                useFitBoundsForThisQuery = true;
                console.log('Decision: Bounding box within threshold, will attempt fitBounds.');
            } else {
                console.log('Decision: Bounding box too wide (span >= threshold), will use fixed flyTo zoom.');
            }
        } else {
            console.log('Decision: No valid bounds received, will use fixed flyTo zoom (city default, or adjusted if it was a country without bounds).');
        }

        if (useFitBoundsForThisQuery) {
            const fitBoundsOptions = { 
                padding: { top: 50, bottom: 50, left: 50, right: 50 },
                duration: 1000, // Smooth animation
                maxZoom: 15, // Prevent zooming in TOO close in
                minZoom: 5   // Prevent zooming out TOO far out
            };
            map.fitBounds(bounds, fitBoundsOptions);
        } else { // for the cases when we're NOT using fitBounds 
            let zoomToUse;

            // 1. for queries like "United States" that have global bounds, use the preset zoom level to prevent zooming out too mucn
            if (bounds && bounds.length === 4 && longitudeSpan >= globalSpanThreshold) {
                zoomToUse = defaultCountryZoom;
            } else {
                // 2. for queries that might not have bounds, or very specific points, use the preset zoom level
                zoomToUse = defaultCityZoom;
            }
            map.flyTo({ center: [lon, lat], zoom: zoomToUse, duration: 1000 });
        }
      } else {
        alert("Location not found. Please try a different query.");
      }
    } catch (error) {
      console.error("Search failed:", error);
      alert(`Search failed: ${error.message || error}`); // Show error to user
    }
  };

  return (
    <div style={{ position: "absolute", top: 10, right: 10, zIndex: 999 }}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search for a location..."
        style={{ padding: '6px', width: '200px', borderRadius: '4px' }}
      />
      <button onClick={handleSearch} style={{ marginLeft: '5px', padding: '5px' }}>
        Search
      </button>
    </div>
  );
}
