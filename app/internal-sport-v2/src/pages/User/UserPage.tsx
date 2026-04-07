import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { toast } from 'sonner';
import { Save, UserRound } from 'lucide-react';
import { useTranslation } from 'react-i18next';

import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import axiosInstance from '@/services/core/axiosInstance';

type UserProfile = {
  avatarUrl?: string | null;
  displayName?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  roles?: string[];
  isAdmin?: boolean | null;
  phone?: string | null;
  country?: string | null;
  city?: string | null;
  timezone?: string | null;
  favoriteTeamId?: string | null;
  favoriteTeam?: string | null;
  bio?: string | null;
};

type EditableUserProfile = {
  avatarUrl: string;
  displayName: string;
  firstName: string;
  lastName: string;
  email: string;
  roles: string[];
  isAdmin: boolean;
  phone: string;
  country: string;
  city: string;
  timezone: string;
  favoriteTeamId?: string | null;
  favoriteTeam: string;
  bio: string;
};

function toEditableProfile(profile: UserProfile): EditableUserProfile {
  return {
    avatarUrl: profile.avatarUrl || '',
    displayName: profile.displayName || '',
    firstName: profile.firstName || '',
    lastName: profile.lastName || '',
    email: profile.email || '',
    roles: Array.isArray(profile.roles) ? profile.roles : [],
    isAdmin: profile.isAdmin === true,
    phone: profile.phone || '',
    country: profile.country || '',
    city: profile.city || '',
    timezone: profile.timezone || '',
    favoriteTeamId: profile.favoriteTeamId ?? null,
    favoriteTeam: profile.favoriteTeam || '',
    bio: profile.bio || '',
  };
}

function getErrorMessage(error: unknown) {
  const maybeAxiosError = error as {
    response?: {
      data?: {
        error?: {
          message?: string;
        };
        message?: string;
      };
    };
    message?: string;
  };

  return (
    maybeAxiosError?.response?.data?.error?.message ||
    maybeAxiosError?.response?.data?.message ||
    maybeAxiosError?.message ||
    'Something went wrong'
  );
}

