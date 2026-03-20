import { useEffect, useState } from "react";

const PHRASES = [
    "Loading",
];

const EMOJIS = ["⚽", "🏆", "🎯", "🥅", "🔥"];

export function LoadingOverlay() {
    const [dotCount, setDotCount] = useState(0);
    const [phraseIndex, setPhraseIndex] = useState(0);
    const [emojiIndex, setEmojiIndex] = useState(0);

    useEffect(() => {
        const dotTimer = setInterval(() => {
            setDotCount((prev) => (prev + 1) % 4);
        }, 400);
        return () => clearInterval(dotTimer);
    }, []);

    useEffect(() => {
        const phraseTimer = setInterval(() => {
            setPhraseIndex((prev) => (prev + 1) % PHRASES.length);
            setEmojiIndex((prev) => (prev + 1) % EMOJIS.length);
        }, 2200);
        return () => clearInterval(phraseTimer);
    }, []);

    const dots = ".".repeat(dotCount);

    return (
        <div className="flex min-h-[280px] flex-col items-center justify-center gap-4">
            {/* Bouncing emoji */}
            <div className="relative">
                <span
                    className="inline-block text-4xl animate-bounce"
                    style={{ animationDuration: "0.8s" }}
                >
                    {EMOJIS[emojiIndex]}
                </span>
                {/* Glow ring */}
                <div className="absolute inset-0 -m-3 rounded-full bg-primary/10 blur-xl animate-pulse" />
            </div>

            {/* Text */}
            <div className="flex flex-col items-center gap-1.5">
                <p className="text-sm font-bold text-primary tracking-wide">
                    {PHRASES[phraseIndex]}
                    <span className="inline-block w-6 text-left">{dots}</span>
                </p>
                {/* Animated bar */}
                <div className="h-1 w-32 overflow-hidden rounded-full bg-border">
                    <div
                        className="h-full w-1/3 rounded-full bg-gradient-to-r from-primary via-secondary to-primary"
                        style={{
                            animation: "loading-slide 1.2s ease-in-out infinite",
                        }}
                    />
                </div>
            </div>

            {/* Inline keyframes */}
            <style>{`
                @keyframes loading-slide {
                    0% { transform: translateX(-100%); }
                    100% { transform: translateX(400%); }
                }
            `}</style>
        </div>
    );
}
