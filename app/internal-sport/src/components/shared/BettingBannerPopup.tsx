import { useState, useEffect, useCallback } from "react";
import type { Match } from "@/types";
import { TeamCrest } from "@/pages/sport/components/TeamCrest";
import bannerHeroImg from "@/assets/banner-football-hero.png";
import "./BettingBannerPopup.css";

const SESSION_KEY = "conarum.bettingBannerDismissed";

const TERMS_CONTENT = [
    "Please note that this website is purely for entertainment purposes and does not serve any gambling or any form of activity that violates the laws of the Socialist Republic of Vietnam.",
    "This website also does not support or facilitate any activity that violates SAP terms and policies or any applicable international laws and regulations.",
    "This website is for making predictions only, where players may receive prizes without being required to deposit, pay any fee, or wager any money. Players can only receive rewards and do not lose anything - there is no monetary or asset loss involved.",
    "Any prizes or rewards made available on this website are self-funded and voluntarily contributed by individuals supporting the prize pool, and such contributions must remain within lawful, reasonable, and permitted limits.",
    "This website is operated on a non-profit basis and does not generate profit from, charge fees to, or collect commissions or any other payments from any user.",
    "We reiterate that this is solely an entertainment website designed for prediction purposes, allowing players to showcase their prediction skills. Thank you for your cooperation.",
];

interface BettingBannerPopupProps {
    matches: Match[];
    loading: boolean;
    onBetNow?: () => void;
    onDismiss?: () => void;
}

