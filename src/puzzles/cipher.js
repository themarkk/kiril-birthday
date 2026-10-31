// Statue di Nicole: quattro piedistalli, l'ordine giusto è uno solo.

export function checkStatues(order, solution) {
  return order.length === solution.length && order.every((s, i) => s === solution[i]);
}
