const energyDivisors = { uJ: 3_600_000_000, J: 3600, Wh: 1 };

/** @param {number} value @param {keyof typeof energyDivisors} unit */
export function toWh(value, unit) {
  return value / energyDivisors[unit];
}

export function energyWhPerVisit(result) {
  if (result.assertion !== "passed" || !result.workload.completedVisits || result.energy.status !== "available") {
    return null;
  }
  const readings = [...result.energy.readings].sort((left, right) => left.domain.localeCompare(right.domain));
  return readings.reduce((total, { value, unit }) => total + toWh(value, unit), 0) / result.workload.completedVisits;
}
