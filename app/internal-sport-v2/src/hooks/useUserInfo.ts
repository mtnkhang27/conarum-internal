/**
 * useUserInfo — Stubbed version for boilerplate
 * Used by MainLayout for sidebar authorization, user profile display.
 */

interface UserInfo {
    id: string;
    roles: string[];
    givenName: string;
    familyName: string;
    email: string;
    allowedObjectTypes: string[];
}

export function useUserInfo() {
    // Stubbed data for boilerplate
    const data: UserInfo = {
        id: 'user1',
        roles: ['admin', 'user'],
        givenName: 'Test',
        familyName: 'User',
        email: 'test@example.com',
        allowedObjectTypes: []
    };

    const isLoading = false;
    const error = null;

    const givenName = data.givenName;
    const familyName = data.familyName;
    const displayName = `${givenName} ${familyName}`.trim();
    const initials = `${givenName[0]}${familyName[0]}`.toUpperCase();

    return {
        user: data,
        isAdmin: data.roles.includes('admin'),
        isUser: data.roles.includes('user'),
        allowedObjectTypes: data.allowedObjectTypes,
        displayName,
        initials,
        isLoading,
        error,
    };
}
