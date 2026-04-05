import { useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2, UserPlus, ShieldCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { sandboxUsersApi } from '@/services/adminApi';
import type { SandboxUserProvisionInput, SandboxUserProvisionResult } from '@/types/admin';

const DEFAULT_USER_GROUP = 'CNMA_CONARUM_INTERNAL_USER';
const DEFAULT_ADMIN_GROUP = 'CNMA_CONARUM_INTERNAL_ADMIN';
const DEFAULT_USER_APP_ROLE = 'PredictionUser';
const DEFAULT_ADMIN_APP_ROLE = 'PredictionAdmin';

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
  const [userEmailsText, setUserEmailsText] = useState('');
  const [adminEmailsText, setAdminEmailsText] = useState('');
  const [defaultPassword, setDefaultPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<SandboxUserProvisionResult[]>([]);

  const parsedSummary = useMemo(() => {
    const users = parseEmails(userEmailsText);
    const admins = parseEmails(adminEmailsText);
    const adminSet = new Set(admins);
    const trimmedPassword = defaultPassword.trim();

    const payload: SandboxUserProvisionInput[] = users.map((email) => ({
      email,
      appRole: adminSet.has(email) ? DEFAULT_ADMIN_APP_ROLE : DEFAULT_USER_APP_ROLE,
      password: trimmedPassword || undefined,
      makeAdmin: adminSet.has(email),
    }));

    return {
      users,
      admins,
      payload,
      defaultPasswordConfigured: trimmedPassword.length > 0,
    };
  }, [userEmailsText, adminEmailsText, defaultPassword]);

  const handleProvision = async () => {
    if (parsedSummary.payload.length === 0) {
      toast.error('Please provide at least one valid email in the user list.');
      return;
    }

    setLoading(true);
    try {
      const provisionResults = await sandboxUsersApi.provision(parsedSummary.payload);
      setResults(provisionResults);

      const successCount = provisionResults.filter((item) => item.success).length;
      const failedCount = provisionResults.length - successCount;
      if (failedCount === 0) {
        toast.success(`Provisioned ${successCount} user(s) to sandbox IDP.`);
      } else {
        toast.warning(`Provision completed: ${successCount} success, ${failedCount} failed.`);
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to provision sandbox users.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserPlus className="h-5 w-5 text-primary" />
            Sandbox User Provisioning
          </CardTitle>
          <CardDescription>
            Create users in the sandbox application IDP, always assign group {DEFAULT_USER_GROUP}, and mirror app role{' '}
            {DEFAULT_USER_APP_ROLE}. Emails listed as admin also receive group {DEFAULT_ADMIN_GROUP} and app role{' '}
            {DEFAULT_ADMIN_APP_ROLE}.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-5">
          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">User Emails (one per line or separated by comma)</p>
            <Textarea
              value={userEmailsText}
              onChange={(event) => setUserEmailsText(event.target.value)}
              placeholder="john.doe@conarum.com\njane.smith@conarum.com"
              className="min-h-32"
            />
            <p className="text-xs text-muted-foreground">These users always receive group {DEFAULT_USER_GROUP}.</p>
          </div>

          <div className="space-y-2">
            <p className="text-sm font-medium text-foreground">Admin Emails (optional)</p>
            <Textarea
              value={adminEmailsText}
              onChange={(event) => setAdminEmailsText(event.target.value)}
              placeholder="admin.user@conarum.com"
              className="min-h-24"
            />
            <p className="text-xs text-muted-foreground">Emails listed here also receive group {DEFAULT_ADMIN_GROUP}.</p>
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
            <p className="text-xs text-muted-foreground">
              If you enter a password here, newly created users will receive it as the initial password. Existing users keep their
              current password.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 rounded-lg border border-border/80 bg-muted/20 px-3 py-2 text-xs text-muted-foreground">
            <span>Total users: {parsedSummary.users.length}</span>
            <span>Admin users: {parsedSummary.admins.length}</span>
            <Badge variant="outline">Default Group: {DEFAULT_USER_GROUP}</Badge>
            <Badge variant="outline">Admin Group: {DEFAULT_ADMIN_GROUP}</Badge>
            <Badge variant="outline">User Role: {DEFAULT_USER_APP_ROLE}</Badge>
            <Badge variant="outline">Admin Role: {DEFAULT_ADMIN_APP_ROLE}</Badge>
            <Badge variant={parsedSummary.defaultPasswordConfigured ? 'default' : 'outline'}>
              Password: {parsedSummary.defaultPasswordConfigured ? 'From form' : 'Backend env / none'}
            </Badge>
          </div>

          <div>
            <Button onClick={handleProvision} disabled={loading || parsedSummary.payload.length === 0}>
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <ShieldCheck className="mr-2 h-4 w-4" />}
              Provision Users to Sandbox
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card className="border-border/80 shadow-sm">
        <CardHeader>
          <CardTitle>Provision Results</CardTitle>
          <CardDescription>Latest execution output from sandbox provisioning API.</CardDescription>
        </CardHeader>
        <CardContent>
          {results.length === 0 ? (
            <p className="text-sm text-muted-foreground">No provisioning executed yet.</p>
          ) : (
            <div className="space-y-3">
              {results.map((item) => (
                <div key={`${item.email}-${item.status}`} className="rounded-lg border border-border/80 bg-card px-3 py-3">
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
                  {item.passwordApplied ? (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Initial password applied via {item.passwordSource === 'request' ? 'request payload' : 'backend environment'}.
                    </p>
                  ) : null}
                  {item.idpUserId ? (
                    <p className="mt-1 text-xs text-muted-foreground">IDP User ID: {item.idpUserId}</p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
