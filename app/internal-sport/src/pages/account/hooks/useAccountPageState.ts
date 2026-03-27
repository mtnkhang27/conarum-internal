import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import {
    getMyPredictionCount,
    loadMyProfileBundle,
    saveMyProfile,
} from "@/services/accountService";
import {
    composeDisplayName,
    EMPTY_PROFILE,
    toCountryCode,
    toCountryLabel,
} from "@/utils/accountProfile";
import type { UserProfile } from "@/types";

type ConfirmConfig = {
    title: string;
    message: string;
    confirmText: string;
    variant: "primary" | "danger";
    onConfirm: () => void | Promise<void>;
};

export function useAccountPageState() {
    const [profile, setProfile] = useState<UserProfile>(EMPTY_PROFILE);
    const [draft, setDraft] = useState<UserProfile>(EMPTY_PROFILE);
    const [isEditing, setIsEditing] = useState(false);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [favoriteTeamOptions, setFavoriteTeamOptions] = useState<string[]>([]);
    const [avatarError, setAvatarError] = useState("");
    const avatarInputRef = useRef<HTMLInputElement>(null);
    const [confirmOpen, setConfirmOpen] = useState(false);
    const [activeTab, setActiveTab] = useState<"account" | "predictions">("account");
    const [myPredictionCount, setMyPredictionCount] = useState<number | null>(null);
    const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig>({
        title: "",
        message: "",
        confirmText: "Confirm",
        variant: "primary",
        onConfirm: () => { },
    });

    const loadPredictionCount = useCallback(async () => {
        try {
            const totalCount = await getMyPredictionCount();
            setMyPredictionCount(totalCount);
        } catch {
            setMyPredictionCount(0);
        }
    }, []);

    useEffect(() => {
        let active = true;

        const loadProfile = async () => {
            try {
                const bundle = await loadMyProfileBundle();
                if (!active) return;
                setProfile(bundle.profile);
                setDraft(bundle.profile);
                setFavoriteTeamOptions(bundle.favoriteTeamOptions);
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

    useEffect(() => {
        void loadPredictionCount();
    }, [loadPredictionCount]);

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

    const showConfirm = (cfg: ConfirmConfig) => {
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
                    const normalizedSaved = await saveMyProfile(draft);
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

    const handleConfirmAction = () => {
        void Promise.resolve(confirmConfig.onConfirm());
    };

    const onTabChange = (nextTab: string) => {
        if (nextTab === "predictions") {
            void loadPredictionCount();
            setActiveTab("predictions");
            return;
        }
        setActiveTab("account");
    };

    const currentAvatarUrl = isEditing ? draft.avatarUrl : profile.avatarUrl;
    const currentDisplayName = composeDisplayName(
        isEditing ? draft.firstName : profile.firstName,
        isEditing ? draft.lastName : profile.lastName,
        isEditing ? draft.displayName : profile.displayName
    );
    const currentEmail = isEditing ? draft.email : profile.email;
    const currentCountryLabel = toCountryLabel(profile.country);
    const draftDisplayName = composeDisplayName(draft.firstName, draft.lastName, draft.displayName);
    const draftCountryCode = toCountryCode(draft.country);

    return {
        profile,
        draft,
        isEditing,
        isLoading,
        isSaving,
        favoriteTeamOptions,
        avatarError,
        avatarInputRef,
        confirmOpen,
        setConfirmOpen,
        activeTab,
        myPredictionCount,
        confirmConfig,
        currentAvatarUrl,
        currentDisplayName,
        currentEmail,
        currentCountryLabel,
        draftDisplayName,
        draftCountryCode,
        onFieldChange,
        onStartEdit,
        onCancelEdit,
        onSaveProfile,
        onOpenAvatarPicker,
        onAvatarSelected,
        onRemoveAvatar,
        handleConfirmAction,
        onTabChange,
    };
}
