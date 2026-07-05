import { create } from "zustand";
import { useAuthStore } from "./useAuthStore";
import { isRegistanAdmin } from "../lib/roles";

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

/**
 * Эффективная область данных для админ-панели. Registan-админ ВСЕГДА заперт на
 * "registan" (locked=true, переключатель не показывается и не действует);
 * супер-админ управляет областью через стор. Считается из роли, а не через
 * эффект — данные другой области не мелькают.
 */
export function useAdminScope(): { scope: AdminScope; setScope: (s: AdminScope) => void; locked: boolean } {
    const storeScope = useAdminScopeStore((s) => s.scope);
    const setScope = useAdminScopeStore((s) => s.setScope);
    const role = useAuthStore((s) => s.user?.role);
    const locked = isRegistanAdmin({ role });
    return { scope: locked ? "registan" : storeScope, setScope, locked };
}
