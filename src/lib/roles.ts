import { UserRole } from "./firestore-schema";

/**
 * Роли и доступ к админ-панели.
 *
 * Модель: роль хранится полем users/{uid}.role в Firestore (кастомных
 * claims в Firebase Auth нет — весь RBAC на роли из профиля). Проверки в
 * правилах Firestore читают то же поле (userRole()).
 *
 * - "admin"         — супер-админ: весь функционал, все организации.
 * - "registanAdmin" — админ Registan: только Registan-данные, ограниченный
 *                     набор разделов, без глобального контента и без промо
 *                     других пользователей.
 */
type RoleLike = { role?: UserRole | string } | null | undefined;

export const isSuperAdmin = (u: RoleLike): boolean => u?.role === "admin";
export const isRegistanAdmin = (u: RoleLike): boolean => u?.role === "registanAdmin";
export const isAnyAdmin = (u: RoleLike): boolean => isSuperAdmin(u) || isRegistanAdmin(u);

/** Разделы админки, доступные Registan-админу (всё остальное — запрещено). */
export const REGISTAN_ADMIN_ROUTES: readonly string[] = [
    "/admin",
    "/admin/students",
    "/admin/teachers",
    "/admin/analytics",
    "/admin/codes",
    "/admin/rush",
    "/admin/entrance",
];

/** Может ли Registan-админ открыть данный путь админки. */
export const registanAdminCanAccess = (pathname: string): boolean =>
    REGISTAN_ADMIN_ROUTES.includes(pathname);

/** Роли, которые супер-админ может назначить из списка пользователей. */
export const ASSIGNABLE_ROLES: readonly UserRole[] = ["student", "teacher", "registanAdmin"];
