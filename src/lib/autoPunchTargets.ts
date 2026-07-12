export const AUTO_PUNCH_TARGETS = {
  morning: 71,
  evening: 31,
  night: 15,
} as const;

export type AutoPunchShift = keyof typeof AUTO_PUNCH_TARGETS;

export const SHIFT_LABELS: Record<AutoPunchShift, string> = {
  morning: "1st · Morning (7 AM)",
  evening: "2nd · Evening (3 PM)",
  night: "3rd · Night (11 PM)",
};

export function isAutoPunchEnabled(employee: {
  enableAutoPunch?: boolean;
}): boolean {
  return employee.enableAutoPunch !== false;
}

export function getAutoPunchCounts(
  employees: Array<{ shift?: string; enableAutoPunch?: boolean }>,
) {
  const counts = { morning: 0, evening: 0, night: 0 };

  for (const emp of employees) {
    if (!isAutoPunchEnabled(emp)) continue;
    if (emp.shift === "morning" || emp.shift === "evening" || emp.shift === "night") {
      counts[emp.shift] += 1;
    }
  }

  return counts;
}