export function BettingBannerPopup({
    matches,
    loading,
    onBetNow,
    onDismiss,
}: BettingBannerPopupProps) {
    const [visible, setVisible] = useState(false);
    const [closing, setClosing] = useState(false);
    const [agreed, setAgreed] = useState(false);
    const [showTerms, setShowTerms] = useState(false);

    useEffect(() => {
        const dismissed = sessionStorage.getItem(SESSION_KEY);
        if (!dismissed) {
            const timer = setTimeout(() => setVisible(true), 300);
            return () => clearTimeout(timer);
        }

        onDismiss?.();
    }, [onDismiss]);

    const dismiss = useCallback(() => {
        setClosing(true);
        sessionStorage.setItem(SESSION_KEY, "1");
        setTimeout(() => {
            setVisible(false);
            setClosing(false);
            onDismiss?.();
        }, 300);
    }, [onDismiss]);

    const handleBetNow = useCallback(() => {
        if (!agreed) return;
        dismiss();
        setTimeout(() => onBetNow?.(), 350);
    }, [agreed, dismiss, onBetNow]);

    useEffect(() => {
        if (!visible) return;

        const handleKey = (event: KeyboardEvent) => {
            if (event.key === "Escape" && showTerms) {
                setShowTerms(false);
            }
        };

        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [visible, showTerms]);

    if (!visible) return null;

    const hotMatches = matches.filter((match) => match.isHotMatch);
    const displayMatches =
        hotMatches.length > 0
            ? hotMatches.slice(0, 5)
            : matches.slice(0, 4);

    return (
        <div className={`betting-overlay !flex-col !items-center !justify-start !overflow-y-auto !p-3 sm:!justify-center sm:!p-4 ${closing ? "closing" : ""}`}
            style={{ WebkitOverflowScrolling: "touch" }}
        >
            <div className="betting-overlay__bg">
                <img
                    src={bannerHeroImg}
                    alt=""
                    className="betting-overlay__bg-img"
                    draggable={false}
                />
            </div>

            <div className="betting-banner my-auto w-full overflow-y-auto pb-3 sm:overflow-visible sm:pb-0"
                style={{ WebkitOverflowScrolling: "touch" }}
            >
                {/* Header */}
                <div className="betting-banner__header !mb-4 sm:!mb-7">
                    <div className="betting-banner__title !text-[26px] !tracking-[1px] sm:!text-[44px] sm:!tracking-[3px]">
                        🏆 <span className="betting-banner__title-bet">PREDICT</span>{" "}
                        <span className="betting-banner__title-now">NOW</span>
                    </div>
                    <div className="betting-banner__subtitle !mt-1 !text-[10px] sm:!mt-2 sm:!text-[13px]">
                        Predict the outcomes &amp; climb the leaderboard!
                    </div>
                </div>

                {/* Matches */}
                <div className="betting-banner__matches !mb-3 !gap-1.5 sm:!mb-5 sm:!gap-2.5">
                    {loading ? (
                        <div className="betting-banner__empty !py-3 sm:!py-5">
                            <div className="betting-banner__loading-spinner" />
                            Loading hot matches…
                        </div>
                    ) : displayMatches.length > 0 ? (
                        displayMatches.map((match) => (
                            <div key={match.id} className="betting-match !rounded-xl !px-2.5 !py-2 sm:!rounded-[14px] sm:!px-4 sm:!py-3.5">
                                {match.isHotMatch && (
                                    <div className="betting-match__hot-badge">
                                        <span className="betting-match__hot-icon">🔥</span>
                                        <span className="betting-match__hot-text">HOT</span>
                                    </div>
                                )}
                                <div className="betting-match__row !gap-2 sm:!gap-3">
                                    <div className="betting-match__team betting-match__team--home">
                                        <span className="betting-match__name !max-w-[80px] !text-[10px] sm:!max-w-[120px] sm:!text-[12px]">{match.home.name}</span>
                                        <TeamCrest
                                            crest={match.home.crest}
                                            flag={match.home.flag}
                                            name={match.home.name}
                                            size="lg"
                                        />
                                    </div>
                                    <div className="betting-match__vs !text-[9px] sm:!text-[11px]">VS</div>
                                    <div className="betting-match__team betting-match__team--away">
                                        <TeamCrest
                                            crest={match.away.crest}
                                            flag={match.away.flag}
                                            name={match.away.name}
                                            size="lg"
                                        />
                                        <span className="betting-match__name !max-w-[80px] !text-[10px] sm:!max-w-[120px] sm:!text-[12px]">{match.away.name}</span>
                                    </div>
                                </div>
                                <div className="betting-match__time !mt-0.5 !text-[9px] sm:!mt-1 sm:!text-[10px]">{match.timeLabel}</div>
                            </div>
                        ))
                    ) : (
                        <div className="betting-banner__empty">
                            <div className="betting-banner__empty-icon">⚽</div>
                            Matches coming soon - stay tuned!
                        </div>
                    )}
                </div>

                {/* Agreement */}
                <label className="betting-banner__agreement !mb-3 !gap-2 !rounded-lg !p-2 sm:!mb-4 sm:!gap-2.5 sm:!rounded-xl sm:!p-3">
                    <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(event) => setAgreed(event.target.checked)}
                        className="betting-banner__checkbox"
                    />
                    <span className="betting-banner__agreement-text !text-[10.5px] !leading-snug sm:!text-[12.5px]">
                        I'm over 18 and agree to this site's{" "}
                        <button
                            type="button"
                            className="betting-banner__terms-link"
                            onClick={(event) => {
                                event.preventDefault();
                                event.stopPropagation();
                                setShowTerms(true);
                            }}
                        >
                            Terms and Service
                        </button>
                    </span>
                </label>

                {/* CTA */}
                <button
                    className={`betting-banner__cta !rounded-xl !px-4 !py-3 !text-[14px] !tracking-[2px] sm:!rounded-2xl sm:!px-7 sm:!py-4.5 sm:!text-[20px] sm:!tracking-[3px] ${!agreed ? "betting-banner__cta--disabled" : ""}`}
                    onClick={handleBetNow}
                    disabled={!agreed}
                >
                    <span className="betting-banner__cta-text">
                        <span style={{ verticalAlign: "middle", fontSize: "1.4em" }}>⚽</span> PREDICT NOW{" "}
                        <span
                            style={{
                                verticalAlign: "middle",
                                position: "relative",
                                top: "-5px",
                                fontSize: "1.4em",
                            }}
                        >
                            🥅
                        </span>
                    </span>
                </button>
            </div>

            {showTerms && (
                <div
                    className="betting-terms-overlay"
                    onClick={(event) => {
                        if (event.target === event.currentTarget) {
                            setShowTerms(false);
                        }
                    }}
                >
                    <div className="betting-terms-popup">
                        <div className="betting-terms-popup__header">
                            <h3 className="betting-terms-popup__title">📋 Terms and Service</h3>
                            <button
                                className="betting-terms-popup__close"
                                onClick={() => setShowTerms(false)}
                                aria-label="Close terms"
                            >
                                ✕
                            </button>
                        </div>
                        <div className="betting-terms-popup__body">
                            {TERMS_CONTENT.map((paragraph) => (
                                <p key={paragraph}>{paragraph}</p>
                            ))}
                        </div>
                        <button
                            className="betting-terms-popup__ok"
                            onClick={() => setShowTerms(false)}
                        >
                            I Understand
                        </button>
                    </div>
                </div>
            )}
        </div>
    );
}
