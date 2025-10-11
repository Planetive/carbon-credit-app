// Emission factors for all scopes

export const FACTORS: Record<string, Record<string, Record<string, number>>> = {
  "Gaseous fuels": {
    Butane: { tonnes: 3029.26, litres: 1.74296, "kWh (Net CV)": 0.24074, "kWh (Gross CV)": 0.2221 },
    CNG: { tonnes: 2570.42, litres: 0.44982, "kWh (Net CV)": 0.20229, "kWh (Gross CV)": 0.18259 },
    LNG: { tonnes: 2598.26, litres: 1.17568, "kWh (Net CV)": 0.20448, "kWh (Gross CV)": 0.18457 },
    LPG: { tonnes: 2935.18, litres: 1.55491, "kWh (Net CV)": 0.22999, "kWh (Gross CV)": 0.21419 },
    "Natural gas": { tonnes: 2570.42, "cubic metres": 2.0627, "kWh (Net CV)": 0.20229, "kWh (Gross CV)": 0.18259 },
    "Natural gas (100% mineral blend)": { tonnes: 2598.26, "cubic metres": 2.08504, "kWh (Net CV)": 0.20448, "kWh (Gross CV)": 0.18457 },
    "Other petroleum gas": { tonnes: 2575.7, litres: 0.94348, "kWh (Net CV)": 0.19897, "kWh (Gross CV)": 0.18305 },
    Propane: { tonnes: 2993.4, litres: 1.5414, "kWh (Net CV)": 0.23225, "kWh (Gross CV)": 0.21381 },
  },
  "Liquid fuels": {
    "Aviation spirit": { tonnes: 3127.67, litres: 2.28297, "kWh (Net CV)": 0.25135, "kWh (Gross CV)": 0.23878 },
    "Aviation turbine fuel": { tonnes: 3149.67, litres: 2.51973, "kWh (Net CV)": 0.25826, "kWh (Gross CV)": 0.24535 },
    "Burning oil": { tonnes: 3149.67, litres: 2.52782, "kWh (Net CV)": 0.25849, "kWh (Gross CV)": 0.24557 },
    "Diesel (average biofuel blend)": { tonnes: 3048.71, litres: 2.53763, "kWh (Net CV)": 0.2562, "kWh (Gross CV)": 0.24098 },
    "Diesel (100% mineral diesel)": { tonnes: 3164.33, litres: 2.62818, "kWh (Net CV)": 0.26475, "kWh (Gross CV)": 0.24887 },
    "Fuel oil": { tonnes: 3216.38, litres: 3.16262, "kWh (Net CV)": 0.28413, "kWh (Gross CV)": 0.26709 },
    "Gas oil": { tonnes: 3190.0, litres: 2.72417, "kWh (Net CV)": 0.26978, "kWh (Gross CV)": 0.25359 },
    "Lubricants": { tonnes: 3171.09, litres: 2.74078, "kWh (Net CV)": 0.28013, "kWh (Gross CV)": 0.26332 },
    "Naphtha": { tonnes: 3131.33, litres: 2.11149, "kWh (Net CV)": 0.24804, "kWh (Gross CV)": 0.23564 },
    "Petrol (average biofuel blend)": { tonnes: 2754.25, litres: 2.05523, "kWh (Net CV)": 0.23026, "kWh (Gross CV)": 0.21811 },
    "Petrol (100% mineral petrol)": { tonnes: 3135.0, litres: 2.32567, "kWh (Net CV)": 0.25276, "kWh (Gross CV)": 0.24013 },
    "Processed fuel oils - residual oil": { tonnes: 3216.38, litres: 3.16262, "kWh (Net CV)": 0.28413, "kWh (Gross CV)": 0.26709 },
    "Processed fuel oils - distillate oil": { tonnes: 3190.0, litres: 2.72417, "kWh (Net CV)": 0.26978, "kWh (Gross CV)": 0.25359 },
    "Refinery miscellaneous": { tonnes: 2933.33, "kWh (Net CV)": 0.25864, "kWh (Gross CV)": 0.24571 },
    "Waste oils": { tonnes: 3171.09, litres: 2.70801, "kWh (Net CV)": 0.27047, "kWh (Gross CV)": 0.25256 },
    "Marine gas oil": { tonnes: 3205.99, litres: 2.73782, "kWh (Net CV)": 0.27113, "kWh (Gross CV)": 0.25486 },
    "Marine fuel oil": { tonnes: 3113.99, litres: 3.06194, "kWh (Net CV)": 0.27509, "kWh (Gross CV)": 0.25858 },
  },
  "Solid fuels": {
    "Coal (industrial)": { tonnes: 2370.72, "kWh (Net CV)": 0.33595, "kWh (Gross CV)": 0.31915 },
    "Coal (electricity generation)": { tonnes: 2213.33, "kWh (Net CV)": 0.33443, "kWh (Gross CV)": 0.3177 },
    "Coal (domestic)": { tonnes: 2632.0, "kWh (Net CV)": 0.33115, "kWh (Gross CV)": 0.31459 },
    "Coking coal": { tonnes: 3144.16, "kWh (Net CV)": 0.37431, "kWh (Gross CV)": 0.35559 },
    "Petroleum coke": { tonnes: 3377.05, "kWh (Net CV)": 0.35786, "kWh (Gross CV)": 0.33997 },
    "Coal (electricity generation - home produced coal only)": { tonnes: 2209.87, "kWh (Net CV)": 0.33443, "kWh (Gross CV)": 0.3177 },
  },
  "Biofuel": {
    "Bioethanol": { litres: 0.00901, GJ: 0.42339, kg: 0.01135 },
    "Biodiesel ME": { litres: 0.16751, GJ: 5.05961, kg: 0.18822 },
    "Biomethane (compressed)": { litres: 0, GJ: 0.10625, kg: 0.00521 },
    "Biodiesel ME (from used cooking oil)": { litres: 0.16751, GJ: 5.05961, kg: 0.18822 },
    "Biodiesel ME (from tallow)": { litres: 0.16751, GJ: 5.05961, kg: 0.18822 },
    "Biodiesel HVO": { litres: 0.03558, GJ: 1.03677, kg: 0.04562 },
    "Biopropane": { litres: 0.00213, GJ: 0.08952, kg: 0.00415 },
    "Development diesel": { litres: 0.03705, GJ: 1.03677, kg: 0.04461 },
    "Development petrol": { litres: 0.01402, GJ: 0.42339, kg: 0.01890 },
    "Off road biodiesel": { litres: 0.16751, GJ: 5.05961, kg: 0.18822 },
    "Biomethane (liquified)": { litres: 0, GJ: 0.10625, kg: 0.00521 },
    "Methanol (bio)": { litres: 0.00669, GJ: 0.42339, kg: 0.00844 },
    "Avtur (renewable)": { litres: 0.02531, GJ: 0.72340, kg: 0.03179 },
  },
  "Biomass": {
    "Wood logs": { tonnes: 46.98508, kWh: 0.01150 },
    "Wood chips": { tonnes: 43.43964, kWh: 0.01150 },
    "Wood pellets": { tonnes: 55.19389, kWh: 0.01150 },
    "Grass/straw": { tonnes: 47.35709, kWh: 0.01273 },
  },
  "Biogas": {
    "Biogas": { tonnes: 1.24314, kWh: 0.00022 },
    "Landfill gas": { tonnes: 0.69696, kWh: 0.00020 },
  },
  "Other Fuels - Solid": {
    "Municipal Solid Waste": { tonnes: 90.70 },
    "Petroleum Coke (Solid)": { tonnes: 102.41 },
    "Plastics": { tonnes: 75.00 },
    "Tires": { tonnes: 85.97 },
  },
  "Biomass Fuels - Solid": {
    "Agricultural Byproducts": { tonnes: 118.17 },
    "Peat": { tonnes: 111.84 },
    "Solid Byproducts": { tonnes: 105.51 },
    "Wood and Wood Residuals": { tonnes: 93.80 },
  },
};

