import React, { useRef, useEffect, useState, useCallback } from 'react';
import MapboxDraw from '@mapbox/mapbox-gl-draw';
import '@mapbox/mapbox-gl-draw/dist/mapbox-gl-draw.css';

const DrawControls = ({ map, onDrawGeometry }) => {
  const draw = useRef(null);
  const [drawMode, setDrawMode] = useState(false);

  const handleDrawChange = useCallback(() => {
    if (!draw.current) return;
    const features = draw.current.getAll().features;
    if (features.length > 0 && onDrawGeometry) {
      onDrawGeometry(features[features.length - 1]);
    }
  }, [onDrawGeometry]);

  useEffect(() => {
    if (!map) return; 

    // This part runs ONLY when drawMode becomes true and the draw tool isn't already active
    if (drawMode && !draw.current) {
      draw.current = new MapboxDraw({
        displayControlsDefault: false,
        controls: {
          polygon: true,
          point: true,
          line_string: true,
          trash: true,
        },
      });
      map.addControl(draw.current, 'top-left');
      map.on('draw.create', handleDrawChange);
      map.on('draw.update', handleDrawChange);
      map.on('draw.delete', () => {
        if (onDrawGeometry) onDrawGeometry(null);
      });
    }

    // Cleanup function runs when the component unmounts OR when `drawMode` changes
    return () => {
      if (map && draw.current) { 
        map.removeControl(draw.current);
        map.off('draw.create', handleDrawChange);
        map.off('draw.update', handleDrawChange);
        map.off('draw.delete');

        draw.current = null; 
        if (onDrawGeometry && drawMode) { // Clear drawn geometry if user exits draw mode
            onDrawGeometry(null);
        }
      }
    };
  }, [drawMode, map, handleDrawChange, onDrawGeometry]);

  return (
    <>
      <button
        style={{
          position: 'absolute',
          top: 50,
          right: 10,
          zIndex: 10,
          background: drawMode ? '#1976d2' : '#f7f7f7',
          color: drawMode ? '#fff' : '#1976d2',
          border: '1.5px solid#1976d2',
          borderRadius: 5,
          padding: '7px 14px',
          fontWeight: 500,
          fontSize: 15,
          cursor: 'pointer',
          outline: 'none',
        }}
        onClick={() => {
          setDrawMode((prev) => !prev);
          // If exiting draw mode, immediately clear any of the user's drawn features
          if (draw.current && drawMode) { 
              draw.current.deleteAll();
              if (onDrawGeometry) onDrawGeometry(null);
          }
        }}
        title="Draw for Spatial Queries"
      >
        {drawMode ? 'Exit Draw' : 'Draw for Spatial Query'}
      </button>

      {drawMode && (
        <div
          style={{
            position: 'absolute',
            top: 93,
            right: 10,
            zIndex: 10,
            background: 'rgba(255,255,255,0.95)',
            borderRadius: 5,
            padding: '7px 12px',
            fontSize: 13,
            color: '#1976d2',
            border: '1px solid #e0e0e0',
            maxWidth: 200,
            lineHeight: 1.5,
          }}
        >
          Draw a polygon, line, or point.<br />
          Use the trash icon to delete.
        </div>
      )}
    </>
  );
};

export default DrawControls;