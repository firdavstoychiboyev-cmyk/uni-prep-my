import { collection, doc, getDocs, setDoc, serverTimestamp } from "firebase/firestore";
import { db } from "./firebase";

export type AchievementId =
  | "sniper_1" | "sniper_2" | "sniper_3" | "sniper_4" | "sniper_5" | "sniper_6" | "sniper_war"
  | "veteran_1" | "veteran_2" | "veteran_3" | "veteran_4" | "veteran_5" | "veteran_war"
  | "focused_1" | "focused_2" | "focused_3" | "focused_war"
  | "sharp_1" | "sharp_2" | "sharp_3" | "sharp_war"
  | "expert_1" | "expert_2" | "expert_3" | "expert_4" | "expert_5" | "expert_6" | "expert_war";

export interface AchievementDef {
  id: AchievementId;
  name: string;
  nameRu: string;
  description: string;
  descriptionRu: string;
  icon: string;
  series: "sniper" | "veteran" | "focused" | "sharp" | "expert";
  tier: number;
}

export const ACHIEVEMENTS: AchievementDef[] = [
  // SNIPER — 95%+ accuracy in N subjects (80%+ questions completed)
  { id: "sniper_1", name: "Sniper I", nameRu: "Снайпер I", description: "95%+ accuracy in 1 subject", descriptionRu: "95%+ точность в 1 предмете", icon: "🎯", series: "sniper", tier: 1 },
  { id: "sniper_2", name: "Sniper II", nameRu: "Снайпер II", description: "95%+ accuracy in 2 subjects", descriptionRu: "95%+ точность в 2 предметах", icon: "🎯", series: "sniper", tier: 2 },
  { id: "sniper_3", name: "Sniper III", nameRu: "Снайпер III", description: "95%+ accuracy in 3 subjects", descriptionRu: "95%+ точность в 3 предметах", icon: "🎯", series: "sniper", tier: 3 },
  { id: "sniper_4", name: "Sniper IV", nameRu: "Снайпер IV", description: "95%+ accuracy in 4 subjects", descriptionRu: "95%+ точность в 4 предметах", icon: "🎯", series: "sniper", tier: 4 },
  { id: "sniper_5", name: "Sniper V", nameRu: "Снайпер V", description: "95%+ accuracy in 5 subjects", descriptionRu: "95%+ точность в 5 предметах", icon: "🎯", series: "sniper", tier: 5 },
  { id: "sniper_6", name: "Sniper VI", nameRu: "Снайпер VI", description: "95%+ accuracy in 6 subjects", descriptionRu: "95%+ точность в 6 предметах", icon: "🎯", series: "sniper", tier: 6 },
  { id: "sniper_war", name: "Sniper of the War", nameRu: "Снайпер Войны", description: "95%+ accuracy in ALL 7 subjects", descriptionRu: "95%+ точность во всех 7 предметах", icon: "💀🎯", series: "sniper", tier: 7 },

  // VETERAN — daily streak
  { id: "veteran_1", name: "Veteran I", nameRu: "Ветеран I", description: "7 day streak", descriptionRu: "7 дней подряд", icon: "🪖", series: "veteran", tier: 1 },
  { id: "veteran_2", name: "Veteran II", nameRu: "Ветеран II", description: "14 day streak", descriptionRu: "14 дней подряд", icon: "🪖", series: "veteran", tier: 2 },
  { id: "veteran_3", name: "Veteran III", nameRu: "Ветеран III", description: "30 day streak", descriptionRu: "30 дней подряд", icon: "🪖", series: "veteran", tier: 3 },
  { id: "veteran_4", name: "Veteran IV", nameRu: "Ветеран IV", description: "100 day streak", descriptionRu: "100 дней подряд", icon: "🪖", series: "veteran", tier: 4 },
  { id: "veteran_5", name: "Veteran V", nameRu: "Ветеран V", description: "200 day streak", descriptionRu: "200 дней подряд", icon: "🪖", series: "veteran", tier: 5 },
  { id: "veteran_war", name: "Veteran of the War", nameRu: "Ветеран Войны", description: "365 day streak", descriptionRu: "365 дней подряд", icon: "💀🪖", series: "veteran", tier: 7 },

  // FOCUSED — total correct answers
  { id: "focused_1", name: "Focused I", nameRu: "Сфокусированный I", description: "50 correct answers total", descriptionRu: "50 правильных ответов", icon: "🔫", series: "focused", tier: 1 },
  { id: "focused_2", name: "Focused II", nameRu: "Сфокусированный II", description: "100 correct answers total", descriptionRu: "100 правильных ответов", icon: "🔫", series: "focused", tier: 2 },
  { id: "focused_3", name: "Focused III", nameRu: "Сфокусированный III", description: "200 correct answers total", descriptionRu: "200 правильных ответов", icon: "🔫", series: "focused", tier: 3 },
  { id: "focused_war", name: "Focused on War", nameRu: "Сфокусирован на Войне", description: "500 correct answers total", descriptionRu: "500 правильных ответов", icon: "💀🔫", series: "focused", tier: 7 },

  // SHARP — correct answers in a row
  { id: "sharp_1", name: "Sharp I", nameRu: "Меткий I", description: "10 correct answers in a row", descriptionRu: "10 правильных ответов подряд", icon: "⚡", series: "sharp", tier: 1 },
  { id: "sharp_2", name: "Sharp II", nameRu: "Меткий II", description: "25 correct answers in a row", descriptionRu: "25 правильных ответов подряд", icon: "⚡", series: "sharp", tier: 2 },
  { id: "sharp_3", name: "Sharp III", nameRu: "Меткий III", description: "50 correct answers in a row", descriptionRu: "50 правильных ответов подряд", icon: "⚡", series: "sharp", tier: 3 },
  { id: "sharp_war", name: "Sharp of the War", nameRu: "Меткий Войны", description: "100 correct answers in a row", descriptionRu: "100 правильных ответов подряд", icon: "💀⚡", series: "sharp", tier: 7 },

  // EXPERT — solve ALL hard questions in N subjects
  { id: "expert_1", name: "Expert I", nameRu: "Эксперт I", description: "All hard questions in 1 subject", descriptionRu: "Все сложные вопросы в 1 предмете", icon: "🧠", series: "expert", tier: 1 },
  { id: "expert_2", name: "Expert II", nameRu: "Эксперт II", description: "All hard questions in 2 subjects", descriptionRu: "Все сложные вопросы в 2 предметах", icon: "🧠", series: "expert", tier: 2 },
  { id: "expert_3", name: "Expert III", nameRu: "Эксперт III", description: "All hard questions in 3 subjects", descriptionRu: "Все сложные вопросы в 3 предметах", icon: "🧠", series: "expert", tier: 3 },
  { id: "expert_4", name: "Expert IV", nameRu: "Эксперт IV", description: "All hard questions in 4 subjects", descriptionRu: "Все сложные вопросы в 4 предметах", icon: "🧠", series: "expert", tier: 4 },
  { id: "expert_5", name: "Expert V", nameRu: "Эксперт V", description: "All hard questions in 5 subjects", descriptionRu: "Все сложные вопросы в 5 предметах", icon: "🧠", series: "expert", tier: 5 },
  { id: "expert_6", name: "Expert VI", nameRu: "Эксперт VI", description: "All hard questions in 6 subjects", descriptionRu: "Все сложные вопросы в 6 предметах", icon: "🧠", series: "expert", tier: 6 },
  { id: "expert_war", name: "Expert of the War", nameRu: "Эксперт Войны", description: "All hard questions in ALL 7 subjects", descriptionRu: "Все сложные вопросы во всех 7 предметах", icon: "💀🧠", series: "expert", tier: 7 },
];

