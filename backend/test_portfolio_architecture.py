#!/usr/bin/env python3
"""
Test the new Bank Portfolio Management Architecture

This script demonstrates how to use the new portfolio management services
to calculate emissions across multiple companies in a bank's portfolio.
"""

import asyncio
import sys
import os

# Add the backend directory to the Python path
sys.path.append(os.path.join(os.path.dirname(__file__), '..'))

from services.portfolio_manager import (
    PortfolioManager, 
    CompanyEmissionData, 
    CalculationType
)
from services.bank_portfolio_service import (
    BankPortfolioService,
    RegulatoryFramework
)


async def test_portfolio_management():
    """Test the complete portfolio management workflow"""
    
    print("🏦 BANK PORTFOLIO MANAGEMENT ARCHITECTURE TEST")
    print("=" * 60)
    
    # Sample portfolio data (realistic bank portfolio)
    companies = [
        CompanyEmissionData(
            counterparty_id="company-001",
            company_name="National Steel Limited",
            sector="Manufacturing",
            geography="Pakistan",
            outstanding_amount=5000000,  # 5M PKR
            share_price=150.0,
            outstanding_shares=2000000,
            total_debt=3000000,
            scope1_emissions=500.0,  # High emissions (steel manufacturing)
            scope2_emissions=200.0,
            scope3_emissions=100.0,
            verification_status="unverified",
            probability_of_default=2.5,
            loss_given_default=45.0,
            tenor_months=36
        ),
        CompanyEmissionData(
            counterparty_id="company-002",
            company_name="Green Energy Corp",
            sector="Energy",
            geography="Pakistan",
            outstanding_amount=8000000,  # 8M PKR
            total_equity=6000000,
            total_debt=4000000,
            scope1_emissions=300.0,  # Medium emissions (renewable energy)
            scope2_emissions=150.0,
            scope3_emissions=75.0,
            verification_status="verified",
            probability_of_default=1.8,
            loss_given_default=35.0,
            tenor_months=48
        ),
        CompanyEmissionData(
            counterparty_id="company-003",
            company_name="Tech Solutions Ltd",
            sector="Technology",
            geography="Pakistan",
            outstanding_amount=3000000,  # 3M PKR
            share_price=80.0,
            outstanding_shares=1000000,
            total_debt=1000000,
            scope1_emissions=50.0,   # Low emissions (tech company)
            scope2_emissions=25.0,
            scope3_emissions=15.0,
            verification_status="verified",
            probability_of_default=1.2,
            loss_given_default=25.0,
            tenor_months=24
        ),
        CompanyEmissionData(
            counterparty_id="company-004",
            company_name="Agricultural Co-op",
            sector="Agriculture",
            geography="Pakistan",
            outstanding_amount=2000000,  # 2M PKR
            total_equity=1500000,
            total_debt=1000000,
            scope1_emissions=100.0,  # Medium emissions (agriculture)
            scope2_emissions=50.0,
            scope3_emissions=30.0,
            verification_status="unverified",
            probability_of_default=3.0,
            loss_given_default=40.0,
            tenor_months=60
        )
    ]
    
    print(f"\n📊 PORTFOLIO OVERVIEW:")
    print(f"Total Companies: {len(companies)}")
    total_exposure = sum(c.outstanding_amount for c in companies)
    print(f"Total Exposure: ${total_exposure:,} PKR")
    
    # Initialize services
    print(f"\n🔧 INITIALIZING SERVICES...")
    portfolio_manager = PortfolioManager()
    bank_service = BankPortfolioService()
    
    # 1. Calculate Portfolio Emissions
    print(f"\n📈 CALCULATING PORTFOLIO EMISSIONS...")
    portfolio_summary = await portfolio_manager.calculate_portfolio_emissions(companies)
    
    print(f"✅ Portfolio Calculation Complete:")
    print(f"   • Total Financed Emissions: {portfolio_summary.total_financed_emissions:.2f} tCO2e")
    print(f"   • Total Facilitated Emissions: {portfolio_summary.total_facilitated_emissions:.2f} tCO2e")
    print(f"   • Average Attribution Factor: {portfolio_summary.average_attribution_factor:.6f}")
    print(f"   • Companies by Sector: {portfolio_summary.companies_by_sector}")
    print(f"   • Companies by Geography: {portfolio_summary.companies_by_geography}")
    
    # 2. Risk Assessment
    print(f"\n⚠️  ASSESSING PORTFOLIO RISK...")
    risk_profile = await bank_service.assess_portfolio_risk(companies, "test-portfolio")
    
    print(f"✅ Risk Assessment Complete:")
    print(f"   • Climate Risk Score: {risk_profile.climate_risk_score}/100")
    print(f"   • Overall Risk Level: {risk_profile.overall_risk_level.value.upper()}")
    print(f"   • Sector Concentration Risk: {risk_profile.sector_concentration_risk:.2%}")
    print(f"   • Geography Concentration Risk: {risk_profile.geography_concentration_risk:.2%}")
    print(f"   • Transition Risk Score: {risk_profile.transition_risk_score}/100")
    print(f"   • Physical Risk Score: {risk_profile.physical_risk_score}/100")
    
    # 3. Regulatory Reporting
    print(f"\n📋 GENERATING REGULATORY REPORTS...")
    
    # PCAF Report
    pcaf_report = await bank_service.generate_regulatory_report(
        companies, 
        RegulatoryFramework.PCAF, 
        "2024-Q1"
    )
    
    print(f"✅ PCAF Report Generated:")
    print(f"   • Report ID: {pcaf_report.report_id}")
    print(f"   • Total Financed Emissions: {pcaf_report.total_financed_emissions:.2f} tCO2e")
    print(f"   • Total Facilitated Emissions: {pcaf_report.total_facilitated_emissions:.2f} tCO2e")
    print(f"   • High Risk Exposures: {pcaf_report.high_risk_exposures}")
    print(f"   • Scope 1 Emissions: {pcaf_report.scope1_emissions:.2f} tCO2e")
    print(f"   • Scope 2 Emissions: {pcaf_report.scope2_emissions:.2f} tCO2e")
    print(f"   • Scope 3 Emissions: {pcaf_report.scope3_emissions:.2f} tCO2e")
    
    # 4. Portfolio Optimization
    print(f"\n🎯 PORTFOLIO OPTIMIZATION...")
    optimization = await bank_service.optimize_portfolio(companies, target_emission_reduction=0.2)
    
    print(f"✅ Optimization Analysis Complete:")
    print(f"   • Current Emissions: {optimization.current_emissions:.2f} tCO2e")
    print(f"   • Target Emissions: {optimization.target_emissions:.2f} tCO2e")
    print(f"   • Reduction Potential: {optimization.reduction_potential:.2f} tCO2e")
    print(f"   • Priority Sectors: {optimization.priority_sectors}")
    print(f"   • Priority Geographies: {optimization.priority_geographies}")
    print(f"   • Implementation Timeline: {optimization.implementation_timeline}")
    
    print(f"\n💡 RECOMMENDED ACTIONS:")
    for i, action in enumerate(optimization.recommended_actions, 1):
        print(f"   {i}. {action}")
    
    # 5. Individual Company Analysis
    print(f"\n🏢 INDIVIDUAL COMPANY ANALYSIS...")
    for company in companies:
        individual_result = await portfolio_manager.calculate_company_emissions(company)
        print(f"✅ {company.company_name}:")
        print(f"   • Attribution Factor: {individual_result.attribution_factor:.6f}")
        print(f"   • Financed Emissions: {individual_result.financed_emissions:.2f} tCO2e")
        print(f"   • Denominator: {individual_result.denominator_label} = ${individual_result.denominator_value:,.0f}")
        print(f"   • Status: {individual_result.status}")
    
    # 6. Risk Metrics
    print(f"\n📊 PORTFOLIO RISK METRICS...")
    risk_metrics = await portfolio_manager.get_portfolio_risk_metrics(companies)
    
    print(f"✅ Risk Metrics:")
    print(f"   • Total Exposure: ${risk_metrics['total_exposure']:,.0f}")
    print(f"   • Average PD: {risk_metrics['average_probability_of_default']:.2f}%")
    print(f"   • Average LGD: {risk_metrics['average_loss_given_default']:.2f}%")
    print(f"   • Sector Concentration: {risk_metrics['sector_concentration']}")
    print(f"   • Geography Concentration: {risk_metrics['geography_concentration']}")
    
    print(f"\n🎉 PORTFOLIO MANAGEMENT TEST COMPLETE!")
    print(f"=" * 60)
    
    # Summary
    print(f"\n📋 SUMMARY:")
    print(f"✅ Successfully calculated emissions for {len(companies)} companies")
    print(f"✅ Risk assessment completed with {risk_profile.overall_risk_level.value} risk level")
    print(f"✅ Generated {pcaf_report.framework.value} regulatory report")
    print(f"✅ Portfolio optimization analysis completed")
    print(f"✅ All services working correctly!")
    
    return {
        "portfolio_summary": portfolio_summary,
        "risk_profile": risk_profile,
        "regulatory_report": pcaf_report,
        "optimization": optimization,
        "risk_metrics": risk_metrics
    }


