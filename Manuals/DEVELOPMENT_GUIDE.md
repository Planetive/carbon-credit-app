# Carbon Credit App - Development Guide

## 🚀 Project Overview

**Project Name**: ReThink Carbon App  
**Version**: 1.0.0  
**Description**: A comprehensive carbon credit management and ESG assessment platform built with modern web technologies.

## 🛠️ Technology Stack

### Frontend Framework
- **React 18.3.1** - Modern React with hooks and functional components
- **TypeScript 5.5.3** - Type-safe JavaScript development
- **Vite 5.4.19** - Fast build tool and development server

### UI & Styling
- **Tailwind CSS 3.4.11** - Utility-first CSS framework
- **Radix UI** - Accessible, unstyled UI components
- **Lucide React** - Beautiful, customizable icons
- **Bootstrap 5.3.7** - Additional UI components and utilities
- **React Bootstrap** - Bootstrap components for React

### State Management & Data Fetching
- **React Query (TanStack Query) 5.56.2** - Server state management
- **React Hook Form 7.53.0** - Form handling and validation
- **Zod 3.23.8** - Schema validation

### Backend & Database
- **Supabase** - Open-source Firebase alternative
  - PostgreSQL database
  - Real-time subscriptions
  - Authentication & authorization
  - Row Level Security (RLS)

### Routing
- **React Router DOM 6.26.2** - Client-side routing

### Development Tools
- **ESLint 9.9.0** - Code linting
- **PostCSS 8.4.47** - CSS processing
- **Autoprefixer 10.4.20** - CSS vendor prefixing

## 🏗️ Project Architecture

### Directory Structure
```
src/
├── components/          # Reusable UI components
│   ├── ui/             # Radix UI components
│   ├── AdminProtectedRoute.tsx
│   └── ProtectedRoute.tsx
├── contexts/           # React contexts
│   └── AuthContext.tsx
├── hooks/              # Custom React hooks
├── integrations/       # External service integrations
│   └── supabase/      # Supabase client configuration
├── lib/                # Utility functions and helpers
├── pages/              # Application pages/routes
└── main.tsx           # Application entry point
```

### Key Components
- **MainLayout**: Main application layout with navigation
- **AuthContext**: Authentication state management
- **ProtectedRoute**: Route protection for authenticated users
- **AdminProtectedRoute**: Route protection for admin users

## 🚀 Getting Started

### Prerequisites
- **Node.js** 18+
- **Git** for version control
- **Supabase account** for database

### Installation

1. **Clone the repository**
   ```bash
   git clone <repository-url>
   cd carbon-credit-app
   ```

2. **Install dependencies**
   ```bash
   # Using npm
   npm install
   

3. **Environment Setup**
   Create a `.env` file in the root directory:
   ```env
   VITE_SUPABASE_URL=your_supabase_url
   VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
   VITE_SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
   ```

4. **Start development server**
   ```bash
   npm run dev
   ```

   The app will be available at `http://localhost:8080`

## 🗄️ Database & Backend

### Supabase Integration
- **Backend Service**: Supabase (PostgreSQL + Auth + Real-time)
- **Company Account**: Database is managed on company's Supabase account
- **Schema Management**: New developers will run updated schema files as needed

### Key Data Models
- **User Profiles** - Authentication and user information
- **ESG Assessments** - Environmental, Social, Governance evaluations
- **Carbon Projects** - Carbon credit project management
- **CCUS Projects** - Carbon Capture, Utilization, and Storage data
- **Contact Submissions** - Contact form data storage

### Database Access
- **Read/Write**: Through Supabase client in the app
- **Admin Operations**: Using service role key for privileged access
- **Real-time**: Subscriptions for live data updates

## 🔐 Authentication & Authorization

### User Types
1. **Regular Users** - Can access dashboard and submit assessments
2. **Admin Users** - Can access admin panel and score assessments

### Protected Routes
- `/dashboard` - Requires authentication
- `/admin/*` - Requires admin privileges
- `/project-wizard` - Requires authentication

### Row Level Security (RLS)
- Users can only access their own data
- Admins bypass RLS using service role key
- Contact form allows public submissions

## 📧 Contact Form

### Form Functionality
The contact form stores submissions directly in the Supabase database:
- **Data Storage**: All form submissions go to `contact_submissions` table
- **No Email**: Form does not send emails - only stores data
- **Public Access**: Anyone can submit the form without authentication

