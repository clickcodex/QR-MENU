/**
 * Utility to parse and format customer modification logs stored in order notes.
 * Keeps customer special instructions distinct from system-logged dish modifications & cancellations.
 */

export interface ParsedOrderNotes {
  customerSpecialNote: string | null;
  isFullyCancelled: boolean;
  cancelledMessage: string;
  cancelledDishes: string | null;
  isOrderUpdated: boolean;
  removedDishes: string[];
  addedDishes: string[];
  updatedDishes: string | null;
}

export function parseOrderNotes(
  notes: string | null | undefined,
  orderStatus?: string
): ParsedOrderNotes {
  const isStatusCancelled = orderStatus === 'CANCELLED';

  if (!notes || typeof notes !== 'string') {
    return {
      customerSpecialNote: null,
      isFullyCancelled: isStatusCancelled,
      cancelledMessage: 'The order was fully canceled',
      cancelledDishes: null,
      isOrderUpdated: false,
      removedDishes: [],
      addedDishes: [],
      updatedDishes: null,
    };
  }

  const lines = notes.split('\n').map((l) => l.trim()).filter(Boolean);
  const regularLines: string[] = [];
  const removedDishes: string[] = [];
  const addedDishes: string[] = [];
  let isFullyCancelled = isStatusCancelled;
  let cancelledMessage = 'The order was fully canceled';
  let cancelledDishes: string | null = null;
  let isOrderUpdated = false;
  let updatedDishes: string | null = null;

  for (const line of lines) {
    if (line.includes('[ORDER CANCELLED]')) {
      isFullyCancelled = true;
      cancelledMessage = 'The order was fully canceled by customer';
      const firstParen = line.indexOf('(');
      const lastParen = line.lastIndexOf(')');
      if (firstParen !== -1 && lastParen > firstParen) {
        let inside = line.substring(firstParen + 1, lastParen).trim();
        inside = inside.replace(/^(?:all dishes removed:?\s*|removed dishes:?\s*)/i, '').trim();
        if (inside) {
          cancelledDishes = inside;
        }
      }
    } else if (line.includes('[ORDER UPDATED]')) {
      isOrderUpdated = true;
      // Extract removed dish: [ORDER UPDATED]: Customer removed: Butter Naan (2×). Updated dishes: Paneer Tikka (1×)
      const removedMatch = line.match(/Customer removed:\s*(.*?)(?:\.|$)/i);
      if (removedMatch && removedMatch[1]) {
        const dish = removedMatch[1].trim();
        if (!removedDishes.includes(dish)) {
          removedDishes.push(dish);
        }
      }
      // Extract added dish: [ORDER UPDATED]: Customer added: Paneer Tikka (1×). Updated dishes: ...
      const addedMatch = line.match(/Customer added:\s*(.*?)(?:\.|$)/i);
      if (addedMatch && addedMatch[1]) {
        const dish = addedMatch[1].trim();
        if (!addedDishes.includes(dish)) {
          addedDishes.push(dish);
        }
      }
      const updatedMatch = line.match(/Updated dishes:\s*(.*?)$/i);
      if (updatedMatch && updatedMatch[1]) {
        updatedDishes = updatedMatch[1].trim();
      }
    } else {
      regularLines.push(line);
    }
  }

  return {
    customerSpecialNote: regularLines.length > 0 ? regularLines.join(' • ') : null,
    isFullyCancelled,
    cancelledMessage,
    cancelledDishes,
    isOrderUpdated,
    removedDishes,
    addedDishes,
    updatedDishes,
  };
}

export function formatCancellationNote(
  existingNotes: string | null | undefined,
  dishesSummary: string
): string {
  const existing = existingNotes ? existingNotes.trim() : '';
  const log = `[ORDER CANCELLED]: The order was fully canceled by customer. All dishes removed (${dishesSummary || 'All items'}).`;
  return existing ? `${existing}\n${log}` : log;
}

export function formatModificationNote(
  existingNotes: string | null | undefined,
  removedDishDesc: string,
  updatedDishesSummary: string
): string {
  const existing = existingNotes ? existingNotes.trim() : '';
  const log = `[ORDER UPDATED]: Customer removed: ${removedDishDesc}. Updated dishes: ${updatedDishesSummary}`;
  return existing ? `${existing}\n${log}` : log;
}

export function formatAdditionNote(
  existingNotes: string | null | undefined,
  addedDishDesc: string,
  updatedDishesSummary: string
): string {
  const existing = existingNotes ? existingNotes.trim() : '';
  const log = `[ORDER UPDATED]: Customer added: ${addedDishDesc}. Updated dishes: ${updatedDishesSummary}`;
  return existing ? `${existing}\n${log}` : log;
}
