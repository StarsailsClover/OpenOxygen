/**
 * Summarizer - Fix
 */
export function summarize(text, options) {
  const sentences = text.split(/[.!?。！？]+/).filter(s => s.trim().length > 10);
  const summary = sentences.slice(0, 3).join(" ");
  return { summary, keyPoints: sentences.slice(0, 5), keywords: [], readingTime: Math.ceil(text.length / 500) };
}
export async function summarizeWebpage(url, options) {
  try {
    const response = await fetch(url);
    const html = await response.text();
    const text = html.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
    return summarize(text, options);
  } catch { return null; }
}
export function translateSummary(summary, targetLanguage) {
  return summary;
}
