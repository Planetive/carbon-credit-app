### Carbon Credit App — Simple Maintenance

This is a quick guide for basic setup and adding new pages.

### Setup
- Install: `npm ci`
- Create `.env` in project root:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_anon_key
```
- Run dev server: `npm run dev` (http://localhost:8080)

### Add a new page
1) Create `src/pages/Hello.tsx`:
```tsx
import React from "react";
export default function Hello() {
  return <div className="p-6">Hello Page</div>;
}
```
2) Add a route in `src/App.tsx`:
- Public:
```tsx
<Route path="/hello" element={<Hello />} />
```
- Protected (login required):
```tsx
<Route path="/hello" element={
  <ProtectedRoute>
    <Hello />
  </ProtectedRoute>
} />
```
- Admin-only:
```tsx
<Route path="/admin/hello" element={
  <AdminProtectedRoute>
    <Hello />
  </AdminProtectedRoute>
} />
```
### Push to github repository
  After any change is code base:
```
  git add .
  git commit -m "Your message"
  git push origin main
```

### Build & deploy
  If on vercel free plan
  ```
  cd carbon-credit-app
  vercel --prod
  ```

  If on vercel paid plan.
- Build: `npm run build`
- Preview: `npm run preview`
- Vercel rewrites are set in `vercel.json` (SPA). Set env vars in Vercel.

### Where things live
- Pages: `src/pages`
- Route guards: `src/components/ProtectedRoute.tsx`, `src/components/AdminProtectedRoute.tsx`
- Auth: `src/contexts/AuthContext.tsx`
- Supabase: `src/integrations/supabase/`

That’s it. Keep pages in `src/pages` and register routes in `src/App.tsx`.
