/** The four skills an IELTS-style exam is graded on. */
export const EXAM_SKILLS = ['Reading', 'Listening', 'Writing', 'Speaking'];

/** Exam sections are named by the AI ("Listening Part 1", "Reading"); group them under their skill. */
export const skillOf = (section: string): string =>
  EXAM_SKILLS.find((s) => section.toLowerCase().startsWith(s.toLowerCase())) ??
  section;
