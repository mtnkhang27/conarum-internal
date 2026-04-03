import { useState, useEffect, useCallback } from 'react';

interface UseValueHelpSelectionOptions<T> {
  open: boolean;
  selectedIds: string[];
  selectedItems?: T[];
  allItems: T[];
  getItemId: (item: T) => string;
}

export function useValueHelpSelection<T>({
  open,
  selectedIds,
  selectedItems: initialSelectedItems = [],
  allItems,
  getItemId,
}: UseValueHelpSelectionOptions<T>) {
  const [selectedRowIds, setSelectedRowIds] = useState<Set<string>>(new Set(selectedIds));
  const [selectedItems, setSelectedItems] = useState<T[]>(initialSelectedItems);

  // Initialize selection when dialog opens
  // Sync from initialSelectedItems (priority) or selectedIds
  useEffect(() => {
    if (open) {
      // If initialSelectedItems exists, sync from it (has full data)
      if (initialSelectedItems.length > 0) {
        const idsFromItems = initialSelectedItems.map(item => getItemId(item));
        setSelectedRowIds(new Set(idsFromItems));
        setSelectedItems(initialSelectedItems);
      } else {
        // Fallback: sync from selectedIds (only has IDs)
        setSelectedRowIds(new Set(selectedIds));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]); // Only run when dialog opens/closes

  // Handle selection change from checkbox
  const handleSelectionChange = useCallback((newSelectedIds: Set<string>) => {
    setSelectedRowIds(newSelectedIds);
    
    // Add newly selected items
    const newlySelected = allItems.filter(item => 
      newSelectedIds.has(getItemId(item)) && !selectedItems.some(si => getItemId(si) === getItemId(item))
    );
    if (newlySelected.length > 0) {
      setSelectedItems(prev => [...prev, ...newlySelected]);
    }
    
    // Remove deselected items
    setSelectedItems(prev => prev.filter(item => newSelectedIds.has(getItemId(item))));
  }, [allItems, selectedItems, getItemId]);

  // Handle row click
  const handleRowClick = useCallback((row: T) => {
    const id = getItemId(row);
    const newSelected = new Set(selectedRowIds);
    
    if (newSelected.has(id)) {
      newSelected.delete(id);
      setSelectedItems(prev => prev.filter(item => getItemId(item) !== id));
    } else {
      newSelected.add(id);
      if (!selectedItems.some(s => getItemId(s) === id)) {
        setSelectedItems(prev => [...prev, row]);
      }
    }
    setSelectedRowIds(newSelected);
  }, [selectedRowIds, selectedItems, getItemId]);

  // Handle remove item from dock
  const handleRemoveItem = useCallback((itemId: string) => {
    const newSelected = new Set(selectedRowIds);
    newSelected.delete(itemId);
    setSelectedRowIds(newSelected);
    setSelectedItems(prev => prev.filter(item => getItemId(item) !== itemId));
  }, [selectedRowIds, getItemId]);

  // Handle clear all
  const handleClearAll = useCallback(() => {
    setSelectedRowIds(new Set());
    setSelectedItems([]);
  }, []);

  // Get final selected items (combine dock + table)
  const getFinalSelection = useCallback(() => {
    const tableSelected = allItems.filter(item => selectedRowIds.has(getItemId(item)));
    const allSelectedMap = new Map<string, T>();
    
    selectedItems.forEach(item => allSelectedMap.set(getItemId(item), item));
    tableSelected.forEach(item => allSelectedMap.set(getItemId(item), item));
    
    return Array.from(allSelectedMap.values());
  }, [allItems, selectedRowIds, selectedItems, getItemId]);

  return {
    selectedRowIds,
    selectedItems,
    handleSelectionChange,
    handleRowClick,
    handleRemoveItem,
    handleClearAll,
    getFinalSelection,
  };
}
