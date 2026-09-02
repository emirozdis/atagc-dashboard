export const ESSAY_MIN_WORDS = 150;

export function countWords(value: string) {
  return value.trim().split(/\s+/).filter(Boolean).length;
}

export function isEssayQuestion(question: { id?: string; type?: string; label?: string; minWords?: number }) {
  if (typeof question.minWords === "number" && question.minWords > 0) return true;
  if ((question.type || "text") !== "textarea") return false;
  const id = (question.id || "").toLowerCase();
  const label = (question.label || "").toLowerCase();
  if (id.includes("motivation") || id.includes("letter")) return true;
  return /why (would|do) you (like|want)|motivation letter|letter of motivation/.test(label);
}

export function essayMinWords(question: { minWords?: number }) {
  return typeof question.minWords === "number" && question.minWords > 0 ? question.minWords : ESSAY_MIN_WORDS;
}

export function essayWordCountError(question: { id?: string; type?: string; label?: string; minWords?: number; required?: boolean }, value: unknown) {
  if (!isEssayQuestion(question)) return null;
  const text = typeof value === "string" ? value : "";
  const words = countWords(text);
  const minimum = essayMinWords(question);
  if (words === 0) {
    if (question.required) return `${question.label || "This answer"} must be at least ${minimum} words (currently 0).`;
    return null;
  }
  if (words >= minimum) return null;
  return `${question.label || "This answer"} must be at least ${minimum} words (currently ${words}).`;
}
