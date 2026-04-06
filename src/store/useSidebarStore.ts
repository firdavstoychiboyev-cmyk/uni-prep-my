import { create } from "zustand";
import { persist } from "zustand/middleware";

interface SidebarStore {
    isOpen: boolean;           // mobile drawer
    isCollapsed: boolean;      // desktop collapsed
    open: () => void;
    close: () => void;
    toggle: () => void;
    toggleCollapsed: () => void;
}

export const useSidebarStore = create<SidebarStore>()(
    persist(
        (set) => ({
            isOpen: false,
            isCollapsed: false,
            open: () => set({ isOpen: true }),
            close: () => set({ isOpen: false }),
            toggle: () => set((s) => ({ isOpen: !s.isOpen })),
            toggleCollapsed: () => set((s) => ({ isCollapsed: !s.isCollapsed })),
        }),
        { name: "sidebar-collapsed", partialize: (s) => ({ isCollapsed: s.isCollapsed }) }
    )
);
