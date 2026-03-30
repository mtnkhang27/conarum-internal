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
        if (loading) return;
        const dismissed = sessionStorage.getItem(SESSION_KEY);
        if (!dismissed) {
            const timer = setTimeout(() => setVisible(true), 500);
            return () => clearTimeout(timer);
        }

        onDismiss?.();
    }, [loading, onDismiss]);

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
        <div className={`betting-overlay ${closing ? "closing" : ""}`}>
            <div className="betting-overlay__bg">
                <img
                    src={bannerHeroImg}
                    alt=""
                    className="betting-overlay__bg-img"
                    draggable={false}
                />
            </div>

            <div className="betting-banner">
                <div className="betting-banner__header">
                    <div className="betting-banner__title">
                        🏆 <span className="betting-banner__title-bet">PREDICT</span>{" "}
                        <span className="betting-banner__title-now">NOW</span>
                    </div>
                    <div className="betting-banner__subtitle">
                        Predict the outcomes &amp; climb the leaderboard!
                    </div>
                </div>

                <div className="betting-banner__matches">
                    {displayMatches.length > 0 ? (
                        displayMatches.map((match) => (
                            <div key={match.id} className="betting-match">
                                {match.isHotMatch && (
                                    <div className="betting-match__hot-badge">
                                        <span className="betting-match__hot-icon">🔥</span>
                                        <span className="betting-match__hot-text">HOT</span>
                                    </div>
                                )}
                                <div className="betting-match__row">
                                    <div className="betting-match__team betting-match__team--home">
                                        <span className="betting-match__name">{match.home.name}</span>
                                        <TeamCrest
                                            crest={match.home.crest}
                                            flag={match.home.flag}
                                            name={match.home.name}
                                            size="lg"
                                        />
                                    </div>
                                    <div className="betting-match__vs">VS</div>
                                    <div className="betting-match__team betting-match__team--away">
                                        <TeamCrest
                                            crest={match.away.crest}
                                            flag={match.away.flag}
                                            name={match.away.name}
                                            size="lg"
                                        />
                                        <span className="betting-match__name">{match.away.name}</span>
                                    </div>
                                </div>
                                <div className="betting-match__time">{match.timeLabel}</div>
                            </div>
                        ))
                    ) : (
                        <div className="betting-banner__empty">
                            <div className="betting-banner__empty-icon">⚽</div>
                            Matches coming soon - stay tuned!
                        </div>
                    )}
                </div>

                <label className="betting-banner__agreement">
                    <input
                        type="checkbox"
                        checked={agreed}
                        onChange={(event) => setAgreed(event.target.checked)}
                        className="betting-banner__checkbox"
                    />
                    <span className="betting-banner__agreement-text">
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

                <button
                    className={`betting-banner__cta ${!agreed ? "betting-banner__cta--disabled" : ""}`}
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
