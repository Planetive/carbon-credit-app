const CATEGORY_TITLES: Record<string, string> = {
  stationaryFuelCombustion: "Scope 1 - Stationary Fuel Combustion",
  scope3ModeSelection: "Scope 3 - Method Selection",
  flaring: "Scope 1 - Flaring",
  venting: "Scope 1 - Venting",
  vehicularCarbonFootprints: "Scope 1 - Vehicular Carbon Footprints",
  kitchenFootprints: "Scope 1 - Kitchen Footprints",
  powerFuelConsumption: "Scope 1 - Fuel Consumption for Power",
  heatingFootprints: "Scope 1 - Heating",
  roadTransport: "Scope 3 - Road Transport",
  roadTransportVehicleType: "Scope 3 - Road Transport with Vehicle Type",
  usaGasolineDieselVehicles: "Scope 3 - USA Gasoline and Diesel Vehicles",
  alternativeFuelVehicles: "Scope 3 - Alternative Fuel Vehicles",
};

const CATEGORY_DESCRIPTIONS: Record<string, string> = {
  scope3ModeSelection: "Select the IPCC tier approach that best matches your data depth and reporting objective.",
  stationaryFuelCombustion: "Estimate Scope 1 emissions from stationary fuel use by entering fuel type, quantity, and unit.",
  flaring: "Estimate Scope 1 flaring emissions from flare gas volume and gas composition.",
  venting: "Estimate Scope 1 venting emissions from gas volume, composition, and gas warming impact.",
  vehicularCarbonFootprints: "Estimate Scope 1 vehicle emissions from diesel and petrol consumption in litres.",
  kitchenFootprints: "Estimate Scope 1 kitchen emissions from LPG and natural gas consumption using your GHV input.",
  powerFuelConsumption: "Estimate Scope 1 power-generation emissions from diesel and natural gas usage.",
  heatingFootprints: "Estimate Scope 1 heating emissions from natural gas consumption and GHV.",
  roadTransport: "Estimate Scope 3 road-transport emissions by selecting vehicle and fuel details.",
  roadTransportVehicleType: "Estimate Scope 3 transport emissions using detailed vehicle-type and fuel combinations.",
  usaGasolineDieselVehicles: "Estimate Scope 3 emissions for gasoline and diesel vehicle activity scenarios.",
  alternativeFuelVehicles: "Estimate Scope 3 emissions for alternative-fuel vehicle activity scenarios.",
};

export const getIPCCCategoryTitle = (activeCategory: string): string =>
  CATEGORY_TITLES[activeCategory] || "Scope 2 - Industry Emissions";

export const getIPCCCategoryDescription = (activeCategory: string, selectedIndustry: string): string =>
  CATEGORY_DESCRIPTIONS[activeCategory] || `Estimate Scope 2 industry emissions for ${selectedIndustry}.`;
