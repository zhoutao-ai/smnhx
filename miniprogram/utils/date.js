function range(start, end) {
  const values = [];
  for (let value = start; value <= end; value += 1) {
    values.push(String(value));
  }
  return values;
}

function isValidDate(year, month, day) {
  const date = new Date(year, month - 1, day);
  return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day;
}

function toHourBranch(clockHour, clockMinute) {
  const total = Number(clockHour) * 60 + Number(clockMinute);
  if (total >= 23 * 60 || total < 60) return 0;
  return Math.floor((total - 60) / 120) + 1;
}

module.exports = {
  range,
  isValidDate,
  toHourBranch
};
