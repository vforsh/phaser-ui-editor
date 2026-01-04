import { useState } from 'react'

const TRANSITION_DURATION = '200ms'

interface ResizableDividerProps {
	onResize: (delta: number) => void
	vertical?: boolean
}

export default function ResizableDivider({ onResize, vertical = false }: ResizableDividerProps) {
	const [isDragging, setIsDragging] = useState(false)
	const [isHovered, setIsHovered] = useState(false)

	const handleMouseDown = (e: React.MouseEvent) => {
		if (e.button === 2) return // Prevent drag on right-click
		e.preventDefault()
		setIsDragging(true)

		const startPos = vertical ? e.clientX : e.clientY
		let lastPos = startPos

		const handleMouseMove = (e: MouseEvent) => {
			const currentPos = vertical ? e.clientX : e.clientY
			const delta = currentPos - lastPos
			lastPos = currentPos
			onResize(delta)
		}

		const handleMouseUp = () => {
			setIsDragging(false)
			document.removeEventListener('mousemove', handleMouseMove)
			document.removeEventListener('mouseup', handleMouseUp)
		}

		document.addEventListener('mousemove', handleMouseMove)
		document.addEventListener('mouseup', handleMouseUp)
	}

	return (
		<div
			onMouseDown={handleMouseDown}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => setIsHovered(false)}
			style={{
				// margin: '10px 0px',
				'cursor': vertical ? 'col-resize' : 'row-resize',
				'background': isDragging
					? 'var(--mantine-color-blue-filled)'
					: isHovered
						? 'var(--mantine-color-dark-4)'
						: 'transparent',
				'transition': `background-color ${TRANSITION_DURATION} ease`,
				'width': vertical ? '8px' : '100%',
				'height': vertical ? '100%' : '8px',
				'margin': vertical ? '0px -2px' : '-6px 0px',
				'borderRadius': '2px',
				'zIndex': 99,
				'userSelect': 'none',
				'position': 'relative',
				// @ts-expect-error
				'&::after': {
					content: '""',
					position: 'absolute',
					top: vertical ? 0 : '50%',
					left: vertical ? '50%' : 0,
					width: vertical ? '2px' : '100%',
					height: vertical ? '100%' : '2px',
					background: isHovered || isDragging ? 'var(--mantine-color-dark-4)' : 'var(--mantine-color-dark-3)',
					opacity: isHovered || isDragging ? 0.5 : 0.2,
					transform: vertical ? 'translateX(-50%)' : 'translateY(-50%)',
					transition: `opacity ${TRANSITION_DURATION} ease`,
					pointerEvents: 'none',
				},
			}}
		/>
	)
}
