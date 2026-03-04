interface TeamCrestProps {
    crest?: string;
    flag?: string;
    name?: string;
    className?: string;
    size?: "sm" | "md" | "lg" | "xl";
}

const SIZES = {
    sm: "h-4 w-4",
    md: "h-5 w-5",
    lg: "h-8 w-8",
    xl: "h-12 w-16",
};

/**
 * Renders a team crest image if available, with fallback to flag-icons CSS.
 */
export function TeamCrest({ crest, flag, name, className = "", size = "md" }: TeamCrestProps) {
    const sizeClass = SIZES[size];

    if (crest) {
        return (
            <img
                src={crest}
                alt={name || ""}
                className={`${sizeClass} object-contain ${className}`}
            />
        );
    }

    if (flag) {
        return <span className={`fi fi-${flag} rounded-sm ${className}`} />;
    }

    return null;
}
