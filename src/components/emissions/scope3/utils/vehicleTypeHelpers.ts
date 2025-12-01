// Vehicle type notes mapping (A, B, C explanations) - concise versions
export const getVehicleTypeNote = (vehicleType: string): string | null => {
  const normalized = vehicleType.toLowerCase();
  
  if (normalized.includes('passenger car')) {
    return "Automobiles used primarily to transport 12 people or less for personal travel, less than 8,500 lbs in gross vehicle weight.";
  }
  
  if (normalized.includes('light-duty truck')) {
    return "Vehicles that primarily transport passengers (SUVs, minivans) or light-weight cargo with special features like four-wheel drive. Gross vehicle weight normally around 8,500 pounds or less.";
  }
  
  if (normalized.includes('medium') && normalized.includes('heavy-duty truck') || 
      normalized.includes('heavy-duty truck') || 
      (normalized.includes('medium') && normalized.includes('truck'))) {
    return "Vehicles with gross vehicle weight more than 8,500 pounds, including single unit trucks, combination trucks, tractor-trailers, box trucks, service and utility trucks.";
  }
  
  return null;
};

// Check if vehicle type has a note
export const hasVehicleTypeNote = (vehicleType: string): boolean => {
  return getVehicleTypeNote(vehicleType) !== null;
};

// Get superscript for vehicle type
export const getVehicleTypeSuperscript = (vehicleType: string): string => {
  const normalized = vehicleType.toLowerCase();
  
  if (normalized.includes('passenger car') || normalized.includes('passenger car a')) {
    return 'A';
  }
  if (normalized.includes('light-duty truck') || normalized.includes('light-duty truck b')) {
    return 'B';
  }
  if ((normalized.includes('medium') || normalized.includes('heavy-duty truck')) && normalized.includes('c')) {
    return 'C';
  }
  
  return '';
};

// Remove trailing A, B, C from vehicle type name
export const cleanVehicleTypeName = (vehicleType: string): string => {
  // Remove trailing space and single letter (A, B, or C) at the end
  return vehicleType.replace(/\s+[ABC]$/i, '').trim();
};