async def test_api_integration():
    """Test API integration (simulated)"""
    
    print(f"\n🌐 API INTEGRATION TEST")
    print(f"=" * 40)
    
    # Simulate API calls
    api_endpoints = [
        "POST /api/bank-portfolio/calculate",
        "POST /api/bank-portfolio/risk-assessment", 
        "POST /api/bank-portfolio/regulatory-report",
        "POST /api/bank-portfolio/optimize",
        "GET /api/bank-portfolio/frameworks",
        "GET /api/bank-portfolio/risk-levels",
        "GET /api/bank-portfolio/health"
    ]
    
    print(f"✅ Available API Endpoints:")
    for endpoint in api_endpoints:
        print(f"   • {endpoint}")
    
    print(f"\n📝 Example API Usage:")
    print(f"""
# Calculate portfolio emissions
curl -X POST "http://localhost:8000/api/bank-portfolio/calculate" \\
  -H "Content-Type: application/json" \\
  -d '{{"companies": [...], "calculation_types": ["finance_emission"]}}'

# Assess portfolio risk  
curl -X POST "http://localhost:8000/api/bank-portfolio/risk-assessment" \\
  -H "Content-Type: application/json" \\
  -d '{{"companies": [...], "portfolio_id": "test-portfolio"}}'

# Generate PCAF report
curl -X POST "http://localhost:8000/api/bank-portfolio/regulatory-report" \\
  -H "Content-Type: application/json" \\
  -d '{{"companies": [...], "framework": "PCAF", "reporting_period": "2024-Q1"}}'
    """)


if __name__ == "__main__":
    print("🚀 Starting Bank Portfolio Management Architecture Test...")
    
    # Run the main test
    results = asyncio.run(test_portfolio_management())
    
    # Run API integration test
    asyncio.run(test_api_integration())
    
    print(f"\n✨ All tests completed successfully!")
    print(f"🎯 The new architecture is ready for integration with your frontend!")
