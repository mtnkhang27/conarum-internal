import { useState, useEffect, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
    ArrowLeft,
    Plus,
    Edit,
    Trash2,
    Shield,
    User,
    Crown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from "@/components/ui/dialog";
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "@/components/ui/select";
import {
    AlertDialog,
    AlertDialogAction,
    AlertDialogCancel,
    AlertDialogContent,
    AlertDialogDescription,
    AlertDialogFooter,
    AlertDialogHeader,
    AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { teamsApi, teamMembersApi } from "@/services/adminApi";
import type { AdminTeam, AdminTeamMember } from "@/types/admin";

const ROLES = [
    { value: "headCoach", label: "Head Coach" },
    { value: "assistantCoach", label: "Assistant Coach" },
    { value: "goalkeepingCoach", label: "GK Coach" },
    { value: "fitnessCoach", label: "Fitness Coach" },
    { value: "player", label: "Player" },
    { value: "captain", label: "Captain" },
];

const POSITIONS = ["GK", "CB", "LB", "RB", "LWB", "RWB", "CDM", "CM", "AM", "LW", "RW", "LM", "RM", "ST", "CF"];

function roleLabel(role: string) {
    return ROLES.find((r) => r.value === role)?.label || role;
}

function roleBadgeVariant(role: string) {
    switch (role) {
        case "headCoach":
        case "assistantCoach":
        case "goalkeepingCoach":
        case "fitnessCoach":
            return "secondary" as const;
        case "captain":
            return "default" as const;
        default:
            return "outline" as const;
    }
}

export function TeamDetail() {
    const { teamId } = useParams<{ teamId: string }>();
    const navigate = useNavigate();

    const [team, setTeam] = useState<AdminTeam | null>(null);
    const [members, setMembers] = useState<AdminTeamMember[]>([]);
    const [loading, setLoading] = useState(true);

    // Member dialog
    const [memberDialogOpen, setMemberDialogOpen] = useState(false);
    const [editingMember, setEditingMember] = useState<AdminTeamMember | null>(null);
    const [deleteMemberId, setDeleteMemberId] = useState<string | null>(null);

    const [memberForm, setMemberForm] = useState({
        name: "",
        role: "player",
        jerseyNumber: "",
        position: "",
        isCaptain: false,
        isActive: true,
    });

    const load = useCallback(async () => {
        if (!teamId) return;
        setLoading(true);
        try {
            const [teamData, membersData] = await Promise.all([
                teamsApi.get(teamId),
                teamMembersApi.list(teamId),
            ]);
            setTeam(teamData);
            setMembers(membersData);
        } catch (e: any) {
            toast.error(e.message);
        } finally {
            setLoading(false);
        }
    }, [teamId]);

    useEffect(() => {
        load();
    }, [load]);

    // Separate members by type
    const coaches = members.filter((m) =>
        ["headCoach", "assistantCoach", "goalkeepingCoach", "fitnessCoach"].includes(m.role)
    );
    const players = members.filter((m) =>
        ["player", "captain"].includes(m.role)
    );

    function openAddMember() {
        setEditingMember(null);
        setMemberForm({
            name: "",
            role: "player",
            jerseyNumber: "",
            position: "",
            isCaptain: false,
            isActive: true,
        });
        setMemberDialogOpen(true);
    }

    function openEditMember(member: AdminTeamMember) {
        setEditingMember(member);
        setMemberForm({
            name: member.name,
            role: member.role,
            jerseyNumber: member.jerseyNumber != null ? String(member.jerseyNumber) : "",
            position: member.position || "",
            isCaptain: member.isCaptain,
            isActive: member.isActive,
        });
        setMemberDialogOpen(true);
    }

    async function handleSaveMember() {
        if (!teamId) return;
        if (!memberForm.name.trim()) {
            toast.error("Member name is required");
            return;
        }

        try {
            const data: Partial<AdminTeamMember> = {
                team_ID: teamId,
                name: memberForm.name.trim(),
                role: memberForm.role as any,
                jerseyNumber: memberForm.jerseyNumber ? parseInt(memberForm.jerseyNumber) : null,
                position: memberForm.position || null,
                isCaptain: memberForm.role === "captain" || memberForm.isCaptain,
                isActive: memberForm.isActive,
            };

            if (editingMember) {
                await teamMembersApi.update(editingMember.ID, data);
                toast.success("Member updated");
            } else {
                await teamMembersApi.create(data);
                toast.success("Member added");
            }
            setMemberDialogOpen(false);
            const membersData = await teamMembersApi.list(teamId);
            setMembers(membersData);
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    async function handleDeleteMember() {
        if (!deleteMemberId || !teamId) return;
        try {
            await teamMembersApi.delete(deleteMemberId);
            toast.success("Member removed");
            setDeleteMemberId(null);
            const membersData = await teamMembersApi.list(teamId);
            setMembers(membersData);
        } catch (e: any) {
            toast.error(e.message);
        }
    }

    if (loading || !team) {
        return (
            <div className="flex h-64 items-center justify-center text-muted-foreground">
                Loading team details…
            </div>
        );
    }

    return (
        <div className="space-y-6 p-6">
            {/* Header */}
            <div className="flex items-center gap-4">
                <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => navigate("/admin/teams")}
                >
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
            </div>

            {/* Team Info Card */}
            <Card className="border-border bg-card p-6">
                <div className="flex items-start gap-6">
                    {/* Crest */}
                    <div className="flex-shrink-0">
                        {team.crest ? (
                            <img
                                src={team.crest}
                                alt={team.name}
                                className="h-24 w-24 object-contain"
                            />
                        ) : (
                            <div className="flex h-24 w-24 items-center justify-center rounded-lg bg-surface">
                                <Shield className="h-12 w-12 text-muted-foreground" />
                            </div>
                        )}
                    </div>

                    {/* Info */}
                    <div className="flex-1 space-y-2">
                        <h1 className="text-2xl font-bold text-white">{team.name}</h1>
                        <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                            {team.shortName && (
                                <span>Short: <span className="text-white">{team.shortName}</span></span>
                            )}
                            {team.tla && (
                                <Badge variant="secondary" className="font-mono">
                                    {team.tla}
                                </Badge>
                            )}
                            {team.confederation && (
                                <Badge variant="outline">{team.confederation}</Badge>
                            )}
                            {team.fifaRanking && (
                                <span>FIFA Rank: <span className="text-white font-mono">#{team.fifaRanking}</span></span>
                            )}
                            <span>Country: <span className={`fi fi-${team.flagCode} ml-1`} /></span>
                        </div>
                        {/* Tournament participation */}
                        {team.tournaments && team.tournaments.length > 0 && (
                            <div className="flex flex-wrap gap-2 pt-2">
                                {team.tournaments.map((tt) => (
                                    <Badge
                                        key={tt.ID}
                                        variant={tt.isEliminated ? "destructive" : "default"}
                                        className="text-xs"
                                    >
                                        {tt.tournament?.name || "Tournament"}
                                    </Badge>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            </Card>

            {/* Coaching Staff */}
            <div>
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">
                        Coaching Staff ({coaches.length})
                    </h2>
                </div>
                {coaches.length > 0 ? (
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                        {coaches.map((member) => (
                            <Card
                                key={member.ID}
                                className="border-border bg-card p-4"
                            >
                                <div className="flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-surface">
                                            <User className="h-5 w-5 text-muted-foreground" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{member.name}</p>
                                            <Badge variant={roleBadgeVariant(member.role)} className="text-xs">
                                                {roleLabel(member.role)}
                                            </Badge>
                                        </div>
                                    </div>
                                    <div className="flex gap-1">
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
                                            onClick={() => openEditMember(member)}
                                        >
                                            <Edit className="h-3.5 w-3.5" />
                                        </Button>
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                            onClick={() => setDeleteMemberId(member.ID)}
                                        >
                                            <Trash2 className="h-3.5 w-3.5" />
                                        </Button>
                                    </div>
                                </div>
                            </Card>
                        ))}
                    </div>
                ) : (
                    <p className="text-sm text-muted-foreground">No coaching staff added</p>
                )}
            </div>

            {/* Players */}
            <div>
                <div className="mb-3 flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-white">
                        Squad ({players.length})
                    </h2>
                    <Button size="sm" onClick={openAddMember}>
                        <Plus className="mr-2 h-4 w-4" />
                        Add Member
                    </Button>
                </div>
                <Card className="border-border bg-card">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                            <thead>
                                <tr className="border-b border-border text-left text-xs font-medium uppercase tracking-wider text-muted-foreground">
                                    <th className="px-4 py-3 w-12">#</th>
                                    <th className="px-4 py-3">Name</th>
                                    <th className="px-4 py-3">Position</th>
                                    <th className="px-4 py-3">Role</th>
                                    <th className="px-4 py-3">Status</th>
                                    <th className="px-4 py-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {players.map((member) => (
                                    <tr
                                        key={member.ID}
                                        className="border-b border-border/50 transition-colors hover:bg-surface"
                                    >
                                        <td className="px-4 py-3 font-mono text-muted-foreground">
                                            {member.jerseyNumber ?? "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2">
                                                <span className="font-medium text-white">
                                                    {member.name}
                                                </span>
                                                {member.isCaptain && (
                                                    <Crown className="h-4 w-4 text-yellow-400" />
                                                )}
                                            </div>
                                        </td>
                                        <td className="px-4 py-3 text-muted-foreground">
                                            {member.position || "—"}
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge variant={roleBadgeVariant(member.role)} className="text-xs">
                                                {member.isCaptain ? "Captain" : roleLabel(member.role)}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <Badge
                                                variant={member.isActive ? "default" : "destructive"}
                                                className="text-xs"
                                            >
                                                {member.isActive ? "Active" : "Inactive"}
                                            </Badge>
                                        </td>
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-1">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-white"
                                                    onClick={() => openEditMember(member)}
                                                >
                                                    <Edit className="h-3.5 w-3.5" />
                                                </Button>
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                    className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                                    onClick={() => setDeleteMemberId(member.ID)}
                                                >
                                                    <Trash2 className="h-3.5 w-3.5" />
                                                </Button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {players.length === 0 && (
                                    <tr>
                                        <td
                                            colSpan={6}
                                            className="px-4 py-8 text-center text-muted-foreground"
                                        >
                                            No players added yet
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                </Card>
            </div>

            {/* Add/Edit Member Dialog */}
            <Dialog open={memberDialogOpen} onOpenChange={setMemberDialogOpen}>
                <DialogContent className="border-border bg-card text-white sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle>
                            {editingMember ? "Edit Member" : "Add Team Member"}
                        </DialogTitle>
                    </DialogHeader>
                    <div className="grid gap-4 py-4">
                        <div className="space-y-2">
                            <label className="text-xs font-medium text-muted-foreground">
                                Name *
                            </label>
                            <Input
                                value={memberForm.name}
                                onChange={(e) =>
                                    setMemberForm({ ...memberForm, name: e.target.value })
                                }
                                placeholder="e.g., Bukayo Saka"
                            />
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Role
                                </label>
                                <Select
                                    value={memberForm.role}
                                    onValueChange={(v) =>
                                        setMemberForm({ ...memberForm, role: v })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {ROLES.map((r) => (
                                            <SelectItem key={r.value} value={r.value}>
                                                {r.label}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Position
                                </label>
                                <Select
                                    value={memberForm.position}
                                    onValueChange={(v) =>
                                        setMemberForm({ ...memberForm, position: v })
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        {POSITIONS.map((p) => (
                                            <SelectItem key={p} value={p}>
                                                {p}
                                            </SelectItem>
                                        ))}
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-xs font-medium text-muted-foreground">
                                    Jersey Number
                                </label>
                                <Input
                                    type="number"
                                    value={memberForm.jerseyNumber}
                                    onChange={(e) =>
                                        setMemberForm({
                                            ...memberForm,
                                            jerseyNumber: e.target.value,
                                        })
                                    }
                                    placeholder="e.g., 7"
                                />
                            </div>
                            <div className="flex items-end pb-1">
                                <label className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer">
                                    <input
                                        type="checkbox"
                                        checked={memberForm.isActive}
                                        onChange={(e) =>
                                            setMemberForm({
                                                ...memberForm,
                                                isActive: e.target.checked,
                                            })
                                        }
                                        className="rounded"
                                    />
                                    Active
                                </label>
                            </div>
                        </div>
                    </div>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setMemberDialogOpen(false)}
                        >
                            Cancel
                        </Button>
                        <Button onClick={handleSaveMember}>
                            {editingMember ? "Update" : "Add"} Member
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Delete Member Confirmation */}
            <AlertDialog
                open={!!deleteMemberId}
                onOpenChange={(open) => !open && setDeleteMemberId(null)}
            >
                <AlertDialogContent className="border-border bg-card text-white">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Remove Member</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to remove this team member?
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel>Cancel</AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleDeleteMember}
                            className="bg-destructive text-white hover:bg-destructive/90"
                        >
                            Remove
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