export const REFRIGERANT_FACTORS: Record<string, number> = {
  "Carbon dioxide": 1.00000,
  "Methane": 28.00000,
  "Nitrous oxide": 265.00000,
  "HFC-23": 12400.00000,
  "HFC-32": 677.00000,
  "HFC-41": 116.00000,
  "HFC-125": 3170.00000,
  "HFC-134": 1120.00000,
  "HFC-134a": 1300.00000,
  "HFC-143": 328.00000,
  "HFC-143a": 4800.00000,
  "HFC-152a": 138.00000,
  "HFC-227ea": 3350.00000,
  "HFC-236fa": 8060.00000,
  "HFC-245fa": 858.00000,
  "HFC-43-I0mee": 1650.00000,
  "Perfluoromethane (PFC-14)": 6630.00000,
  "Perfluoroethane (PFC-116)": 11100.00000,
  "Perfluoropropane (PFC-218)": 8900.00000,
  "Perfluorocyclobutane (PFC-318)": 9540.00000,
  "Perfluorobutane (PFC-3-1-10)": 9200.00000,
  "Perfluoropentane (PFC-4-1-12)": 8550.00000,
  "Perfluorohexane (PFC-5-1-14)": 7910.00000,
  "PFC-9-1-18": 7190.00000,
  "Perfluorocyclopropane": 9200.00000,
  "Sulphur hexafluoride (SF6)": 23500.00000,
  "HFC-152": 16.00000,
  "HFC-161": 4.00000,
  "HFC-236cb": 1210.00000,
  "HFC-236ea": 1330.00000,
  "HFC-245ca": 716.00000,
  "HFC-365mfc": 804.00000,
  "Nitrogen trifluoride": 16100.00000,
};

