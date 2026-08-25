import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import { format, formatDistanceToNow, parseISO, isValid } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: Date | string | null): string {
  if (!date) return "-";
  const parsed = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(parsed)) return "Invalid date";
  return format(parsed, "MMM d, yyyy");
}

export function formatDateTime(date: Date | string | null): string {
  if (!date) return "-";
  const parsed = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(parsed)) return "Invalid date";
  return format(parsed, "MMM d, yyyy h:mm a");
}

export function timeAgo(date: Date | string | null): string {
  if (!date) return "-";
  const parsed = typeof date === "string" ? parseISO(date) : date;
  if (!isValid(parsed)) return "Invalid date";
  return formatDistanceToNow(parsed, { addSuffix: true });
}

export function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/\s+/g, "-")
    .replace(/[^\w-]+/g, "")
    .replace(/--+/g, "-")
    .trim();
}

export function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return text.slice(0, maxLength) + "...";
}

export function formatScore(score: number | null | undefined): string {
  if (score === null || score === undefined) return "-";
  return score.toFixed(2);
}

export function scoreToGrade(
  score: number,
  max: number = 100
): { label: string; color: string } {
  const pct = (score / max) * 100;
  if (pct >= 90) return { label: "Excellent", color: "green" };
  if (pct >= 75) return { label: "Good", color: "blue" };
  if (pct >= 60) return { label: "Satisfactory", color: "yellow" };
  if (pct >= 45) return { label: "Needs Improvement", color: "orange" };
  return { label: "Unsatisfactory", color: "red" };
}

export function getRiskColor(
  risk: string
): "green" | "yellow" | "orange" | "red" {
  switch (risk) {
    case "LOW":
      return "green";
    case "MEDIUM":
      return "yellow";
    case "HIGH":
      return "orange";
    case "CRITICAL":
      return "red";
    default:
      return "green";
  }
}

export function formatCurrency(
  amount: number | null | undefined,
  currency = "USD"
): string {
  if (amount === null || amount === undefined) return "-";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
  }).format(amount);
}

export function formatFileSize(bytes: number): string {
  const units = ["B", "KB", "MB", "GB"];
  let size = bytes;
  let unitIndex = 0;
  while (size >= 1024 && unitIndex < units.length - 1) {
    size /= 1024;
    unitIndex++;
  }
  return `${size.toFixed(1)} ${units[unitIndex]}`;
}

export function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export function daysUntil(date: Date | string): number {
  const target = typeof date === "string" ? parseISO(date) : date;
  const now = new Date();
  const diff = target.getTime() - now.getTime();
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

export function generateContractNumber(
  departmentCode: string,
  year: number
): string {
  const random = Math.floor(Math.random() * 10000)
    .toString()
    .padStart(4, "0");
  return `${departmentCode.toUpperCase()}-${year}-${random}`;
}

export function sanitizeInput(input: string): string {
  return input
    .replace(/[<>]/g, "")
    .replace(/javascript:/gi, "")
    .replace(/on\w+=/gi, "")
    .trim();
}