### Form Fields
- Name, Email, Company, Phone, Subject, Message
- All data is validated and stored securely
- Status tracking (new, in_progress, completed, spam)

## 🎨 UI/UX Features

### Design System
- **Custom color palette** with green theme (`#6AA261`)
- **Responsive design** for mobile and desktop
- **Dark mode support** with theme switching
- **Accessibility** with Radix UI components

### Key UI Components
- **Responsive navigation** with mobile menu
- **Form components** with validation
- **Data tables** for project management
- **Charts and visualizations** using Recharts
- **Toast notifications** for user feedback

## 🚀 Deployment

### Vercel Configuration
The app is configured for Vercel deployment with:
- **SPA routing** - All routes redirect to `index.html`
- **Security headers** - XSS protection, content type options
- **Build optimization** - Vite build process

### Build Commands
```bash
# Development build
npm run build:dev

# Production build
npm run build

# Preview production build
npm run preview
```

## 🔧 Development Workflow

### Code Quality
- **ESLint** configuration for code linting
- **TypeScript** for type safety
- **Prettier** (via Tailwind CSS) for code formatting

### State Management
- **React Context** for global state (auth, theme)
- **React Query** for server state and caching
- **Local state** with React hooks for component-specific state

### Form Handling
- **React Hook Form** for form state and validation
- **Zod schemas** for runtime validation
- **Custom validation** for business logic

## 📱 Responsive Design

### Mobile-First Approach
- **Tailwind CSS** responsive utilities
- **Custom hooks** for mobile detection
- **Touch-friendly** interface elements
- **Progressive enhancement** for older devices

### Breakpoints
- **Mobile**: `< 768px`
- **Tablet**: `768px - 1024px`
- **Desktop**: `> 1024px`

## 🔍 Testing & Debugging

### Development Tools
- **React Developer Tools** for component inspection
- **Supabase Dashboard** for database debugging
- **Browser DevTools** for network and console debugging

### Common Issues
1. **Authentication errors** - Check Supabase credentials
2. **Database connection** - Verify Supabase URL and keys
3. **Build errors** - Check TypeScript compilation
4. **Styling issues** - Verify Tailwind CSS classes

## 📚 Key Features

### ESG Assessment System
- **Questionnaire-based** assessments
- **Scoring algorithms** for different criteria
- **Admin review** and scoring system
- **Result visualization** and reporting

### Carbon Credit Management
- **Project creation** and management
- **Methodology matching** for project types
- **Carbon calculations** and estimations
- **Project reporting** and analytics

### CCUS (Carbon Capture, Utilization, and Storage)
- **Project database** with filtering
- **Policy exploration** and analysis
- **Management strategies** and best practices
- **Global presence** mapping

## 🚨 Security Considerations

### Frontend Security
- **Environment variables** for sensitive data
- **Input validation** with Zod schemas
- **XSS protection** with proper escaping
- **CSRF protection** via Supabase

### Database Security
- **Row Level Security (RLS)** policies
- **Service role key** for admin operations
- **User authentication** required for sensitive routes
- **Data validation** at database level

## 🔄 Version Control

### Git Workflow
- **Feature branches** for new development
- **Pull requests** for code review
- **Semantic commits** for clear history
- **Protected main branch** for production code

### Commit Convention
```
feat: add new feature
fix: bug fix
docs: documentation update
style: code formatting
refactor: code restructuring
test: add tests
chore: maintenance tasks
```

## 📖 Additional Resources

### Documentation
- [React Documentation](https://react.dev/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/)
- [Tailwind CSS Docs](https://tailwindcss.com/docs)
- [Supabase Documentation](https://supabase.com/docs)
- [Vite Guide](https://vitejs.dev/guide/)

### Project-Specific Guides
- `README.md` - Admin setup and configuration

## 🆘 Getting Help

### Common Questions
1. **How to add new pages?** - Create component in `src/pages/` and add route in `App.tsx`
2. **How to work with data?** - Use Supabase client and React Query for data fetching
3. **How to add new UI components?** - Use Radix UI or create custom components
4. **How to handle authentication?** - Use `AuthContext` and `ProtectedRoute`

### Support Channels
- **Code comments** for inline documentation
- **Component documentation** in code
- **Migration files** for database changes
- **Environment configuration** for setup

---

**Welcome to the Carbon Credit App development team! This guide should help you get up and running quickly. For specific questions, check the code comments and existing documentation.**
