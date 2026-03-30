import { useTranslation } from "react-i18next";
import { useSearchParams } from "react-router-dom";
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
import { LoadingOverlay } from "@/components/shared/LoadingOverlay";
import { AccountPredictionsTab } from "@/pages/account/components/AccountPredictionsTab";
import { AccountProfileTab } from "@/pages/account/components/AccountProfileTab";
import { useAccountPageState } from "@/pages/account/hooks/useAccountPageState";
import { COUNTRY_OPTIONS } from "@/utils/accountProfile";

export function AccountPage() {
    const { t } = useTranslation();
    const [searchParams] = useSearchParams();
    const activeTab = searchParams.get("tab") || "account";

    const {
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
    } = useAccountPageState();

    if (isLoading) {
        return (
            <div className="p-4 pb-20 xl:pb-4">
                <LoadingOverlay />
            </div>
        );
    }

    return (
        <div className="p-4 pb-20 xl:pb-4">
            {/* Page heading */}
            <div className="mb-5">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <span className="h-6 w-1 rounded-full bg-primary" />
                    {t("account.title")}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                    {t("account.subtitle")}
                </p>
            </div>

            {/* Content — driven by ?tab= search param synced with LeftSidebar */}
            {activeTab === "predictions" ? (
                <AccountPredictionsTab />
            ) : (
                <AccountProfileTab
                    profile={profile}
                    draft={draft}
                    isEditing={isEditing}
                    isSaving={isSaving}
                    avatarError={avatarError}
                    avatarInputRef={avatarInputRef}
                    currentAvatarUrl={currentAvatarUrl}
                    currentDisplayName={currentDisplayName}
                    currentEmail={currentEmail}
                    currentCountryLabel={currentCountryLabel}
                    displayNameValue={draftDisplayName}
                    countryValue={draftCountryCode}
                    favoriteTeamOptions={favoriteTeamOptions}
                    countryOptions={COUNTRY_OPTIONS}
                    onFieldChange={onFieldChange}
                    onAvatarSelected={onAvatarSelected}
                    onOpenAvatarPicker={onOpenAvatarPicker}
                    onRemoveAvatar={onRemoveAvatar}
                    onCancelEdit={onCancelEdit}
                    onSaveProfile={onSaveProfile}
                    onStartEdit={onStartEdit}
                />
            )}

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
