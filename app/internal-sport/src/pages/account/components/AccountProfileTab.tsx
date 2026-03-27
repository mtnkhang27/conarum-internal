import type { ChangeEvent, RefObject } from "react";
import { User } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import type { CountryOption } from "@/utils/accountProfile";
import type { UserProfile } from "@/types";

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
    onChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
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

type AccountProfileTabProps = {
    profile: UserProfile;
    draft: UserProfile;
    isEditing: boolean;
    isSaving: boolean;
    avatarError: string;
    avatarInputRef: RefObject<HTMLInputElement | null>;
    currentAvatarUrl: string;
    currentDisplayName: string;
    currentEmail: string;
    currentCountryLabel: string;
    displayNameValue: string;
    countryValue: string;
    favoriteTeamOptions: string[];
    countryOptions: CountryOption[];
    onFieldChange: (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => void;
    onAvatarSelected: (e: ChangeEvent<HTMLInputElement>) => void;
    onOpenAvatarPicker: () => void;
    onRemoveAvatar: () => void;
    onCancelEdit: () => void;
    onSaveProfile: () => void;
    onStartEdit: () => void;
};

export function AccountProfileTab({
    profile,
    draft,
    isEditing,
    isSaving,
    avatarError,
    avatarInputRef,
    currentAvatarUrl,
    currentDisplayName,
    currentEmail,
    currentCountryLabel,
    displayNameValue,
    countryValue,
    favoriteTeamOptions,
    countryOptions,
    onFieldChange,
    onAvatarSelected,
    onOpenAvatarPicker,
    onRemoveAvatar,
    onCancelEdit,
    onSaveProfile,
    onStartEdit,
}: AccountProfileTabProps) {
    const { t } = useTranslation();

    return (
        <div className="grid grid-cols-1 gap-6 xl:grid-cols-3">
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
                        className={`text-[11px] font-bold uppercase tracking-wide ${isEditing ? "bg-primary text-white hover:bg-primary/80" : "cursor-not-allowed bg-surface text-muted-foreground"}`}
                    >
                        {t("account.profile.uploadAvatar")}
                    </Button>
                    <Button
                        size="sm"
                        variant="outline"
                        onClick={onRemoveAvatar}
                        disabled={!isEditing || isSaving}
                        className={`text-[11px] font-bold uppercase tracking-wide ${!isEditing ? "cursor-not-allowed" : ""}`}
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
                        value={displayNameValue}
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
                            value={countryValue}
                            onChange={onFieldChange}
                            disabled={!isEditing}
                            className={inputClass(isEditing)}
                        >
                            <option value="">Select country</option>
                            {countryOptions.map((country) => (
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
                                onChange={onFieldChange}
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
    );
}
