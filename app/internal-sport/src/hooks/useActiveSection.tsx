import { createContext, useContext, useState, useCallback, type ReactNode } from "react";

interface ActiveSectionContextType {
    activeSection: string;
    setActiveSection: (id: string) => void;
}

const ActiveSectionContext = createContext<ActiveSectionContextType>({
    activeSection: "",
    setActiveSection: () => {},
});

export function ActiveSectionProvider({ children }: { children: ReactNode }) {
    const [activeSection, setActiveSectionState] = useState("");

    const setActiveSection = useCallback((id: string) => {
        setActiveSectionState(id);
    }, []);

    return (
        <ActiveSectionContext.Provider value={{ activeSection, setActiveSection }}>
            {children}
        </ActiveSectionContext.Provider>
    );
}

export function useActiveSection() {
    return useContext(ActiveSectionContext);
}
