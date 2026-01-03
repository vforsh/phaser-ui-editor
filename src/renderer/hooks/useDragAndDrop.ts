import { useState } from 'react'
import { ILogObj, Logger } from 'tslog'
import { isDraggableAsset, type AssetTreeItemData } from '../types/assets'
import { Snapshot } from 'valtio'

interface DragState {
	isDragging: boolean
	item: Snapshot<AssetTreeItemData> | null
}

const MAX_PREVIEW_DIMENSION = 512

function calculatePreviewDimensions(width: number, height: number) {
	const aspectRatio = width / height

	if (width > height) {
		const newWidth = Math.min(width, MAX_PREVIEW_DIMENSION)
		const newHeight = Math.round(newWidth / aspectRatio)
		return { width: newWidth, height: newHeight }
	} else {
		const newHeight = Math.min(height, MAX_PREVIEW_DIMENSION)
		const newWidth = Math.round(newHeight * aspectRatio)
		return { width: newWidth, height: newHeight }
	}
}

export interface DragAndDropProps {
	logger: Logger<ILogObj>
}

export function useDragAndDrop({ logger }: DragAndDropProps) {
	const [dragState, setDragState] = useState<DragState>({
		isDragging: false,
		item: null,
	})

	const handleDragStart = (item: Snapshot<AssetTreeItemData>, event: React.DragEvent) => {
		if (!isDraggableAsset(item.type)) {
			logger.warn(`${item.path} (${item.type}) is not draggable!`)
			return
		}

		event.dataTransfer.setData('application/json', JSON.stringify(item))
		event.dataTransfer.effectAllowed = 'move'

		// Create drag preview
		const preview = document.createElement('div')
		preview.style.position = 'fixed'
		preview.style.pointerEvents = 'none'
		preview.style.zIndex = '1000'
		preview.style.opacity = '0.8'
		preview.style.backgroundColor = 'rgba(0, 0, 0, 0.2)'
		preview.style.border = '2px dashed #3399ff'
		preview.style.borderRadius = '4px'

		let previewDimensions = { width: 100, height: 100 }

		if (item.type === 'spritesheet-frame') {
			previewDimensions = calculatePreviewDimensions(item.size.w, item.size.h)
		} else if (item.type === 'image') {
			previewDimensions = calculatePreviewDimensions(item.size.w, item.size.h)
		}

		preview.style.width = `${previewDimensions.width}px`
		preview.style.height = `${previewDimensions.height}px`

		document.body.appendChild(preview)
		event.dataTransfer.setDragImage(preview, previewDimensions.width / 2, previewDimensions.height / 2)

		// Clean up preview after drag ends
		requestAnimationFrame(() => {
			document.body.removeChild(preview)
		})

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
