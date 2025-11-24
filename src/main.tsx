import { createRoot } from 'react-dom/client'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import App from './App.tsx'
import './index.css'
import ProjectCards from './pages/ProjectCards';

// Create a client with optimized defaults
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes - data stays fresh
      gcTime: 10 * 60 * 1000, // 10 minutes - cache garbage collection (formerly cacheTime)
      refetchOnWindowFocus: false, // Don't refetch on window focus
      retry: 1, // Only retry once on failure
    },
  },
})

createRoot(document.getElementById("root")!).render(
  <QueryClientProvider client={queryClient}>
    <App />
  </QueryClientProvider>
);