export function UserPage() {
  const { t } = useTranslation();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<EditableUserProfile | null>(null);
  const [isEditing, setIsEditing] = useState(false);

  const profileQuery = useQuery({
    queryKey: ['userProfile'],
    queryFn: async () => {
      const response = await axiosInstance.get('/api/player/getMyProfile()');
      return toEditableProfile((response.data || {}) as UserProfile);
    },
    refetchOnWindowFocus: false,
  });

  useEffect(() => {
    if (!profileQuery.data) return;
    setDraft(profileQuery.data);
  }, [profileQuery.data]);

  const saveProfileMutation = useMutation({
    mutationFn: async (profile: EditableUserProfile) => {
      const payload = {
        displayName: profile.displayName || '',
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        bio: profile.bio || '',
      };

      const response = await axiosInstance.post('/api/player/updateMyProfile', payload);
      return toEditableProfile((response.data || {}) as UserProfile);
    },
    onSuccess: (savedProfile) => {
      queryClient.setQueryData(['userProfile'], savedProfile);
      void queryClient.invalidateQueries({ queryKey: ['userInfo'] });
      setDraft(savedProfile);
      setIsEditing(false);
      toast.success(t('userPage.saved', 'Profile updated successfully.'));
    },
    onError: (error) => {
      toast.error(t('userPage.saveFailed', 'Failed to update profile.'), {
        description: getErrorMessage(error),
      });
    },
  });

  const initials = useMemo(() => {
    const source = [draft?.firstName, draft?.lastName].filter(Boolean).join(' ') || draft?.displayName || draft?.email || 'U';
    return source
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() || '')
      .join('');
  }, [draft?.displayName, draft?.email, draft?.firstName, draft?.lastName]);

  const handleFieldChange = (field: keyof EditableUserProfile, value: string) => {
    setDraft((current) => (current ? { ...current, [field]: value } : current));
  };

  const handleCancel = () => {
    setDraft(profileQuery.data ?? null);
    setIsEditing(false);
  };

  if (profileQuery.isLoading && !draft) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-muted-foreground">
        {t('userPage.loading', 'Loading your profile...')}
      </div>
    );
  }

  if (profileQuery.isError || !draft) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-sm text-destructive">
        {t('userPage.loadError', 'Unable to load your profile right now.')}
      </div>
    );
  }

  return (
    <div className="scrollbar-hidden flex min-h-0 flex-1 flex-col gap-3 overflow-auto pr-1 sm:gap-4">
      <div className="space-y-0.5 sm:space-y-1">
        <h1 className="text-xl font-semibold text-foreground sm:text-2xl">{t('userPage.title', 'User Profile')}</h1>
        <p className="text-xs text-muted-foreground sm:text-sm">
          {t('userPage.subtitle', 'Manage your personal details and tournament identity in one place.')}
        </p>
      </div>

      <div className="grid gap-3 sm:gap-4 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[320px_minmax(0,1fr)]">
        <Card className="gap-0">
          <CardHeader className="border-b">
            <CardTitle>{t('userPage.summary', 'Summary')}</CardTitle>
            <CardDescription>{t('userPage.summaryHint', 'This card shows the identity currently synced from backend.')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 pt-4 sm:pt-6">
            <div className="flex items-center gap-3 sm:gap-4">
              <Avatar className="h-12 w-12 border border-border sm:h-16 sm:w-16">
                <AvatarImage src={draft.avatarUrl || undefined} alt={draft.displayName || draft.email} />
                <AvatarFallback className="bg-primary/10 text-base font-semibold text-primary sm:text-lg">
                  {initials || 'U'}
                </AvatarFallback>
              </Avatar>

              <div className="min-w-0">
                <p className="truncate text-base font-semibold text-foreground sm:text-lg">
                  {draft.displayName || draft.email || t('userPage.unknownUser', 'User')}
                </p>
                <p className="truncate text-xs text-muted-foreground sm:text-sm">{draft.email || '-'}</p>
              </div>
            </div>

            {/* <div className="flex flex-wrap gap-2">
              {draft.roles.length > 0 ? (
                draft.roles.map((role) => (
                  <Badge key={role} variant="outline" className="rounded-full">
                    {role}
                  </Badge>
                ))
              ) : (
                <Badge variant="outline" className="rounded-full">
                  {t('userPage.noRoles', 'No roles')}
                </Badge>
              )}
            </div> */}

            {/* <div className="space-y-3 rounded-xl border border-border/70 bg-muted/30 p-4 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                <span>{draft.email || '-'}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                <span>{draft.phone || t('userPage.emptyField', 'Not set')}</span>
              </div>
              <div className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                <span>
                  {[draft.city, draft.country].filter(Boolean).join(', ') || t('userPage.emptyField', 'Not set')}
                </span>
              </div>
            </div> */}
          </CardContent>
        </Card>

        <Card className="gap-0">
          <CardHeader className="border-b">
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-start sm:justify-between sm:gap-3">
              <div className="min-w-0">
                <CardTitle>{t('userPage.details', 'Profile Details')}</CardTitle>
                <CardDescription className="text-xs sm:text-sm">{t('userPage.detailsHint', 'Keep your profile current so leaderboard and admin views stay clean.')}</CardDescription>
              </div>

              {isEditing ? (
                <div className="flex items-center gap-2">
                  <Button type="button" size="sm" variant="outline" onClick={handleCancel} disabled={saveProfileMutation.isPending} className="flex-1 sm:flex-none">
                    {t('common.cancel', 'Cancel')}
                  </Button>
                  <Button type="button" size="sm" onClick={() => saveProfileMutation.mutate(draft)} disabled={saveProfileMutation.isPending} className="flex-1 sm:flex-none">
                    <Save className="h-4 w-4" />
                    {saveProfileMutation.isPending ? t('common.saving', 'Saving...') : t('common.save', 'Save')}
                  </Button>
                </div>
              ) : (
                <Button type="button" size="sm" variant="subtle" onClick={() => setIsEditing(true)} className="w-full sm:w-auto">
                  <UserRound className="h-4 w-4" />
                  {t('userPage.edit', 'Edit Profile')}
                </Button>
              )}
            </div>
          </CardHeader>

          <CardContent className="grid gap-3 pt-4 sm:gap-4 sm:pt-6 md:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="user-display-name">{t('userPage.fields.displayName', 'Display Name')}</Label>
              <Input
                id="user-display-name"
                value={draft.displayName}
                onChange={(event) => handleFieldChange('displayName', event.target.value)}
                readOnly={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-first-name">{t('userPage.fields.firstName', 'First Name')}</Label>
              <Input
                id="user-first-name"
                value={draft.firstName}
                onChange={(event) => handleFieldChange('firstName', event.target.value)}
                readOnly={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-last-name">{t('userPage.fields.lastName', 'Last Name')}</Label>
              <Input
                id="user-last-name"
                value={draft.lastName}
                onChange={(event) => handleFieldChange('lastName', event.target.value)}
                readOnly={!isEditing}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="user-email">{t('userPage.fields.email', 'Email')}</Label>
              <Input id="user-email" value={draft.email} readOnly />
            </div>

            <div className="space-y-2 md:col-span-2">
              <Label htmlFor="user-bio">{t('userPage.fields.bio', 'Bio')}</Label>
              <Textarea
                id="user-bio"
                rows={3}
                className="sm:min-h-[120px]"
                value={draft.bio}
                onChange={(event) => handleFieldChange('bio', event.target.value)}
                readOnly={!isEditing}
                placeholder={t('userPage.bioPlaceholder', 'Add a short note about yourself, your favorite team, or your prediction style.')}
              />
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
