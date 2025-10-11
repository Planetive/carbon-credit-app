-- Create contact_submissions table
CREATE TABLE IF NOT EXISTS contact_submissions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL,
  company VARCHAR(255),
  phone VARCHAR(50),
  subject VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  status VARCHAR(50) DEFAULT 'new' CHECK (status IN ('new', 'in_progress', 'completed', 'spam')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_contact_submissions_created_at ON contact_submissions(created_at);
CREATE INDEX IF NOT EXISTS idx_contact_submissions_status ON contact_submissions(status);

-- Enable Row Level Security
ALTER TABLE contact_submissions ENABLE ROW LEVEL SECURITY;

-- Create new policy to allow public inserts (for contact form submissions)
CREATE POLICY "Allow public to insert contact submissions" ON contact_submissions
  FOR INSERT WITH CHECK (true);

-- Create policy to allow authenticated users to view and manage submissions
CREATE POLICY "Allow authenticated users to manage submissions" ON contact_submissions
  FOR ALL USING (auth.uid() IS NOT NULL);

-- Create policy to allow public to view their own submissions (optional)
CREATE POLICY "Allow public to view submissions" ON contact_submissions
  FOR SELECT USING (true); 