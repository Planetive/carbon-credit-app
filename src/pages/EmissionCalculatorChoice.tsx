import { Navigate, useLocation } from "react-router-dom";

/** Choice screen removed — send users to EPA (sidebar picks EPA / EBT). */
const EmissionCalculatorChoice = () => {
  const location = useLocation();
  return <Navigate to={`/emission-calculator-epa${location.search}`} replace />;
};

export default EmissionCalculatorChoice;
