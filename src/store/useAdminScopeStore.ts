import { create } from "zustand";

/**
 * Область данных админ-панели: вся платформа или только организация Registan.
 * Хранится в памяти — переживает клиентскую навигацию внутри админки, но
 * сбрасывается при полной перезагрузке (по требованию этого достаточно).
 */
export type AdminScope = "all" | "registan";

/** Организация-партнёр, по которой фильтруется scope "registan". */
export const REGISTAN_ORG = "registan";

interface AdminScopeStore {
    scope: AdminScope;
    setScope: (scope: AdminScope) => void;
}

export const useAdminScopeStore = create<AdminScopeStore>((set) => ({
    scope: "all",
    setScope: (scope) => set({ scope }),
}));
