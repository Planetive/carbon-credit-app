CREATE TABLE "CCUS policies" (
    id SERIAL PRIMARY KEY,
    "Country" TEXT,
    "Key Policies" TEXT,
    "Mechanism" TEXT,
    "Focus Areas" TEXT,
    "Status" TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
); 