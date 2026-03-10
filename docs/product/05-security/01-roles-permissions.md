# Roles & Permissions

The **Conarum Prediction** platform uses a role-based access control (RBAC) system to ensure that only authorized users have access to specific features and data.

## 1. User Roles
The platform defines two primary user roles:
- **PredictionUser:** The standard role for all employees. It allows users to make predictions, view leaderboards, and manage their profiles.
- **PredictionAdmin:** The administrative role with full access to the platform. It allows admins to manage matches, tournaments, teams, and players.

## 2. Permissions per Role
The following table summarizes the permissions available to each role:

| Feature | PredictionUser | PredictionAdmin |
|---------|----------------|-----------------|
| View Matches | ✅ | ✅ |
| Make Predictions | ✅ | ✅ |
| View Leaderboard | ✅ | ✅ |
| Edit Profile | ✅ | ✅ |
| Create/Edit Matches | ❌ | ✅ |
| Create/Edit Tournaments | ❌ | ✅ |
| Manage Players | ❌ | ✅ |
| Set Match Results | ❌ | ✅ |
| Trigger Scoring | ❌ | ✅ |
| Sync Match Data | ❌ | ✅ |

## 3. Account Access
- Access to the platform is granted through **SAP BTP XSUAA** (internal SSO).
- Users are automatically assigned the **PredictionUser** role upon their first login.
- **PredictionAdmin** roles are manually assigned by the IT or system administrator.

## 4. Data Privacy
- Your personal information (e.g., email address, display name) is stored securely and only used for platform purposes (e.g., leaderboard, prize distribution).
- Your predictions are visible to others once the match kickoff passes.
- For more information on how we handle your data, please refer to the company's privacy policy.
