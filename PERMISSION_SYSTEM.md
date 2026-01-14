# Permission System Documentation

## Overview

The permission system provides granular, per-feature access control for organizations. It supports:
- **Role-based permissions** (Admin, User, Editor, Viewer)
- **Granular permissions** (per-feature control)
- **Route protection** (prevent unauthorized access)
- **Component-level gates** (hide/show UI elements)
- **Server-side validation** (database-level security)

## Available Permissions

- `can_create_projects` - Create new projects
- `can_edit_projects` - Edit existing projects
- `can_delete_projects` - Delete projects
- `can_view_reports` - View reports and analytics
- `can_manage_users` - Manage organization users
- `can_manage_organizations` - Manage organization settings
- `can_invite_users` - Invite new users
- `can_remove_users` - Remove users from organization
- `can_edit_permissions` - Edit user permissions

## Usage

### 1. usePermission Hook

The `usePermission` hook provides easy access to permission checks:

```tsx
import { usePermission } from '@/hooks/usePermission';

function MyComponent() {
  const { 
    canCreateProjects,
    canEditProjects,
    canDeleteProjects,
    canViewReports,
    canManageUsers,
    isAdmin,
    checkPermission,
    hasAnyPermission,
    hasAllPermissions,
    loading 
  } = usePermission();

  if (loading) return <div>Loading...</div>;

  return (
    <div>
      {canCreateProjects() && (
        <Button>Create Project</Button>
      )}
      
      {isAdmin() && (
        <Button>Admin Panel</Button>
      )}
    </div>
  );
}
```

### 2. PermissionProtectedRoute

Protect entire routes based on permissions:

```tsx
import { PermissionProtectedRoute } from '@/components/PermissionProtectedRoute';

// In App.tsx
<Route path="/reports" element={
  <CompanyProtectedRoute>
    <PermissionProtectedRoute permission="can_view_reports">
      <ReportsPage />
    </PermissionProtectedRoute>
  </CompanyProtectedRoute>
} />

// Require multiple permissions (ANY)
<PermissionProtectedRoute 
  requireAnyPermission={['can_edit_projects', 'can_create_projects']}
>
  <ProjectsPage />
</PermissionProtectedRoute>

// Require multiple permissions (ALL)
<PermissionProtectedRoute 
  requireAllPermissions={['can_edit_projects', 'can_delete_projects']}
>
  <ProjectManagementPage />
</PermissionProtectedRoute>

// Require specific role
<PermissionProtectedRoute requiredRole="admin">
  <AdminPage />
</PermissionProtectedRoute>
```

### 3. PermissionGate Component

Conditionally render UI elements based on permissions:

```tsx
import { PermissionGate } from '@/components/PermissionGate';

function ProjectCard({ project }) {
  return (
    <div>
      <h3>{project.name}</h3>
      
      {/* Hide button if no permission */}
      <PermissionGate permission="can_edit_projects">
        <Button>Edit</Button>
      </PermissionGate>
      
      {/* Show access denied message */}
      <PermissionGate 
        permission="can_delete_projects"
        showAccessDenied={true}
        hideContent={false}
      >
        <Button variant="destructive">Delete</Button>
      </PermissionGate>
      
      {/* Custom fallback */}
      <PermissionGate 
        permission="can_view_reports"
        fallback={<p>Upgrade to view reports</p>}
      >
        <ReportsSection />
      </PermissionGate>
    </div>
  );
}
```

### 4. Server-Side Validation

Use database functions to validate permissions:

```sql
-- Check if user has permission
SELECT check_user_permission(
  'user-uuid',
  'org-uuid',
  'can_create_projects'
);

-- Check current user's permission
SELECT check_current_user_permission(
  'org-uuid',
  'can_edit_projects'
);

-- Check if user has any of the permissions
SELECT check_user_any_permission(
  'user-uuid',
  'org-uuid',
  ARRAY['can_create_projects', 'can_edit_projects']
);

-- Get user's effective permissions
SELECT get_user_effective_permissions(
  'user-uuid',
  'org-uuid'
);
```

### 5. RLS Policies with Permissions

Example RLS policy using permission functions:

