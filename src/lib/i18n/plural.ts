/**
 * Русская множественная форма: "one" (1 вопрос), "few" (2–4 вопроса),
 * "many" (5+ вопросов). Ключи перевода строятся как `${base}_${form}`.
 * Для узбекского форма одна — все три ключа совпадают.
 */
export type PluralForm = "one" | "few" | "many";

export function ruPlural(n: number): PluralForm {
    const mod10 = Math.abs(n) % 10;
    const mod100 = Math.abs(n) % 100;
    if (mod10 === 1 && mod100 !== 11) return "one";
    if (mod10 >= 2 && mod10 <= 4 && !(mod100 >= 12 && mod100 <= 14)) return "few";
    return "many";
}
