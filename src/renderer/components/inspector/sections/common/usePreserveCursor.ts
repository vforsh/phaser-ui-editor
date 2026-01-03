import { useEffect, useRef } from 'react'

/**
 * Hook to preserve cursor position in controlled inputs.
 * In controlled inputs, React re-renders can reset cursor position,
 * this hook ensures the cursor stays where the user last placed it.
 */
export function usePreserveCursor() {
	// Store the requestAnimationFrame ID in a ref so it persists between renders
	// and can be accessed in the cleanup function
	const rafIdRef = useRef<number | undefined>(undefined)

	// Set up cleanup to prevent memory leaks
	// This effect runs once when the component mounts and cleans up on unmount
	useEffect(() => {
		return () => {
			// Cancel any pending animation frame when the component unmounts
			// or when the effect needs cleanup
			if (rafIdRef.current !== undefined) {
				cancelAnimationFrame(rafIdRef.current)
			}
		}
	}, [])

	// Return a handler function that will be called on each input change
	return (e: React.ChangeEvent<HTMLTextAreaElement | HTMLInputElement>, setValue: (value: string) => void) => {
		// Get the current input element and its values
		const target = e.currentTarget
		const value = target.value
		// Store the current cursor position before React updates the input
		const cursorPosition = target.selectionStart

		// Update the input value through React's controlled input mechanism
		setValue(value)

		// Schedule cursor position restoration for after React's re-render
		// Using requestAnimationFrame ensures this runs after React has updated the DOM
		rafIdRef.current = requestAnimationFrame(() => {
			// Restore the cursor to where it was before the re-render
			target.setSelectionRange(cursorPosition, cursorPosition)
		})
	}
}
