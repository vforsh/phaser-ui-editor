import { KeyboardEvent, useCallback, useState } from 'react'

interface UseKeyboardNavigationProps<T> {
	items: T[]
	onSelect: (item: T) => void
}

export function useKeyboardNavigation<T>({ items, onSelect }: UseKeyboardNavigationProps<T>) {
	const [focusedIndex, setFocusedIndex] = useState(0)

	const handleKeyDown = useCallback(
		(e: KeyboardEvent) => {
			switch (e.key) {
				case 'ArrowDown':
					e.preventDefault()
					setFocusedIndex((prev) => (prev + 1) % items.length)
					break
				case 'ArrowUp':
					e.preventDefault()
					setFocusedIndex((prev) => (prev - 1 + items.length) % items.length)
					break
				case 'Enter':
					e.preventDefault()
					if (items[focusedIndex]) {
						onSelect(items[focusedIndex])
					}
					break
			}
		},
		[items, focusedIndex, onSelect]
	)

	const getItemProps = useCallback(
		(index: number) => ({
			onKeyDown: handleKeyDown,
			tabIndex: focusedIndex === index ? 0 : -1,
		}),
		[handleKeyDown, focusedIndex]
	)

	return {
		focusedIndex,
		getItemProps,
	}
}
