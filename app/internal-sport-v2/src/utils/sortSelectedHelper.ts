/**
 * Sắp xếp mảng để đưa các items đã được selected lên đầu
 * @param items - Mảng dữ liệu cần sort
 * @param selectedIds - Set hoặc array các IDs đã được selected
 * @param getItemId - Function để lấy ID từ item
 * @returns Mảng đã được sắp xếp với selected items ở đầu
 */
export function sortSelectedFirst<T>(
  items: T[],
  selectedIds: Set<string> | string[],
  getItemId: (item: T) => string
): T[] {
  const selectedSet = selectedIds instanceof Set ? selectedIds : new Set(selectedIds);
  
  return [...items].sort((a, b) => {
    const aSelected = selectedSet.has(getItemId(a));
    const bSelected = selectedSet.has(getItemId(b));
    
    if (aSelected && !bSelected) return -1;
    if (!aSelected && bSelected) return 1;
    return 0;
  });
}
