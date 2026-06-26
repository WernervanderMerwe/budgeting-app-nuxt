// Composable for optimistic update infrastructure
import type { Ref } from 'vue'

export interface PendingOperation {
  type: 'create' | 'update' | 'delete'
  entity: 'transaction' | 'category' | 'fixedPayment' |
          'incomeSource' | 'incomeEntry' | 'deduction' |
          'section' | 'yearlyBudget' | 'month'
  tempId?: number
  realId?: number
  timestamp: number
}

// Temp ID counter - negative numbers to distinguish from real DB IDs
let tempIdCounter = -1

export function generateTempId(): number {
  return tempIdCounter--
}

export function isTempId(id: number): boolean {
  return id < 0
}

export const useOptimisticUpdates = () => {
  const toast = useToast()

  // Pending operations tracking
  const pendingOperations = useState<Map<string, PendingOperation>>(
    'pendingOperations',
    () => new Map()
  )

  // Check if any operations are pending
  const hasPendingOperations = computed(() => pendingOperations.value.size > 0)

  // Check if specific item is syncing
  const isSyncing = (entityType: string, id: number): boolean => {
    for (const op of pendingOperations.value.values()) {
      if (op.entity === entityType && (op.tempId === id || op.realId === id)) {
        return true
      }
    }
    return false
  }

  // Add pending operation
  const addPendingOperation = (op: Omit<PendingOperation, 'timestamp'>): string => {
    const id = crypto.randomUUID()
    pendingOperations.value.set(id, { ...op, timestamp: Date.now() })
    return id
  }

  // Remove pending operation
  const removePendingOperation = (operationId: string): void => {
    pendingOperations.value.delete(operationId)
  }

  // Show error toast
  const showErrorToast = (message: string): void => {
    toast.add({
      title: 'Error',
      description: message,
      color: 'red',
      icon: 'i-heroicons-exclamation-circle',
      timeout: 5000
    })
  }

  // Show success toast (for important operations like delete)
  const showSuccessToast = (message: string): void => {
    toast.add({
      title: 'Success',
      description: message,
      color: 'green',
      icon: 'i-heroicons-check-circle',
      timeout: 3000
    })
  }

  return {
    generateTempId,
    isTempId,
    pendingOperations: readonly(pendingOperations),
    hasPendingOperations,
    isSyncing,
    addPendingOperation,
    removePendingOperation,
    showErrorToast,
    showSuccessToast
  }
}
