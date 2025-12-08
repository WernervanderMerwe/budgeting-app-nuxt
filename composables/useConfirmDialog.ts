interface ConfirmDialogState {
  isOpen: boolean
  title: string
  message: string
  confirmText: string
  confirmColor: 'red' | 'blue'
  onConfirm: (() => void) | null
}

const state = ref<ConfirmDialogState>({
  isOpen: false,
  title: 'Confirm Action',
  message: '',
  confirmText: 'Confirm',
  confirmColor: 'red',
  onConfirm: null,
})

export const useConfirmDialog = () => {
  const openDialog = (options: {
    title?: string
    message: string
    confirmText?: string
    confirmColor?: 'red' | 'blue'
    onConfirm: () => void
  }) => {
    state.value = {
      isOpen: true,
      title: options.title || 'Confirm Action',
      message: options.message,
      confirmText: options.confirmText || 'Confirm',
      confirmColor: options.confirmColor || 'red',
      onConfirm: options.onConfirm,
    }
  }

  const closeDialog = () => {
    state.value.isOpen = false
    state.value.onConfirm = null
  }

  const confirm = () => {
    if (state.value.onConfirm) {
      state.value.onConfirm()
    }
    closeDialog()
  }

  return {
    state: readonly(state),
    openDialog,
    closeDialog,
    confirm,
  }
}
