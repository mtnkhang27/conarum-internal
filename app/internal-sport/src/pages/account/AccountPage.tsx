import { useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { User } from "lucide-react";
import { useTranslation } from "react-i18next";
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
import { playerProfileApi, playerTeamsApi } from "@/services/playerApi";
import { LoadingOverlay } from "@/components/shared/LoadingOverlay";
import type { UserProfile } from "@/types";

const EMPTY_PROFILE: UserProfile = {
    avatarUrl: "",
    displayName: "",
    firstName: "",
    lastName: "",
    email: "",
    roles: [],
    isAdmin: false,
    phone: "",
    country: "",
    city: "",
    timezone: "",
    favoriteTeamId: null,
    favoriteTeam: "",
    bio: "",
};

function inputClass(isEditable: boolean) {
    if (isEditable) {
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
    forceReadOnly?: boolean;
}

function InfoField({ label, name, value, onChange, isEditing, forceReadOnly = false }: InfoFieldProps) {
    const isEditable = isEditing && !forceReadOnly;
    return (
        <label className="flex flex-col gap-1">
            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{label}</span>
            <input
                name={name}
                value={value}
                onChange={onChange}
                readOnly={!isEditable}
                className={inputClass(isEditable)}
            />
        </label>
    );
}

type ConfirmConfig = {
    title: string;
    message: string;
    confirmText: string;
    variant: "primary" | "danger";
    onConfirm: () => void | Promise<void>;
};

type CountryOption = {
    code: string;
    label: string;
};

const COUNTRY_CODES = [
    "AE", "AR", "AT", "AU", "BE", "BG", "BH", "BO", "BR", "BN", "CA", "CH", "CL", "CN", "CO", "CR", "CU", "CZ",
    "DE", "DK", "DO", "DZ", "EC", "EE", "EG", "ES", "FI", "FR", "GB", "GH", "GR", "GT", "HK", "HN", "HR", "HU",
    "ID", "IE", "IL", "IN", "IT", "JO", "JP", "KE", "KH", "KR", "KW", "LA", "LB", "LK", "LT", "LU", "LV", "MA",
    "MM", "MX", "MY", "NG", "NI", "NL", "NO", "NP", "NZ", "OM", "PA", "PE", "PH", "PK", "PL", "PT", "PY", "QA",
    "RO", "RS", "RU", "SA", "SE", "SG", "SI", "SK", "SV", "TH", "TN", "TR", "TW", "UA", "US", "UY", "VE", "VN",
    "ZA",
] as const;

const createRegionDisplayNames = (locale: string): Intl.DisplayNames | null => {
    try {
        return new Intl.DisplayNames([locale], { type: "region" });
    } catch {
        return null;
    }
};

const REGION_NAMES_VI = createRegionDisplayNames("vi");
const REGION_NAMES_EN = createRegionDisplayNames("en");

const COUNTRY_OPTIONS: CountryOption[] = COUNTRY_CODES
    .map((code) => ({
        code,
        label: REGION_NAMES_VI?.of(code) || REGION_NAMES_EN?.of(code) || code,
    }))
    .sort((a, b) => a.label.localeCompare(b.label, "vi"));

const COUNTRY_LABEL_BY_CODE = new Map(COUNTRY_OPTIONS.map((country) => [country.code, country.label]));

const normalizeCountryKey = (value: string): string => {
    return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
};

const COUNTRY_ALIAS_TO_CODE = (() => {
    const aliases = new Map<string, string>();
    for (const country of COUNTRY_OPTIONS) {
        aliases.set(normalizeCountryKey(country.code), country.code);
        aliases.set(normalizeCountryKey(country.label), country.code);
        const englishName = REGION_NAMES_EN?.of(country.code);
        if (englishName) {
            aliases.set(normalizeCountryKey(englishName), country.code);
        }
    }
    return aliases;
})();

const toCountryCode = (value: string): string => {
    const trimmed = value.trim();
    if (!trimmed) return "";

    const normalizedCode = trimmed.toUpperCase();
    if (COUNTRY_LABEL_BY_CODE.has(normalizedCode)) {
        return normalizedCode;
    }

    return COUNTRY_ALIAS_TO_CODE.get(normalizeCountryKey(trimmed)) || normalizedCode;
};

const toCountryLabel = (value: string): string => {
    if (!value) return "";
    return COUNTRY_LABEL_BY_CODE.get(toCountryCode(value)) || value;
};

const composeDisplayName = (firstName: string, lastName: string, fallback = ""): string => {
    const parts = [firstName, lastName]
        .map((value) => value.trim())
        .filter((value) => value.length > 0);
    if (parts.length > 0) return parts.join(" ").slice(0, 100);
    return fallback.trim().slice(0, 100);
};

export function AccountPage() {
    const { t } = useTranslation();
    const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
    const [draft, setDraft] = useState<UserProfile>(EMPTY_PROFILE);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [favoriteTeamOptions, setFavoriteTeamOptions] = useState<string[]>([]);
    const [avatarError, setAvatarError] = useState("");
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig>({
        title: "",
        message: "",
        confirmText: "Confirm",
        variant: "primary",
        onConfirm: () => { },
    });

    useEffect(() => {
        let active = true;

        const loadProfile = async () => {
            try {
                const [loaded, teams] = await Promise.all([
                    playerProfileApi.getMyProfile(),
                    playerTeamsApi.getAll().catch(() => []),
                ]);
                if (!active) return;
                const normalizedProfile: UserProfile = {
                    ...loaded,
                    country: toCountryCode(loaded.country || ""),
                    displayName: composeDisplayName(loaded.firstName || "", loaded.lastName || "", loaded.displayName || ""),
                };
                setProfile(normalizedProfile);
                setDraft(normalizedProfile);
                const teamNames = [...new Set(teams.map((team) => team.name).filter(Boolean))].sort((a, b) =>
                    a.localeCompare(b)
                );
                setFavoriteTeamOptions(teamNames);
            } catch (error) {
                if (!active) return;
                const message = error instanceof Error ? error.message : "Failed to load account profile.";
                toast.error("Cannot load profile", { description: message });
            } finally {
                if (active) setIsLoading(false);
            }
        };

        void loadProfile();
        return () => {
            active = false;
        };
    }, []);

    const onFieldChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
        const { name, value } = e.target;
        setDraft((prev) => {
            const next: UserProfile = { ...prev, [name]: value };
            if (name === "firstName" || name === "lastName") {
                const nextFirstName = name === "firstName" ? value : prev.firstName;
                const nextLastName = name === "lastName" ? value : prev.lastName;
                next.displayName = composeDisplayName(nextFirstName, nextLastName, prev.displayName);
            }
            return next;
        });
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
            onConfirm: async () => {
                setIsSaving(true);
                setConfirmOpen(false);
                try {
                    const payload: UserProfile = {
                        ...draft,
                        country: toCountryCode(draft.country || ""),
                        displayName: composeDisplayName(draft.firstName, draft.lastName, draft.displayName),
                    };
                    const saved = await playerProfileApi.updateMyProfile(payload);
                    const normalizedSaved: UserProfile = {
                        ...saved,
                        country: toCountryCode(saved.country || ""),
                        displayName: composeDisplayName(saved.firstName || "", saved.lastName || "", saved.displayName || ""),
                    };
                    setProfile(normalizedSaved);
                    setDraft(normalizedSaved);
                    setAvatarError("");
                    setIsEditing(false);
                    toast.success("Profile updated", { description: "Your account information has been saved." });
                } catch (error) {
                    const message = error instanceof Error ? error.message : "Failed to update profile.";
                    toast.error("Save failed", { description: message });
                } finally {
                    setIsSaving(false);
                }
            },
        });
    };

    const onOpenAvatarPicker = () => {
        if (!isEditing) {
            toast.warning("Edit mode required", { description: "Click Edit Profile before uploading an avatar." });
            return;
        }
        if (isSaving) return;
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

        if (file.size > 10 * 1024 * 1024) {
            setAvatarError("Avatar must be smaller than 10MB.");
            toast.error("File too large", { description: "Avatar image must be smaller than 10MB." });
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
        if (isSaving) return;
        if (!draft.avatarUrl) {
            toast.info("No avatar to remove", { description: "Default avatar is already in use." });
            return;
        }
        setDraft((prev) => ({ ...prev, avatarUrl: "" }));
        setAvatarError("");
        toast.info("Avatar removed", { description: "Avatar has been reset to default icon." });
    };

    const currentAvatarUrl = isEditing ? draft.avatarUrl : profile.avatarUrl;
    const currentDisplayName = composeDisplayName(
        isEditing ? draft.firstName : profile.firstName,
        isEditing ? draft.lastName : profile.lastName,
        isEditing ? draft.displayName : profile.displayName
    );
    const currentEmail = isEditing ? draft.email : profile.email;
    const currentCountryLabel = toCountryLabel(profile.country);
    const handleConfirmAction = () => {
        void Promise.resolve(confirmConfig.onConfirm());
    };

    if (isLoading) {
        return (
            <div className="p-4 pb-20 xl:pb-4">
                <LoadingOverlay />
            </div>
        );
    }

    return (
        <div className="p-4 pb-20 xl:pb-4">
            <div className="mb-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <span className="h-6 w-1 rounded-full bg-primary" />
                    {t("account.title")}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                    {t("account.subtitle")}
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
                            <p className="text-lg font-extrabold text-white">{currentDisplayName}</p>
                            <p className="text-sm text-muted-foreground">{currentEmail}</p>
                        </div>
                    </div>

                    <div className="mb-4 flex flex-wrap items-center gap-2">
                        <input ref={avatarInputRef} type="file" accept="image/*" onChange={onAvatarSelected} className="hidden" />
                        <Button
                            size="sm"
                            onClick={onOpenAvatarPicker}
                            disabled={!isEditing || isSaving}
                            className={`text-[11px] font-bold uppercase tracking-wide ${isEditing ? "bg-primary text-white hover:bg-primary/80" : "cursor-not-allowed bg-surface text-muted-foreground"
                                }`}
                        >
                            {t("account.profile.uploadAvatar")}
                        </Button>
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={onRemoveAvatar}
                            disabled={!isEditing || isSaving}
                            className={`text-[11px] font-bold uppercase tracking-wide ${!isEditing ? "cursor-not-allowed" : ""
                                }`}
                        >
                            {t("account.profile.remove")}
                        </Button>
                    </div>

                    <p className="mb-4 text-[11px] text-muted-foreground">
                        {isEditing ? "Accepted: JPG, PNG, WEBP. Max size 10MB." : "Click Edit Profile to update avatar."}
                    </p>

                    {avatarError && (
                        <div className="mb-4 rounded border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs text-destructive">
                            {avatarError}
                        </div>
                    )}

                    <div className="space-y-2 border-t border-border pt-4 text-sm">
                        {[ 
                            { label: t("account.profile.country"), value: currentCountryLabel },
                            { label: t("account.profile.city"), value: profile.city },
                            { label: t("account.profile.timezone"), value: profile.timezone },
                        ].map((item) => (
                            <div key={item.label} className="flex items-center justify-between">
                                <span className="text-muted-foreground">{item.label}</span>
                                <span className="font-semibold text-foreground/90">{item.value}</span>
                            </div>
                        ))}
                        <div className="flex items-center justify-between">
                            <span className="text-muted-foreground">{t("account.profile.favoriteTeam")}</span>
                            <span className="font-semibold text-primary">{profile.favoriteTeam}</span>
                        </div>
                    </div>
                </section>

                {/* Right: Profile details form */}
                <section className="rounded-xl border border-border bg-card p-5 xl:col-span-2">
                    <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
                        <div>
                            <p className="text-sm font-bold uppercase tracking-widest text-muted-foreground">{t("account.profile.title")}</p>
                            <p className="text-xs text-muted-foreground">{t("account.subtitle")}</p>
                        </div>

                        {isEditing ? (
                            <div className="flex items-center gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={onCancelEdit}
                                    disabled={isSaving}
                                    className="text-xs font-bold uppercase tracking-wide"
                                >
                                    {t("common.cancel")}
                                </Button>
                                <Button
                                    size="sm"
                                    onClick={onSaveProfile}
                                    disabled={isSaving}
                                    className="bg-primary text-xs font-bold uppercase tracking-wide text-white hover:bg-primary/80"
                                >
                                    {isSaving ? t("common.saving") : t("account.profile.saveChanges")}
                                </Button>
                            </div>
                        ) : (
                                <Button
                                    size="sm"
                                    onClick={onStartEdit}
                                    disabled={isSaving}
                                    className="bg-primary text-xs font-bold uppercase tracking-wide text-white hover:bg-primary/80"
                                >
                                    {t("account.profile.editProfile")}
                            </Button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                        <InfoField
                            label={t("account.profile.displayName")}
                            name="displayName"
                            value={composeDisplayName(draft.firstName, draft.lastName, draft.displayName)}
                            onChange={onFieldChange}
                            isEditing={isEditing}
                            forceReadOnly
                        />
                        <InfoField label={t("account.profile.email")} name="email" value={draft.email} onChange={onFieldChange} isEditing={isEditing} forceReadOnly />
                        <InfoField label={t("account.profile.firstName")} name="firstName" value={draft.firstName} onChange={onFieldChange} isEditing={isEditing} />
                        <InfoField label={t("account.profile.lastName")} name="lastName" value={draft.lastName} onChange={onFieldChange} isEditing={isEditing} />
                        <InfoField label={t("account.profile.phone")} name="phone" value={draft.phone} onChange={onFieldChange} isEditing={isEditing} />
                        <label className="flex flex-col gap-1">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("account.profile.country")}</span>
                            <select
                                name="country"
                                value={toCountryCode(draft.country)}
                                onChange={onFieldChange}
                                disabled={!isEditing}
                                className={inputClass(isEditing)}
                            >
                                <option value="">Select country</option>
                                {COUNTRY_OPTIONS.map((country) => (
                                    <option key={country.code} value={country.code}>
                                        {country.label}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <InfoField label={t("account.profile.city")} name="city" value={draft.city} onChange={onFieldChange} isEditing={isEditing} />
                        <InfoField label={t("account.profile.timezone")} name="timezone" value={draft.timezone} onChange={onFieldChange} isEditing={isEditing} />
                        <div className="md:col-span-2">
                            <label className="flex flex-col gap-1">
                                <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("account.profile.favoriteTeam")}</span>
                                <input
                                    name="favoriteTeam"
                                    value={draft.favoriteTeam}
                                    onChange={(e) => onFieldChange(e)}
                                    readOnly={!isEditing}
                                    list="favorite-team-options"
                                    className={inputClass(isEditing)}
                                />
                                <datalist id="favorite-team-options">
                                    {favoriteTeamOptions.map((teamName) => (
                                        <option key={teamName} value={teamName} />
                                    ))}
                                </datalist>
                            </label>
                        </div>
                        <label className="flex flex-col gap-1 md:col-span-2">
                            <span className="text-[11px] font-bold uppercase tracking-wider text-muted-foreground">{t("account.profile.bio")}</span>
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
                            {t("common.cancel")}
                        </AlertDialogCancel>
                        <AlertDialogAction
                            onClick={handleConfirmAction}
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