export interface UserAchievementStats {
  subjectAccuracies: Array<{ subjectId: string; accuracy: number; completionPct: number }>;
  streakDays: number;
  totalCorrect: number;
  correctStreak: number;
  hardQuestionsCompletedBySubject: Array<{ subjectId: string; allDone: boolean }>;
}

export const checkAndAwardAchievements = async (
  userId: string,
  stats: UserAchievementStats
): Promise<AchievementDef[]> => {
  const badgesRef = collection(db, "users", userId, "badges");
  const existingSnap = await getDocs(badgesRef);
  const existing = new Set(existingSnap.docs.map(d => d.id));
  const newlyAwarded: AchievementDef[] = [];

  const award = async (achievement: AchievementDef) => {
    if (existing.has(achievement.id)) return;
    await setDoc(doc(db, "users", userId, "badges", achievement.id), {
      name: achievement.name,
      description: achievement.description,
      icon: achievement.icon,
      unlockedAt: serverTimestamp(),
      series: achievement.series,
      tier: achievement.tier,
    });
    existing.add(achievement.id);
    newlyAwarded.push(achievement);
  };

  // SNIPER — count subjects with 95%+ accuracy AND 80%+ completion
  const sniperSubjects = stats.subjectAccuracies.filter(
    s => s.accuracy >= 95 && s.completionPct >= 80
  ).length;
  const sniperIds = ["sniper_1","sniper_2","sniper_3","sniper_4","sniper_5","sniper_6","sniper_war"] as const;
  const sniperThresholds = [1,2,3,4,5,6,7];
  for (let i = 0; i < sniperIds.length; i++) {
    if (sniperSubjects >= sniperThresholds[i]) {
      await award(ACHIEVEMENTS.find(a => a.id === sniperIds[i])!);
    }
  }

  // VETERAN — streak
  const veteranThresholds = [7, 14, 30, 100, 200, 365];
  const veteranIds = ["veteran_1","veteran_2","veteran_3","veteran_4","veteran_5","veteran_war"] as const;
  for (let i = 0; i < veteranIds.length; i++) {
    if (stats.streakDays >= veteranThresholds[i]) {
      await award(ACHIEVEMENTS.find(a => a.id === veteranIds[i])!);
    }
  }

  // FOCUSED — total correct
  const focusedThresholds = [50, 100, 200, 500];
  const focusedIds = ["focused_1","focused_2","focused_3","focused_war"] as const;
  for (let i = 0; i < focusedIds.length; i++) {
    if (stats.totalCorrect >= focusedThresholds[i]) {
      await award(ACHIEVEMENTS.find(a => a.id === focusedIds[i])!);
    }
  }

  // SHARP — correct in a row
  const sharpThresholds = [10, 25, 50, 100];
  const sharpIds = ["sharp_1","sharp_2","sharp_3","sharp_war"] as const;
  for (let i = 0; i < sharpIds.length; i++) {
    if (stats.correctStreak >= sharpThresholds[i]) {
      await award(ACHIEVEMENTS.find(a => a.id === sharpIds[i])!);
    }
  }

  // EXPERT — all hard questions per subject
  const expertSubjects = stats.hardQuestionsCompletedBySubject.filter(s => s.allDone).length;
  const expertIds = ["expert_1","expert_2","expert_3","expert_4","expert_5","expert_6","expert_war"] as const;
  const expertThresholds = [1,2,3,4,5,6,7];
  for (let i = 0; i < expertIds.length; i++) {
    if (expertSubjects >= expertThresholds[i]) {
      await award(ACHIEVEMENTS.find(a => a.id === expertIds[i])!);
    }
  }

  return newlyAwarded;
};
