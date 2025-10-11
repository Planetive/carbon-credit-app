CREATE TABLE ccus_management_strategies (
    id SERIAL PRIMARY KEY,
    country TEXT NOT NULL,
    current_management_strategy TEXT,
    deployment_policies_and_programs TEXT,
    priorities_going_forward TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
); 