import sanitizeHtml from "sanitize-html";

export function sanitizeInput(text) {
  if (!text) return "";

  const clean = sanitizeHtml(text, {
    allowedTags: [],       // No HTML allowed
    allowedAttributes: {}  // No attributes allowed
  });

 
  return clean
    .trim()
    .slice(0, 2000)        // prevent mega spam
    .normalize("NFKC");    // protect against invisible attacks
}
