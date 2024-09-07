export default function symmetricDifference<T>(
  setA: Set<T>,
  setB: Set<T>,
): Set<T> {
  const difference = new Set(setA);
  for (const elem of setB) {
    if (difference.has(elem)) {
      difference.delete(elem);
    } else {
      difference.add(elem);
    }
  }
  return difference;
}
