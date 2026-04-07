import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { AlertTriangle, Loader2, ShieldCheck, Trash2, UserPlus } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { useConfirm } from '@/hooks/useConfirm';
import { adminMaintenanceApi, sandboxUsersApi } from '@/services/adminApi';
import type {
  SandboxAppRole,
  SandboxUserProvisionInput,
  SandboxUserProvisionResult,
  SandboxWorkzoneRole,
} from '@/types/admin';

const WORKZONE_ROLES: SandboxWorkzoneRole[] = ['User', 'Admin'];
const APP_ROLES: SandboxAppRole[] = ['PredictionUser', 'PredictionAdmin'];

const normalizeEmail = (value: string): string | null => {
  const email = value.trim().toLowerCase();
  if (!email || !email.includes('@')) return null;
  return email;
};

const parseEmails = (value: string): string[] => {
  const parts = value
    .split(/[\n,;\s]+/)
    .map((item) => normalizeEmail(item))
    .filter((item): item is string => Boolean(item));

  return [...new Set(parts)];
};

export function UserProvisionPage() {
  const { confirm, ConfirmDialog } = useConfirm();
  const [emailsText, setEmailsText] = useState('');
  const [workzoneUserSelected, setWorkzoneUserSelected] = useState(true);
  const [workzoneAdminSelected, setWorkzoneAdminSelected] = useState(false);
  const [predictionUserSelected, setPredictionUserSelected] = useState(true);
  const [predictionAdminSelected, setPredictionAdminSelected] = useState(false);
  const [defaultPassword, setDefaultPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [clearingData, setClearingData] = useState(false);
  const [results, setResults] = useState<SandboxUserProvisionResult[]>([]);

  const parsedSummary = useMemo(() => {
    const emails = parseEmails(emailsText);
    const trimmedPassword = defaultPassword.trim();

    const assignedWorkzoneRoles = WORKZONE_ROLES.filter((role) =>
      role === 'User' ? workzoneUserSelected : workzoneAdminSelected
    );

    const assignedAppRoles = APP_ROLES.filter((role) =>
      role === 'PredictionUser' ? predictionUserSelected : predictionAdminSelected
    );

    const payload: SandboxUserProvisionInput[] = emails.map((email) => ({
      email,
      workzoneRoles: assignedWorkzoneRoles,
      appRoles: assignedAppRoles,
      // Keep legacy fields for backward compatibility.
      workzoneRole: assignedWorkzoneRoles.includes('Admin') ? 'Admin' : assignedWorkzoneRoles[0],
      appRole: assignedAppRoles.includes('PredictionAdmin') ? 'PredictionAdmin' : assignedAppRoles[0],
      password: trimmedPassword || undefined,
    }));

    return {
      emails,
      payload,
      assignedWorkzoneRoles,
      assignedAppRoles,
      defaultPasswordConfigured: trimmedPassword.length > 0,
    };
  }, [
    emailsText,
    workzoneUserSelected,
    workzoneAdminSelected,
    predictionUserSelected,
    predictionAdminSelected,
    defaultPassword,
  ]);

  const handleProvision = async () => {
    if (parsedSummary.payload.length === 0) {
      toast.error('Please provide at least one valid email.');
      return;
    }

    if (parsedSummary.assignedWorkzoneRoles.length === 0 || parsedSummary.assignedAppRoles.length === 0) {
      toast.error('Select at least one Workzone role and one App role.');
      return;
    }

    setLoading(true);
    try {
      const provisionResults = await sandboxUsersApi.provision(parsedSummary.payload);
      setResults(provisionResults);

      const successCount = provisionResults.filter((item) => item.success).length;
      const failedCount = provisionResults.length - successCount;
      if (failedCount === 0) {
        toast.success(`Provisioned ${successCount} user(s).`);
      } else {
        toast.warning(`Provision completed: ${successCount} success, ${failedCount} failed.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to provision sandbox users.');
    } finally {
      setLoading(false);
    }
  };

  const handleClearAllData = async () => {
    const confirmed = await confirm({
      title: 'Clear all non-player data?',
      description:
        'This will permanently delete tournaments, teams, matches, brackets, predictions, score bets, champion picks, and tournament stats. Player accounts stay, but player rankings, points, streaks, and favorite teams will be reset.',
      confirmLabel: 'Clear data',
      cancelLabel: 'Keep data',
      destructive: true,
    });

    if (!confirmed) return;

    setClearingData(true);
    try {
      const result = await adminMaintenanceApi.clearAllDataExceptPlayers();
      toast.success(result.message);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to clear non-player data.');
    } finally {
      setClearingData(false);
    }
  };

  return (
    <>
      <div className="space-y-6">
        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-primary" />
              User Provisioning
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="sandbox-emails">Emails</Label>
              <Textarea
                id="sandbox-emails"
                value={emailsText}
                onChange={(event) => setEmailsText(event.target.value)}
                placeholder={'john.doe@conarum.com\njane.smith@conarum.com'}
                className="min-h-32"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="sandbox-workzone-user"
                    checked={workzoneUserSelected}
                    onCheckedChange={(checked) => setWorkzoneUserSelected(checked === true)}
                  />
                  <Label htmlFor="sandbox-workzone-user">Workzone User</Label>
                </div>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="sandbox-workzone-admin"
                    checked={workzoneAdminSelected}
                    onCheckedChange={(checked) => setWorkzoneAdminSelected(checked === true)}
                  />
                  <Label htmlFor="sandbox-workzone-admin">Workzone Admin</Label>
                </div>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="sandbox-app-user"
                    checked={predictionUserSelected}
                    onCheckedChange={(checked) => setPredictionUserSelected(checked === true)}
                  />
                  <Label htmlFor="sandbox-app-user">PredictionUser</Label>
                </div>
              </div>

              <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-3">
                <div className="flex items-start gap-3">
                  <Checkbox
                    id="sandbox-app-admin"
                    checked={predictionAdminSelected}
                    onCheckedChange={(checked) => setPredictionAdminSelected(checked === true)}
                  />
                  <Label htmlFor="sandbox-app-admin">PredictionAdmin</Label>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="sandbox-default-password">Initial Password (optional)</Label>
              <Input
                id="sandbox-default-password"
                type="password"
                value={defaultPassword}
                onChange={(event) => setDefaultPassword(event.target.value)}
                placeholder="Leave blank to use backend env IDP_DEFAULT_PASSWORD or no password"
              />
            </div>

            <div className="rounded-lg border border-border/80 bg-muted/20 px-3 py-3">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline">{parsedSummary.emails.length} email(s)</Badge>
                {parsedSummary.assignedWorkzoneRoles.map((role) => (
                  <Badge key={`workzone-${role}`} variant="outline">
                    Workzone {role}
                  </Badge>
                ))}
                {parsedSummary.assignedAppRoles.map((role) => (
                  <Badge key={role} variant="secondary">
                    {role}
                  </Badge>
                ))}
                <Badge variant={parsedSummary.defaultPasswordConfigured ? 'default' : 'outline'}>
                  Password: {parsedSummary.defaultPasswordConfigured ? 'From form' : 'Backend env / none'}
                </Badge>
              </div>
            </div>

            <Button onClick={handleProvision} disabled={loading || clearingData || parsedSummary.payload.length === 0}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Provision Users
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/80 shadow-sm">
          <CardHeader>
            <CardTitle>Provision Results</CardTitle>
          </CardHeader>
          <CardContent>
            {results.length === 0 ? (
              <p className="text-sm text-muted-foreground">No provisioning executed yet.</p>
            ) : (
              <div className="space-y-3">
                {results.map((item) => (
                  <div
                    key={`${item.email}-${item.status}-${item.idpUserId ?? 'none'}`}
                    className="rounded-lg border border-border/80 bg-card px-3 py-3"
                  >
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-medium text-foreground">{item.email}</p>
                      <Badge variant={item.success ? 'default' : 'destructive'}>{item.status}</Badge>
                      {item.assignedGroups.map((group) => (
                        <Badge key={`${item.email}-${group}`} variant="outline">
                          {group}
                        </Badge>
                      ))}
                      {item.assignedAppRoles.map((role) => (
                        <Badge key={`${item.email}-${role}`} variant="secondary">
                          {role}
                        </Badge>
                      ))}
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">{item.message}</p>
                    {(item.passwordApplied || item.idpUserId) && (
                      <p className="mt-1 text-xs text-muted-foreground">
                        {item.passwordApplied
                          ? `Password: ${item.passwordSource === 'request' ? 'request payload' : 'backend environment'}. `
                          : ''}
                        {item.idpUserId ? `IDP User ID: ${item.idpUserId}` : ''}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-destructive/30 bg-destructive/5 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="h-5 w-5" />
              Danger Zone
            </CardTitle>
            <CardDescription className="text-destructive/80">
              Reset tournaments, teams, matches, bets, picks, and leaderboard data while keeping player accounts.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Button variant="destructive" onClick={handleClearAllData} disabled={loading || clearingData}>
              {clearingData ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Trash2 className="mr-2 h-4 w-4" />}
              Clear All Data Except Players
            </Button>
          </CardContent>
        </Card>
      </div>

      {ConfirmDialog}
    </>
  );
}
