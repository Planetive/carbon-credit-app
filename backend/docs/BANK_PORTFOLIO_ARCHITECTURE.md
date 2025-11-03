# Bank Portfolio Management Architecture

## 🏗️ **REFACTORED ARCHITECTURE OVERVIEW**

This refactoring extends your existing ESG emissions platform to support bank portfolio management while keeping the individual emission calculator unchanged.

### **📋 Architecture Components:**

```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React/TypeScript)               │
├─────────────────────────────────────────────────────────────┤
│  • BankPortfolio.tsx (existing - enhanced)                  │
│  • Individual emission forms (unchanged)                    │
│  • New portfolio management UI                             │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    API LAYER (FastAPI)                      │
├─────────────────────────────────────────────────────────────┤
│  • /api/bank-portfolio/calculate                           │
│  • /api/bank-portfolio/risk-assessment                     │
│  • /api/bank-portfolio/regulatory-report                   │
│  • /api/bank-portfolio/optimize                           │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                  SERVICE LAYER (Python)                     │
├─────────────────────────────────────────────────────────────┤
│  • BankPortfolioService (bank-specific logic)              │
│  • PortfolioManager (orchestrates calculations)            │
│  • EmissionCalculatorService (wrapper around existing)     │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                EXISTING CALCULATION ENGINE                  │
├─────────────────────────────────────────────────────────────┤
│  • CalculationEngine (unchanged)                           │
│  • Individual company emission calculations               │
│  • Finance/facilitated emission formulas                  │
└─────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────┐
│                    DATABASE (Supabase)                      │
├─────────────────────────────────────────────────────────────┤
│  • counterparties (existing)                              │
│  • exposures (existing)                                   │
│  • emission_calculations (existing)                       │
│  • Enhanced with portfolio-level views                    │
└─────────────────────────────────────────────────────────────┘
```

## 🎯 **KEY FEATURES**

### **1. Portfolio-Level Operations**
- **Calculate emissions for multiple companies** in a single API call
- **Risk assessment** across the entire portfolio
- **Regulatory reporting** (PCAF, TCFD, EU Taxonomy, SEC Climate)
- **Portfolio optimization** with emission reduction recommendations

### **2. Bank-Specific Business Logic**
- **Climate risk scoring** (0-100 scale)
- **Sector and geography concentration analysis**
- **Transition risk assessment**
- **Physical risk assessment**
- **Regulatory compliance reporting**

### **3. Existing Calculator Integration**
- **Zero changes** to existing emission calculator
- **Reuses all existing formulas** and calculation logic
- **Maintains backward compatibility**

## 📚 **API USAGE EXAMPLES**

### **1. Calculate Portfolio Emissions**

```python
import requests

# Sample company data
companies = [
    {
        "counterparty_id": "company-1",
        "company_name": "National Steel Limited",
        "sector": "Manufacturing",
        "geography": "Pakistan",
        "outstanding_amount": 1000000,
        "scope1_emissions": 100.0,
        "scope2_emissions": 50.0,
        "scope3_emissions": 25.0,
        "verification_status": "unverified"
    },
    {
        "counterparty_id": "company-2",
        "company_name": "Green Energy Corp",
        "sector": "Energy",
        "geography": "Pakistan",
        "outstanding_amount": 2000000,
        "scope1_emissions": 200.0,
        "scope2_emissions": 100.0,
        "scope3_emissions": 50.0,
        "verification_status": "verified"
    }
]

# Calculate portfolio emissions
response = requests.post("http://localhost:8000/api/bank-portfolio/calculate", json={
    "companies": companies,
    "calculation_types": ["finance_emission", "facilitated_emission"],
    "portfolio_id": "bank-portfolio-2024"
})

result = response.json()
print(f"Total Financed Emissions: {result['total_financed_emissions']:.2f} tCO2e")
print(f"Total Companies: {result['total_companies']}")
print(f"Average Attribution Factor: {result['average_attribution_factor']:.6f}")
```

### **2. Risk Assessment**

```python
# Assess portfolio risk
response = requests.post("http://localhost:8000/api/bank-portfolio/risk-assessment", json={
    "companies": companies,
    "portfolio_id": "bank-portfolio-2024"
})

risk_profile = response.json()
print(f"Climate Risk Score: {risk_profile['climate_risk_score']}")
print(f"Overall Risk Level: {risk_profile['overall_risk_level']}")
print(f"Transition Risk Score: {risk_profile['transition_risk_score']}")
print(f"Physical Risk Score: {risk_profile['physical_risk_score']}")
```

### **3. Regulatory Reporting**

```python
# Generate PCAF report
response = requests.post("http://localhost:8000/api/bank-portfolio/regulatory-report", json={
    "companies": companies,
    "framework": "PCAF",
    "reporting_period": "2024-Q1"
})

report = response.json()
print(f"PCAF Report ID: {report['report_id']}")
print(f"Total Financed Emissions: {report['total_financed_emissions']:.2f} tCO2e")
print(f"High Risk Exposures: {report['high_risk_exposures']}")
```

### **4. Portfolio Optimization**

