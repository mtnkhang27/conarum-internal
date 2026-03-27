import { useTranslation } from "react-i18next";
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
import {
    Tabs,
    TabsContent,
    TabsList,
    TabsTrigger,
} from "@/components/ui/tabs";
import { LoadingOverlay } from "@/components/shared/LoadingOverlay";
import { AccountPredictionsTab } from "@/pages/account/components/AccountPredictionsTab";
import { AccountProfileTab } from "@/pages/account/components/AccountProfileTab";
import { useAccountPageState } from "@/pages/account/hooks/useAccountPageState";
import { COUNTRY_OPTIONS } from "@/utils/accountProfile";

export function AccountPage() {
    const { t } = useTranslation();
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
            <div className="mb-6">
                <h2 className="flex items-center gap-2 text-lg font-bold text-white">
                    <span className="h-6 w-1 rounded-full bg-primary" />
                    {t("account.title")}
                </h2>
                <p className="mt-1 text-xs text-muted-foreground">
                    {t("account.subtitle")}
                </p>
            </div>

            <Tabs value={activeTab} onValueChange={onTabChange} className="gap-4">
                <TabsList className="bg-card">
                    <TabsTrigger value="account">{t("account.title")}</TabsTrigger>
                    <TabsTrigger value="predictions" className="gap-2">
                        {t("nav.myPredictions")}
                        <span className="inline-flex min-w-6 items-center justify-center rounded-full bg-primary px-2 py-0.5 text-[10px] font-extrabold text-white">
                            {myPredictionCount ?? "..."}
                        </span>
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="account">
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
                </TabsContent>

                <TabsContent value="predictions">
                    <AccountPredictionsTab />
                </TabsContent>
            </Tabs>

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

