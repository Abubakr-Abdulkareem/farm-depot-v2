const PHONE = /(?:\+?\d[\s().-]*){9,}/;
const CONTACT_WORDS =
  /(https?:\/\/|www\.|\b[\w.-]+@[\w-]+\.\w+|whats\s*app|telegram|\bcall me\b|\btext me\b|\bdm me\b)/i;

export function containsContactInfo(text: string) {
  return PHONE.test(text) || CONTACT_WORDS.test(text);
}