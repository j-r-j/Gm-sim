/**
 * Utility functions
 */

export function formatDate(date: Date): string {
  return date.toISOString();
}

export function parseDate(dateString: string): Date {
  return new Date(dateString);
}