export const VEHICLE_FACTORS: Record<string, Record<string, Record<string, number>>> = {
  "Cars (by market segment)": {
    "Mini": { km: 0.10828, miles: 0.17425 },
    "Supermini": { km: 0.13284, miles: 0.21378 },
    "Lower medium": { km: 0.14349, miles: 0.23092 },
    "Upper medium": { km: 0.16026, miles: 0.25792 },
    "Executive": { km: 0.16920, miles: 0.27230 },
    "Luxury": { km: 0.20464, miles: 0.32934 },
    "Sports": { km: 0.17155, miles: 0.27608 },
    "Dual purpose 4X4": { km: 0.19805, miles: 0.31874 },
    "MPV": { km: 0.17904, miles: 0.28814 },
  },
  "Cars (by size)": {
    "Small car": { km: 0.14172, miles: 0.22807 },
    "Medium car": { km: 0.17006, miles: 0.27368 },
    "Large car": { km: 0.20839, miles: 0.33537 },
    "Average car": { km: 0.17136, miles: 0.27578 },
  },
  "Motorbike": {
    "Small": { km: 0.08094, miles: 0.13027 },
    "Medium": { km: 0.09826, miles: 0.15813 },
    "Large": { km: 0.13072, miles: 0.21037 },
    "Average": { km: 0.11138, miles: 0.17925 },
  },
};

export const DELIVERY_VEHICLE_FACTORS: Record<string, Record<string, Record<string, number>>> = {
  "Vans": {
    "Class I (up to 1.305 tonnes)": { km: 0.15572, miles: 0.25061 },
    "Class II (1.305 to 1.74 tonnes)": { km: 0.19094, miles: 0.30728 },
    "Class III (1.74 to 3.5 tonnes)": { km: 0.27712, miles: 0.44598 },
    "Average (up to 3.5 tonnes)": { km: 0.25395, miles: 0.40870 },
  },
  "HGV (all diesel)": {
    "Rigid (>3.5 - 7.5 tonnes)": { km: 0.49005, miles: 0.78865 },
    "Rigid (>7.5 tonnes-17 tonnes)": { km: 0.59839, miles: 0.96301 },
    "Rigid (>17 tonnes)": { km: 0.98074, miles: 1.57834 },
    "All rigids": { km: 0.82844, miles: 1.33324 },
    "Articulated (>3.5 - 33t)": { km: 0.77250, miles: 1.24322 },
    "Articulated (>33t)": { km: 0.91969, miles: 1.48010 },
    "All artics": { km: 0.91411, miles: 1.47111 },
    "All HGVs": { km: 0.87910, miles: 1.41477 },
  },
  "HGVs refrigerated (all diesel)": {
    "Rigid (>3.5 - 7.5 tonnes)": { km: 0.58462, miles: 0.94086 },
    "Rigid (>7.5 tonnes-17 tonnes)": { km: 0.71387, miles: 1.14886 },
    "Rigid (>17 tonnes)": { km: 1.17001, miles: 1.88295 },
    "All rigids": { km: 0.98832, miles: 1.59054 },
    "Articulated (>3.5 - 33t)": { km: 0.89538, miles: 1.44098 },
    "Articulated (>33t)": { km: 1.06599, miles: 1.71554 },
    "All artics": { km: 1.05952, miles: 1.70513 },
    "All HGVs": { km: 1.03112, miles: 1.65943 },
  },
};

// Placeholder factors for Scope 2 and 3 (to be populated later)
export const SCOPE2_FACTORS: Record<string, Record<string, number>> = {
  "GridCountries": {
    "UAE": 0.4041,
    "Pakistan": 0.425,
  },
  "Electricity": {
    "kWh": 0, // handled via country factor; keep 0 as placeholder
    "MWh": 0,
  },
  "Heating": {
    "kWh": 0.184, // Natural gas
    "therms": 5.3,
  },
};

export const SCOPE3_FACTORS: Record<string, Record<string, number>> = {
  "Business Travel": {
    "km": 0.14, // Average car
    "miles": 0.23,
  },
  "Waste": {
    "tonnes": 0.5, // General waste
    "kg": 0.0005,
  },
};
