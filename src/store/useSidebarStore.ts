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
            // По умолчанию — свёрнутый рельс с раскрытием по наведению.
            // false = закреплён открытым (pin через кнопку в шапке).
            isCollapsed: true,
            open: () => set({ isOpen: true }),
            close: () => set({ isOpen: false }),
            toggle: () => set((s) => ({ isOpen: !s.isOpen })),
            toggleCollapsed: () => set((s) => ({ isCollapsed: !s.isCollapsed })),
        }),
        // Новый ключ (v2): даёт всем текущим пользователям новый режим по
        // умолчанию один раз; их прежний выбор под старым ключом игнорируется.
        { name: "kulcha-sidebar-v2", partialize: (s) => ({ isCollapsed: s.isCollapsed }) }
    )
);
