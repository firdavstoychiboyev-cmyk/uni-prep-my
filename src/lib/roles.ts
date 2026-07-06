import { UserRole } from "./firestore-schema";

/**
 * Трёхуровневая иерархия ролей.
 *
 * Роль хранится полем users/{uid}.role в Firestore (кастомных claims нет —
 * весь RBAC на роли из профиля). Проверки в правилах Firestore читают то же
 * поле (userRole()).
 *
 * - "super_admin"    — полный доступ, все организации и филиалы.
 *                      Устаревший алиас: "admin" (поддерживается до миграции).
 * - "director_admin" — read-only по всем филиалам: сравнительная аналитика.
 * - "filial_admin"   — только свой филиал (student/teacher своего filialId).
 *                      Устаревший алиас: "registanAdmin" (до миграции).
 */
type RoleLike = { role?: UserRole | string } | null | undefined;

/** Полный доступ (super_admin + устаревший "admin"). */
export const isSuperAdmin = (u: RoleLike): boolean =>
    u?.role === "super_admin" || u?.role === "admin";

/** Read-only по всем филиалам. */
export const isDirectorAdmin = (u: RoleLike): boolean =>
    u?.role === "director_admin";

/** Ограниченный доступ к своему филиалу (filial_admin + устаревший "registanAdmin"). */
export const isFilialAdmin = (u: RoleLike): boolean =>
    u?.role === "filial_admin" || u?.role === "registanAdmin";

/**
 * Устаревший алиас — оставлен, чтобы не менять все точки вызова разом.
 * Семантически эквивалентен isFilialAdmin.
 */
export const isRegistanAdmin = isFilialAdmin;

export const isAnyAdmin = (u: RoleLike): boolean =>
    isSuperAdmin(u) || isDirectorAdmin(u) || isFilialAdmin(u);

/** Разделы, доступные filial_admin (бывший registanAdmin). */
export const REGISTAN_ADMIN_ROUTES: readonly string[] = [
    "/admin",
    "/admin/students",
    "/admin/teachers",
    "/admin/analytics",
    "/admin/codes",
    "/admin/rush",
    "/admin/entrance",
];

/** Алиас с новым именем — используйте в новом коде. */
export const FILIAL_ADMIN_ROUTES = REGISTAN_ADMIN_ROUTES;

/** Разделы, доступные director_admin. */
export const DIRECTOR_ADMIN_ROUTES: readonly string[] = [
    "/admin",
    "/admin/director",
];

export const registanAdminCanAccess = (pathname: string): boolean =>
    FILIAL_ADMIN_ROUTES.includes(pathname);

export const filialAdminCanAccess = registanAdminCanAccess;

export const directorAdminCanAccess = (pathname: string): boolean =>
    DIRECTOR_ADMIN_ROUTES.includes(pathname);

/**
 * Роли, которые супер-админ может назначить из списка пользователей.
 * "super_admin" намеренно исключён — нельзя назначить через UI.
 */
export const ASSIGNABLE_ROLES: readonly UserRole[] = [
    "student",
    "teacher",
    "filial_admin",
    "director_admin",
];
