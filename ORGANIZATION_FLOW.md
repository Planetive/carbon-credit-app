# Organization Management Flow

## Overview

This document explains how the multi-organization system works, including how users create organizations, invite others, and manage access.

## User Flow

### 1. New User Registration

**Scenario:** A new user signs up for an account.

1. User registers with email/password
2. Account is created in `auth.users`
3. Profile is created in `profiles` table
4. User can now:
   - Log in
   - Go to **Settings** page
   - Create their first organization (e.g., "A1")
   - Automatically becomes **Admin** of that organization
   - Can create more organizations (A2, A3, etc.)

### 2. Creating Organizations

**Any authenticated user can create organizations** from the Settings page:

1. Navigate to **Settings → Organizations** tab
2. Click **"Create Organization"**
3. Enter organization name and description
4. Organization is created
5. User automatically becomes **Admin** with full permissions
6. Organization appears in their organization list
7. Can switch between organizations anytime

**Key Points:**
- No limit on number of organizations a user can create
- Each organization is independent
- User is always admin of organizations they create
- Can create parent organizations or sub-organizations

### 3. Inviting Users

**Scenario:** Admin of Organization A1 wants to invite a user.

1. Admin goes to **User Management** page
2. Clicks **"Invite User"**
3. Enters email address and selects role
4. Invitation is created with secure token
5. Email is sent (when email service is configured)
6. Invited user receives email with invitation link

### 4. Invitation Acceptance Flow

**Two scenarios:**

#### Scenario A: User Already Has Account

1. User clicks invitation link
2. If not logged in, redirected to login
3. After login, redirected back to invitation page
4. System verifies email matches invitation
5. User accepts invitation
6. User is added to the organization with specified role
7. Organization appears in their organization list
8. User can now switch to that organization

#### Scenario B: User Doesn't Have Account

1. User clicks invitation link
2. Sees invitation details
3. Clicks **"Create Account"** or **"Log In"**
4. If creating account:
   - Signs up with email (must match invitation email)
   - Account is created
   - Redirected back to invitation page
5. Accepts invitation
6. Added to organization
7. Can now create their own organizations (B1, B2, etc.)

**Key Points:**
- Invited users **must** use the email address they were invited with
- After accepting invitation, they can create their own organizations
- They can belong to multiple organizations simultaneously
- Each organization membership is independent

### 5. Organization Switching

**Any user can switch between organizations they belong to:**

1. Go to **Settings → Organizations** tab
2. See list of all organizations they're a member of
3. Current organization is highlighted
4. Click **"Switch"** on any other organization
5. System updates `current_organization_id` in profile
6. Page reloads with new organization context
7. All data is now scoped to the selected organization

**Key Points:**
- Switching is instant
- All permissions and data are scoped to current organization
- Can switch back anytime
- Organization switcher in header also allows quick switching

### 6. Creating Own Organizations After Being Invited

**Scenario:** User was invited to Organization A1, now wants to create B1.

1. User accepts invitation to A1 (becomes member)
2. Can switch to A1 and work there
3. Can go to **Settings → Organizations**
4. Click **"Create Organization"**
5. Creates "B1" organization
6. Automatically becomes **Admin** of B1
7. Can invite others to B1
8. Can switch between A1 and B1 anytime

**Key Points:**
- Being invited to an organization does NOT prevent creating your own
- Each user can be:
  - Admin of organizations they create
  - Member (with any role) of organizations they're invited to
- All organizations are independent
- No hierarchy restrictions (except parent-child relationships)

## Architecture

### Database Structure

```
auth.users
  └── profiles (user_id, current_organization_id)
       └── user_organizations (user_id, organization_id, role, permissions)
            └── organizations (id, name, parent_organization_id)
```

### Key Tables

1. **organizations**
   - Stores organization data
   - Can have parent_organization_id (for sub-organizations)
   - Created by any authenticated user

2. **user_organizations**
   - Junction table linking users to organizations
   - Stores role and permissions per membership
   - User can have multiple rows (one per organization)

3. **organization_invitations**
   - Stores pending invitations
   - Links to organization and specifies role/permissions
   - Expires after 7 days

### Permission System

- **Role-based:** Admin, User, Editor, Viewer
- **Granular:** Per-feature permissions (can_create_projects, etc.)
- **Scoped:** Permissions are per-organization
- **Hierarchical:** Admins have all permissions automatically

### Data Isolation

- All data is scoped to `current_organization_id`
- Users only see data for their current organization
- Switching organizations changes the data context
- RLS policies enforce organization-level access

## Settings Page Features

The Settings page (`/settings`) provides:

### 1. Account Tab
- User profile information
- Email address
- Account creation date
- User ID

### 2. Organizations Tab
- **List all organizations** user belongs to
- **Current organization** highlighted
- **Switch** between organizations
- **Create new organization** button
- **Quick actions:**
  - Manage Users (if has permission)
  - Organization Management (if has permission)

### 3. Permissions Tab
- View current organization permissions
- See role and all permissions
- Understand what actions are available

## Common Scenarios

### Scenario 1: New User Creates First Organization
1. User signs up
2. Goes to Settings
3. Creates "My Company"
4. Becomes admin automatically
5. Can invite team members

### Scenario 2: User Invited to Multiple Organizations
1. User receives invitation to "Company A"
2. Accepts invitation (becomes member)
3. Later receives invitation to "Company B"
4. Accepts invitation (now member of both)
5. Can switch between A and B
6. Can create own organization "My Startup"
7. Now member of 3 organizations total

### Scenario 3: Admin Invites New User
1. Admin invites "newuser@example.com"
2. New user doesn't have account yet
3. Clicks invitation link
4. Creates account with that email
5. Accepts invitation
6. Added to organization
7. Can now create own organizations too

### Scenario 4: User Creates Sub-Organization
1. User is admin of "Parent Corp"
2. Goes to Organization Management
3. Creates "Subsidiary A" as child
4. Both organizations appear in list
5. Can switch between them
6. Can manage both independently

## Best Practices

1. **Organization Naming:** Use clear, descriptive names
2. **Role Assignment:** Start with minimal permissions, add more as needed
3. **Invitation Management:** Regularly review and cancel expired invitations
4. **Organization Cleanup:** Deactivate unused organizations
5. **Permission Audits:** Regularly review user permissions

## Security Considerations

1. **Email Verification:** Invited users must use the exact email address
2. **Permission Checks:** Both client and server validate permissions
3. **RLS Policies:** Database enforces organization-level access
4. **Token Security:** Invitation tokens are cryptographically secure
5. **Expiration:** Invitations expire after 7 days

## FAQ

**Q: Can a user create unlimited organizations?**
A: Yes, any authenticated user can create as many organizations as they want.

**Q: What happens if I'm invited to an organization but already have my own?**
A: You become a member of both. You can switch between them anytime.

**Q: Can I be admin of an organization I didn't create?**
A: Yes, if the current admin changes your role to admin.

**Q: Can I remove myself from an organization?**
A: You cannot remove yourself, but an admin can remove you.

**Q: What if I forget which organization I'm in?**
A: Check the Settings page or the organization switcher in the header.

**Q: Can I delete an organization?**
A: Only admins can delete organizations (if that feature is enabled).

