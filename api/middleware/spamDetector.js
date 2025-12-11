// spamFilter.js
export function isSpamSuggestion(text) {
  if (!text || typeof text !== "string") return true;

  const t = text.trim().toLowerCase();

  // too short / empty
  if (t.length < 5) return true;

  // excessive repeated characters
  if (/([a-z])\1{4,}/i.test(t)) return true;

  // contains URLs
  if (/(https?:\/\/|www\.)/.test(t)) return true;

  // common spam keywords
  const bannedWords = [
    "buy now",
    "free money",
    "casino",
    "xxx",
    "sex",
    "telegram bot",
    "crypto investment",
  ];
  if (bannedWords.some(w => t.includes(w))) return true;

  // too many emojis or gibberish
  if (t.length > 40 && /[^\w\s.,!?]/.test(t) && t.match(/[^\w\s]/g).length > 10)
    return true;

  return false;
}
