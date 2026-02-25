import { useRef, useState } from "react";
import { toast } from "sonner";
import { User } from "lucide-react";
import { Button } from "@/components/ui/button";
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
import { defaultProfile } from "@/data/mockData";
import type { UserProfile } from "@/types";

function inputClass(isEditing: boolean) {
    if (isEditing) {
        return "w-full rounded border border-border bg-surface-dark px-3 py-2 text-sm text-foreground placeholder:text-muted-foreground outline-none transition-colors focus:border-primary";
    }
    return "w-full rounded border border-border bg-background px-3 py-2 text-sm text-muted-foreground outline-none";
}

interface InfoFieldProps {
    label: string;
    name: string;
    value: string;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    isEditing: boolean;
}

function InfoField({ label, name, value, onChange, isEditing }: InfoFieldProps) {
    return (
        <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
            <input
                name={name}
                value={value}
                onChange={onChange}
                readOnly={!isEditing}
                className={inputClass(isEditing)}
            />
        </label>
    );
}

export function AccountPage() {
    const [profile, setProfile] = useState<UserProfile>(defaultProfile);
    const [draft, setDraft] = useState<UserProfile>(defaultProfile);
    const [isEditing, setIsEditing] = useState(false);
    const [avatarError, setAvatarError] = useState("");
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState({
        title: "",
        message: "",
        confirmText: "Confirm",
        variant: "primary" as "primary" | "danger",
        onConfirm: () => { },
    });

    const onFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;
        setDraft((prev) => ({ ...prev, [name]: value }));
    };

    const showConfirm = (cfg: typeof confirmConfig) => {
        setConfirmConfig(cfg);
        setConfirmOpen(true);
    };

    const onStartEdit = () => {
        setDraft(profile);
        setAvatarError("");
        setIsEditing(true);
        toast.info("Edit mode enabled", { description: "You can now update profile information." });
    };

    const onCancelEdit = () => {
        const hasChanges = JSON.stringify(draft) !== JSON.stringify(profile);
        if (hasChanges) {
            showConfirm({
                title: "Discard changes",
                message: "Unsaved profile changes will be lost. Continue?",
                confirmText: "Discard",
                variant: "danger",
                onConfirm: () => {
                    setDraft(profile);
                    setAvatarError("");
                    setIsEditing(false);
                    toast.info("Edit canceled", { description: "Profile changes were not saved." });
                },
            });
            return;
        }
        setDraft(profile);
        setAvatarError("");
        setIsEditing(false);
        toast.info("Edit canceled");
    };

    const onSaveProfile = () => {
        showConfirm({
            title: "Save profile changes",
            message: "Apply these updates to your account profile?",
            confirmText: "Save",
            variant: "primary",
            onConfirm: () => {
                setProfile(draft);
                setAvatarError("");
                setIsEditing(false);
                toast.success("Profile updated", { description: "Your account information has been saved." });
            },
        });
    };

    const onOpenAvatarPicker = () => {
        if (!isEditing) {
            toast.warning("Edit mode required", { description: "Click Edit Profile before uploading an avatar." });
            return;
        }
        avatarInputRef.current?.click();
    };

    const onAvatarSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        if (!file.type.startsWith("image/")) {
            setAvatarError("Please select an image file.");
            toast.error("Invalid file type", { description: "Please select a valid image file." });
            e.target.value = "";
            return;
        }

        if (file.size > 2 * 1024 * 1024) {
            setAvatarError("Avatar must be smaller than 2MB.");
            toast.error("File too large", { description: "Avatar image must be smaller than 2MB." });
            e.target.value = "";
            return;
        }

        const reader = new FileReader();
        reader.onload = () => {
            setDraft((prev) => ({ ...prev, avatarUrl: String(reader.result) }));
            setAvatarError("");
            toast.success("Avatar uploaded", { description: "New avatar has been added to your draft profile." });
        };
        reader.readAsDataURL(file);
        e.target.value = "";
    };

    const onRemoveAvatar = () => {
        if (!isEditing) {
            toast.warning("Edit mode required", { description: "Click Edit Profile before removing avatar." });
            return;
        }
        if (!draft.avatarUrl) {
            toast.info("No avatar to remove", { description: "Default avatar is already in use." });
            return;
        }
        setDraft((prev) => ({ ...prev, avatarUrl: "" }));
        setAvatarError("");
        toast.info("Avatar removed", { description: "Avatar has been reset to default icon." });
    };

    const currentAvatarUrl = isEditing ? draft.avatarUrl : profile.avatarUrl;

    return (
        <div className="p-4 pb-20 xl:pb-4">
            <div className="mb-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <span className="h-6 w-1 rounded-full bg-primary" />
                    Account
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                    Display and edit your basic user information.
                </p>
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
                {/* Left: Profile card */}
                <section className="rounded-xl border border-border bg-card p-5">
                    <div className="mb-4 flex items-center gap-4">
                        {currentAvatarUrl ? (
                            <img
                                src={currentAvatarUrl}
                                alt="User avatar"
                                className="h-16 w-16 rounded-full border border-border object-cover"
                            />
                        ) : (
                            <span className="inline-flex h-16 w-16 items-center justify-center rounded-full border border-border bg-surface text-muted-foreground">
                                <User className="h-8 w-8" />
                            </span>
                        )}
                        <div>
                            <p className="text-lg font-extrabold text-white">{profile.displayName}</p>
                            <p className="text-sm text-muted-foreground">{profile.email}</p>
                        </div>
                    </div>

                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <input ref={avatarInputRef} type="file" accept="image/*" onChange={onAvatarSelected} className="hidden" />
                        <Button
                            size="sm"
                            onClick={onOpenAvatarPicker}
                            disabled={!isEditing}
                            className={`text-[11px] font-bold uppercase tracking-wide ${isEditing ? "bg-primary text-white hover:bg-primary/80" : "cursor-not-allowed bg-surface text-muted-foreground"
                                }`}
                        >
                            Upload Avatar
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onRemoveAvatar}
                            disabled={!isEditing}
                            className={`text-[11px] font-bold uppercase tracking-wide ${!isEditing ? "cursor-not-allowed" : ""
                                }`}
                        >
                            Remove
                        </Button>
                    </div>

                    <p className="mb-4 text-[11px] text-muted-foreground">
                        {isEditing ? "Accepted: JPG, PNG, WEBP. Max size 2MB." : "Click Edit Profile to update avatar."}
                    </p>

                    {avatarError && (
                        <div className="mb-4 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                            {avatarError}
                        </div>
                    )}

                    <div className="space-y-2 border-t border-border pt-4 text-sm">
                        {[
                            { label: "Country", value: profile.country },
                            { label: "City", value: profile.city },
                            { label: "Timezone", value: profile.timezone },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between">
                                <span className="text-muted-foreground">{item.label}</span>
                                <span className="font-semibold text-foreground/90">{item.value}</span>
                            </div>
                        ))}
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">Favorite Team</span>
                            <span className="font-semibold text-primary">{profile.favoriteTeam}</span>
                        </div>
                    </div>
                </section>

                {/* Right: Profile details form */}
                <section className="rounded-xl border border-border bg-card p-5 xl:col-span-2">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">Profile Details</p>
                            <p className="text-xs text-muted-foreground">Update your basic account information</p>
                        </div>

                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onCancelEdit}
                                    className="text-xs font-bold uppercase tracking-wide"
                                >
                                    Cancel
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={onSaveProfile}
                                    className="bg-primary text-xs font-bold uppercase tracking-wide text-white hover:bg-primary/80"
                                >
                                    Save Changes
                                </Button>
                            </div>
                        ) : (
                            <Button
                                size="sm"
                                onClick={onStartEdit}
                                className="bg-primary text-xs font-bold uppercase tracking-wide text-white hover:bg-primary/80"
                            >
                                Edit Profile
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <InfoField label="Display Name" name="displayName" value={draft.displayName} onChange={onFieldChange} isEditing={isEditing} />
                        <InfoField label="Email" name="email" value={draft.email} onChange={onFieldChange} isEditing={isEditing} />
                        <InfoField label="First Name" name="firstName" value={draft.firstName} onChange={onFieldChange} isEditing={isEditing} />
                        <InfoField label="Last Name" name="lastName" value={draft.lastName} onChange={onFieldChange} isEditing={isEditing} />
                        <InfoField label="Phone" name="phone" value={draft.phone} onChange={onFieldChange} isEditing={isEditing} />
                        <InfoField label="Country" name="country" value={draft.country} onChange={onFieldChange} isEditing={isEditing} />
                        <InfoField label="City" name="city" value={draft.city} onChange={onFieldChange} isEditing={isEditing} />
                        <InfoField label="Timezone" name="timezone" value={draft.timezone} onChange={onFieldChange} isEditing={isEditing} />
                        <div className="md:col-span-2">
                            <InfoField label="Favorite Team" name="favoriteTeam" value={draft.favoriteTeam} onChange={onFieldChange} isEditing={isEditing} />
                        </div>
                        <label className="flex flex-col gap-1 md:col-span-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">Bio</span>
                            <textarea
                                name="bio"
                                value={draft.bio}
                                onChange={onFieldChange}
                                readOnly={!isEditing}
                                rows={4}
                                className={inputClass(isEditing)}
                            />
                        </label>
                    </div>
                </section>
            </div>

            <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
                <AlertDialogContent className="border-border bg-card">
                    <AlertDialogHeader>
                        <AlertDialogTitle>{confirmConfig.title}</AlertDialogTitle>
                        <AlertDialogDescription>{confirmConfig.message}</AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel className="border-border bg-surface text-foreground hover:bg-surface-dark">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={confirmConfig.onConfirm}
                            className={`text-white ${confirmConfig.variant === "danger" ? "bg-destructive hover:bg-destructive/80" : "bg-primary hover:bg-primary/80"}`}
                        >
                            {confirmConfig.confirmText}
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
