import { useState, useEffect, useCallback } from "react";
import type { Match } from "@/types";
import { TeamCrest } from "@/pages/sport/components/TeamCrest";
import bannerHeroImg from "@/assets/banner-football-hero.png";
import "./BettingBannerPopup.css";

const SESSION_KEY = "conarum.bettingBannerDismissed";

interface BettingBannerPopupProps {
    matches: Match[];
    loading: boolean;
    onBetNow?: () => void;
}

export function BettingBannerPopup({
    matches,
    loading,
    onBetNow,
}: BettingBannerPopupProps) {
    const [visible, setVisible] = useState(false);
    const [closing, setClosing] = useState(false);

    useEffect(() => {
        if (loading) return;
        const dismissed = sessionStorage.getItem(SESSION_KEY);
        if (!dismissed) {
            const timer = setTimeout(() => setVisible(true), 500);
            return () => clearTimeout(timer);
        }
    }, [loading]);

    const dismiss = useCallback(() => {
        setClosing(true);
        sessionStorage.setItem(SESSION_KEY, "1");
        setTimeout(() => {
            setVisible(false);
            setClosing(false);
        }, 300);
    }, []);

    const handleBetNow = useCallback(() => {
        dismiss();
        setTimeout(() => onBetNow?.(), 350);
    }, [dismiss, onBetNow]);

    useEffect(() => {
        if (!visible) return;
        const handleKey = (e: KeyboardEvent) => {
            if (e.key === "Escape") dismiss();
        };
        window.addEventListener("keydown", handleKey);
        return () => window.removeEventListener("keydown", handleKey);
    }, [visible, dismiss]);

    if (!visible) return null;

    const hotMatches = matches.filter((m) => m.isHotMatch);
    const displayMatches =
        hotMatches.length > 0
            ? hotMatches.slice(0, 5)
            : matches.slice(0, 4);

    return (
        <div
            className={`betting-overlay ${closing ? "closing" : ""}`}
            onClick={(e) => {
                if (e.target === e.currentTarget) dismiss();
            }}
        >
            {/* Full-screen hero background */}
            <div className="betting-overlay__bg">
                <img
                    src={bannerHeroImg}
                    alt=""
                    className="betting-overlay__bg-img"
                    draggable={false}
                />
            </div>

            {/* Close button — fixed top-right */}
            <button
                className="betting-banner__close"
                onClick={dismiss}
                aria-label="Close"
            >
                ✕
            </button>

            {/* Content */}
            <div className="betting-banner">
                {/* Header */}
                <div className="betting-banner__header">
                    <div className="betting-banner__title">
                        🏆{" "}
                        <span className="betting-banner__title-bet">PREDICT</span>{" "}
                        <span className="betting-banner__title-now">NOW</span>
                    </div>
                    <div className="betting-banner__subtitle">
                        Predict the outcomes & climb the leaderboard!
                    </div>
                </div>

                {/* Match list */}
                <div className="betting-banner__matches">
                    {displayMatches.length > 0 ? (
                        displayMatches.map((m) => (
                            <div key={m.id} className="betting-match">
                                {m.isHotMatch && (
                                    <div className="betting-match__hot-badge">
                                        <span className="betting-match__hot-icon">🔥</span>
                                        <span className="betting-match__hot-text">HOT</span>
                                    </div>
                                )}
                                <div className="betting-match__row">
                                    <div className="betting-match__team betting-match__team--home">
                                        <span className="betting-match__name">{m.home.name}</span>
                                        <TeamCrest
                                            crest={m.home.crest}
                                            flag={m.home.flag}
                                            name={m.home.name}
                                            size="lg"
                                        />
                                    </div>
                                    <div className="betting-match__vs">VS</div>
                                    <div className="betting-match__team betting-match__team--away">
                                        <TeamCrest
                                            crest={m.away.crest}
                                            flag={m.away.flag}
                                            name={m.away.name}
                                            size="lg"
                                        />
                                        <span className="betting-match__name">{m.away.name}</span>
                                    </div>
                                </div>
                                <div className="betting-match__time">{m.timeLabel}</div>
                            </div>
                        ))
                    ) : (
                        <div className="betting-banner__empty">
                            <div className="betting-banner__empty-icon">⚽</div>
                            Matches coming soon — stay tuned!
                        </div>
                    )}
                </div>

                {/* CTA */}
                <button
                    className="betting-banner__cta"
                    onClick={handleBetNow}
                >
                    <span className="betting-banner__cta-text">
                        <span style={{ verticalAlign: 'middle', fontSize: '1.4em' }}>⚽</span>  PREDICT NOW  <span style={{ verticalAlign: 'middle', position: 'relative', top: '-5px', fontSize: '1.4em' }}>🥅</span>
                    </span>
                </button>
            </div>
        </div>
    );
}
