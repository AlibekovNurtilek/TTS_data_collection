import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// Градиенты для аватаров - разноцветные
const avatarGradients = [
  "from-[#0066cc] to-[#0052a3]", // синий
  "from-[#8b5cf6] to-[#7c3aed]", // фиолетовый
  "from-[#ec4899] to-[#db2777]", // розовый
  "from-[#f59e0b] to-[#d97706]", // оранжевый
  "from-[#10b981] to-[#059669]", // зеленый
  "from-[#06b6d4] to-[#0891b2]", // циан
  "from-[#ef4444] to-[#dc2626]", // красный
  "from-[#6366f1] to-[#4f46e5]", // индиго
  "from-[#14b8a6] to-[#0d9488]", // бирюзовый
  "from-[#f97316] to-[#ea580c]", // оранжево-красный
];

/**
 * Получить градиент для аватара на основе username
 * Всегда возвращает один и тот же градиент для одного username
 */
export function getAvatarGradient(username: string): string {
  if (!username) return avatarGradients[0];
  
  // Простой хэш для детерминированного выбора
  let hash = 0;
  for (let i = 0; i < username.length; i++) {
    hash = username.charCodeAt(i) + ((hash << 5) - hash);
  }
  
  const index = Math.abs(hash) % avatarGradients.length;
  return avatarGradients[index];
}
