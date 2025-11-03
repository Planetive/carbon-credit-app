# Carbon Credit Backend API

FastAPI backend service for the Carbon Credit Application, providing finance emission calculations, facilitated emission calculations, and climate risk scenario analysis.

## 🚀 Features

- **Finance Emission Calculator** - Calculate financed emissions using PCAF methodology
- **Facilitated Emission Calculator** - Calculate facilitated emissions for various asset classes
- **Climate Risk Scenario Analysis** - TCFD-compliant climate stress testing
- **Portfolio Risk Assessment** - Dynamic risk calculations based on actual portfolio data
- **Supabase Integration** - Database connectivity for portfolio and questionnaire data

## 📋 API Endpoints

### Health & Status
- `GET /health` - Health check and database status
- `GET /test-db` - Database connection test
- `GET /docs` - Interactive API documentation (Swagger UI)

### Finance Emissions
- `POST /finance-emission` - Calculate financed emissions

### Facilitated Emissions  
- `POST /facilitated-emission` - Calculate facilitated emissions

### Climate Risk Analysis
- `POST /scenario/calculate` - Calculate climate stress testing scenarios

## 🛠️ Setup

### Prerequisites
- Python 3.8+
- Supabase Service Role Key

### Installation

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd carbon-credit-backend
   ```

2. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

3. **Set up environment variables:**
   ```bash
   cp .env.example .env
   ```
   
   Update `.env` with your Supabase service role key:
   ```env
   SUPABASE_SERVICE_ROLE_KEY=your_service_role_key_here
   ```

4. **Run the development server:**
   ```bash
   python start.py
   # or
   uvicorn fastapi_app.main:app --reload --port 8000
   ```

## 🌐 Deployment

### Railway (Recommended)
1. Connect your GitHub repository to Railway
2. Set environment variables in Railway dashboard
3. Deploy automatically on push

### Render
1. Create a new Web Service on Render
2. Connect your GitHub repository
3. Set build command: `pip install -r requirements.txt`
4. Set start command: `uvicorn fastapi_app.main:app --host 0.0.0.0 --port $PORT`

### Heroku
1. Create a new Heroku app
2. Set environment variables
3. Deploy using Git

## 📊 Environment Variables

| Variable | Description | Required |
|----------|-------------|----------|
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key for database access | Yes |

## 🧪 Testing

Test the API endpoints:

```bash
# Health check
curl http://localhost:8000/health

# API documentation
open http://localhost:8000/docs
```

## 📁 Project Structure

```
carbon-credit-backend/
├── fastapi_app/
│   ├── main.py              # FastAPI application entry point
│   ├── models.py            # Pydantic models for API
│   ├── database.py          # Supabase database connection
│   ├── calculation_engine.py # Finance/facilitated emission calculations
│   ├── scenario_engine.py   # Climate risk scenario calculations
│   └── ...                  # Configuration files for different asset classes
├── requirements.txt         # Python dependencies
├── start.py                # Development server startup script
└── README.md               # This file
```

## 🔗 Frontend Integration

The frontend application should be configured to use this backend API. Update the frontend's API base URL to point to your deployed backend.

## 📝 License

This project is part of the Carbon Credit Application suite.