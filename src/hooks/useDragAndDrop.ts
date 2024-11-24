import { useState } from 'react'
import type { FileItem } from '../types/files'

interface DragState {
	isDragging: boolean
	item: FileItem | null
}

export function useDragAndDrop() {
	const [dragState, setDragState] = useState<DragState>({
		isDragging: false,
		item: null,
	})

	const handleDragStart = (item: FileItem, event: React.DragEvent) => {
		if (item.type !== 'image') return

		event.dataTransfer.setData('application/json', JSON.stringify(item))
		setDragState({ isDragging: true, item })
	}

	const handleDragEnd = () => {
		setDragState({ isDragging: false, item: null })
	}

	return {
		dragState,
		handleDragStart,
		handleDragEnd,
	}
}
