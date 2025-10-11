import React from 'react';
import { useLocation } from 'react-router-dom';
import { ESGWizard } from './finance_facilitated/esg/ESGWizard';

export const IntegratedFinanceEmission: React.FC = () => {
  const location = useLocation();
  
  // Pass the mode from location state to ESGWizard
  const mode = location.state?.mode || 'finance';
  const resetWizard = location.state?.resetWizard === true;

  // If reset requested (from dashboard buttons), clear any resume state so wizard starts at step 1
  if (resetWizard) {
    try {
      const saved = sessionStorage.getItem('esgWizardState');
      if (saved) {
        sessionStorage.removeItem('esgWizardState');
      }
    } catch {}
  }
  
  return <ESGWizard />;
};

export default IntegratedFinanceEmission;