```sql
-- Users can only create projects if they have permission
CREATE POLICY "Users can create projects with permission"
  ON public.projects FOR INSERT
  WITH CHECK (
    check_current_user_permission(
      (SELECT organization_id FROM profiles WHERE user_id = auth.uid()),
      'can_create_projects'
    )
  );

-- Users can only edit projects if they have permission
CREATE POLICY "Users can edit projects with permission"
  ON public.projects FOR UPDATE
  USING (
    check_current_user_permission(
      (SELECT organization_id FROM profiles WHERE user_id = auth.uid()),
      'can_edit_projects'
    )
  );
```

## Best Practices

1. **Always check permissions on both client and server**
   - Client-side: For UX (hide/show buttons)
   - Server-side: For security (RLS policies)

2. **Use PermissionProtectedRoute for route-level protection**
   - Prevents unauthorized page access
   - Shows appropriate error messages

3. **Use PermissionGate for component-level control**
   - Hides UI elements users can't use
   - Improves UX by not showing disabled features

4. **Check permissions before API calls**
   - Validate permissions before making mutations
   - Show error messages if permission denied

5. **Cache permission checks**
   - The `usePermission` hook memoizes checks
   - Avoids unnecessary re-renders

## Examples

### Example 1: Project Management Page

```tsx
import { usePermission } from '@/hooks/usePermission';
import { PermissionGate } from '@/components/PermissionGate';

function ProjectManagement() {
  const { canCreateProjects, canEditProjects, canDeleteProjects } = usePermission();

  return (
    <div>
      <h1>Projects</h1>
      
      <PermissionGate permission="can_create_projects">
        <Button onClick={handleCreate}>Create Project</Button>
      </PermissionGate>
      
      {projects.map(project => (
        <div key={project.id}>
          <h3>{project.name}</h3>
          
          <PermissionGate permission="can_edit_projects">
            <Button onClick={() => handleEdit(project)}>Edit</Button>
          </PermissionGate>
          
          <PermissionGate permission="can_delete_projects">
            <Button 
              variant="destructive"
              onClick={() => handleDelete(project)}
            >
              Delete
            </Button>
          </PermissionGate>
        </div>
      ))}
    </div>
  );
}
```

### Example 2: Reports Page with Route Protection

```tsx
// In App.tsx
<Route path="/reports" element={
  <CompanyProtectedRoute>
    <PermissionProtectedRoute 
      permission="can_view_reports"
      showAccessDenied={true}
    >
      <ReportsPage />
    </PermissionProtectedRoute>
  </CompanyProtectedRoute>
} />
```

### Example 3: API Call with Permission Check

```tsx
import { usePermission } from '@/hooks/usePermission';
import { useToast } from '@/hooks/use-toast';

function ProjectActions({ project }) {
  const { canDeleteProjects } = usePermission();
  const { toast } = useToast();

  const handleDelete = async () => {
    if (!canDeleteProjects()) {
      toast({
        title: 'Permission Denied',
        description: 'You do not have permission to delete projects.',
        variant: 'destructive',
      });
      return;
    }

    // Proceed with deletion
    await deleteProject(project.id);
  };

  return (
    <PermissionGate permission="can_delete_projects">
      <Button variant="destructive" onClick={handleDelete}>
        Delete Project
      </Button>
    </PermissionGate>
  );
}
```

## Migration Notes

When adding permission checks to existing code:

1. **Identify protected actions** - What requires permissions?
2. **Add route protection** - Use `PermissionProtectedRoute`
3. **Add component gates** - Use `PermissionGate` for UI elements
4. **Add server-side validation** - Update RLS policies
5. **Test thoroughly** - Verify permissions work correctly

## Troubleshooting

**Issue**: Permission checks always return false
- **Solution**: Ensure user has an active organization and permissions are set correctly

**Issue**: Routes not protected
- **Solution**: Wrap routes with `PermissionProtectedRoute` inside `CompanyProtectedRoute`

**Issue**: UI elements still visible without permission
- **Solution**: Use `PermissionGate` component to conditionally render

**Issue**: Server-side validation failing
- **Solution**: Check RLS policies and ensure permission functions are called correctly

