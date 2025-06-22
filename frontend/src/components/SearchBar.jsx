import React, { useState } from 'react';

export default function SearchBar({ map }) {
  const [query, setQuery] = useState("");

  const handleSearch = async () => {
    if (!query) return;

    try {
      const res = await fetch(`http://localhost:8000/api/geocode?query=${encodeURIComponent(query)}`);
      const data = await res.json();
      console.log("Geocode result:", data);

      if (data && data.lat && data.lon) {
        map.flyTo({
          center: [data.lon, data.lat],
          zoom: 8,
          essential: true
        });
      } else {
        alert("Location not found.");
      }
    } catch (error) {
      console.error("Search failed:", error);
    }
  };

  return (
    <div style={{ position: "absolute", top: 10, right: 10, zIndex: 999 }}>
      <input
        value={query}
        onChange={e => setQuery(e.target.value)}
        placeholder="Search for a city or country..."
        style={{ padding: '6px', width: '200px', borderRadius: '4px' }}
      />
      <button onClick={handleSearch} style={{ marginLeft: '5px', padding: '5px' }}>
        Search
      </button>
    </div>
  );
}