```python
# Optimize portfolio for 20% emission reduction
response = requests.post("http://localhost:8000/api/bank-portfolio/optimize", json={
    "companies": companies,
    "target_emission_reduction": 0.2
})

optimization = response.json()
print(f"Current Emissions: {optimization['current_emissions']:.2f} tCO2e")
print(f"Target Emissions: {optimization['target_emissions']:.2f} tCO2e")
print(f"Reduction Potential: {optimization['reduction_potential']:.2f} tCO2e")
print(f"Priority Sectors: {optimization['priority_sectors']}")
print(f"Recommended Actions: {optimization['recommended_actions']}")
```

## 🔧 **SERVICE USAGE EXAMPLES**

### **1. Direct Service Usage**

```python
from backend.services.portfolio_manager import PortfolioManager, CompanyEmissionData
from backend.services.bank_portfolio_service import BankPortfolioService

# Initialize services
portfolio_manager = PortfolioManager()
bank_service = BankPortfolioService()

# Create company data
companies = [
    CompanyEmissionData(
        counterparty_id="company-1",
        company_name="National Steel Limited",
        sector="Manufacturing",
        geography="Pakistan",
        outstanding_amount=1000000,
        scope1_emissions=100.0,
        scope2_emissions=50.0,
        scope3_emissions=25.0
    )
]

# Calculate portfolio emissions
summary = await portfolio_manager.calculate_portfolio_emissions(companies)
print(f"Total Emissions: {summary.total_financed_emissions:.2f} tCO2e")

# Assess risk
risk_profile = await bank_service.assess_portfolio_risk(companies)
print(f"Risk Level: {risk_profile.overall_risk_level.value}")
```

### **2. Individual Company Calculation**

```python
# Calculate emissions for a single company
company = CompanyEmissionData(
    counterparty_id="company-1",
    company_name="National Steel Limited",
    sector="Manufacturing",
    geography="Pakistan",
    outstanding_amount=1000000,
    scope1_emissions=100.0,
    scope2_emissions=50.0,
    scope3_emissions=25.0
)

result = await portfolio_manager.calculate_company_emissions(company)
print(f"Attribution Factor: {result.attribution_factor:.6f}")
print(f"Financed Emissions: {result.financed_emissions:.2f} tCO2e")
```

## 🚀 **DEPLOYMENT**

### **1. Backend Setup**

```bash
# Install dependencies
pip install -r requirements.txt

# Run the FastAPI server
uvicorn backend.fastapi_app.main:app --reload --host 0.0.0.0 --port 8000
```

### **2. API Documentation**

Once running, visit:
- **Swagger UI**: http://localhost:8000/docs
- **ReDoc**: http://localhost:8000/redoc
- **Bank Portfolio API**: http://localhost:8000/api/bank-portfolio/

### **3. Health Check**

```bash
curl http://localhost:8000/api/bank-portfolio/health
```

## 📊 **DATABASE INTEGRATION**

The new services work with your existing database schema:

- **counterparties**: Company information
- **exposures**: Financial exposure data
- **emission_calculations**: Individual calculation results
- **counterparty_questionnaires**: Company emission data

No database changes required - the services read from existing tables and can optionally write aggregated results.

## 🔄 **MIGRATION STRATEGY**

### **Phase 1: Backend Services** ✅
- [x] PortfolioManager service
- [x] BankPortfolioService
- [x] API endpoints
- [x] Integration with existing calculator

### **Phase 2: Frontend Integration** (Next)
- [ ] Update BankPortfolio.tsx to use new API
- [ ] Add portfolio-level risk dashboard
- [ ] Add regulatory reporting interface
- [ ] Add portfolio optimization recommendations

### **Phase 3: Enhanced Features** (Future)
- [ ] Historical trend analysis
- [ ] Scenario modeling
- [ ] Automated reporting
- [ ] Integration with external data sources

## 🎯 **BENEFITS OF THIS ARCHITECTURE**

### **✅ Advantages:**
1. **Zero Breaking Changes**: Existing emission calculator remains unchanged
2. **Scalable**: Can handle portfolios with hundreds of companies
3. **Flexible**: Supports multiple calculation types and regulatory frameworks
4. **Maintainable**: Clean separation of concerns
5. **Extensible**: Easy to add new features and frameworks

### **🔄 Reusability:**
- **Individual Calculator**: Still works for single companies
- **Portfolio Manager**: Orchestrates multiple calculations
- **Bank Service**: Adds bank-specific business logic
- **API Layer**: Provides clean interface for frontend

### **📈 Performance:**
- **Parallel Processing**: Can calculate multiple companies simultaneously
- **Caching**: Results can be cached for repeated calculations
- **Batch Operations**: Single API call for entire portfolio

## 🧪 **TESTING**

### **Run Service Tests:**

```bash
# Test portfolio manager
python backend/services/portfolio_manager.py

# Test bank service
python backend/services/bank_portfolio_service.py

# Test API endpoints
python -m pytest backend/tests/test_bank_portfolio_api.py
```

### **Integration Tests:**

```bash
# Test full workflow
python backend/tests/test_integration.py
```

## 📝 **NEXT STEPS**

1. **Test the new services** with your existing data
2. **Integrate with frontend** to use the new API endpoints
3. **Add portfolio-level UI** for risk assessment and reporting
4. **Implement caching** for better performance
5. **Add monitoring** and logging for production use

This architecture provides a solid foundation for bank portfolio management while preserving all existing functionality! 🎉
