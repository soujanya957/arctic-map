const thematicMapConfigs = {
  "environmental_data": { // shapefile name is various_environmental_rasters.shp
    layerName: "environmental_data",
    attributes: [
      { id: "bathymetry", name: "Bathymetry", units: "meters", description: "This raster attribute represents global gridded bathymetric data that includes sub-ice topography, representing seafloor elevation beneath permanent ice cover." },
      { id: "cs_500_sub", name: "Nightlights", units: "nanoWatts/sr/cm^2", description: "This raster attribute shows nightlights." },
      { id: "no2_canada", name: "NO2 Canada", units: "mol/m^2", description: "This raster attribute shows NO2 concentrations over a large portion of Canada and the waters directly surrounding it. " },
      { id: "no2_icelan", name: "NO2 Iceland", units: "mol/m^2", description: "This raster attribute shows NO2 concentrations over a large portion of Iceland and the waters directly surrounding it." },
      { id: "permaf_pro", name: "Permafrost Probability", units: "Fraction", description: "This raster attribute shows permafrost occurrence probability with fraction values from 0 to 1 assigned to each grid cell with MAGT < 0°C." },
      { id: "topograp_e", name: "Topography Elevation", units: "meters", description: "This raster attribute represents global topography of elevation at a 1km resolution using a median aggregation. The data is based on the digital elevation model product of global 250 m GMTED2010." }
    ],
  },
  // add other layers here if needed
};

export default thematicMapConfigs;