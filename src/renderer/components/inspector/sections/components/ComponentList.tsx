import { ActionIcon, Group, Stack, Text, TextInput, UnstyledButton } from '@mantine/core'
import { Fzf } from 'fzf'
import { Search, X } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { EditableComponentType } from '../../../canvas/phaser/scenes/main/objects/components/base/EditableComponent'
import classes from './ComponentList.module.css'
import { ComponentListItemData, ComponentsListData } from './ComponentsListData'

interface ComponentListProps {
	opened: boolean
	onClose: () => void
	onSelect: (type: EditableComponentType) => void
}

const SEARCH_ICON = <Search size={16} />

export function ComponentList({ opened, onClose, onSelect }: ComponentListProps) {
	const [searchQuery, setSearchQuery] = useState('')
	const [selectedIndex, setSelectedIndex] = useState(-1)
	const searchInputRef = useRef<HTMLInputElement>(null)
	const listRef = useRef<HTMLDivElement>(null)

	// Create fzf instance for fuzzy search
	const fzf = useMemo(() => {
		const components = Object.values(ComponentsListData)
		return new Fzf(components, {
			selector: (item: ComponentListItemData) => item.title,
			limit: 15,
		})
	}, [])

	// Filter components based on search query
	const filteredComponents = useMemo(() => {
		if (!searchQuery.trim()) {
			return Object.values(ComponentsListData)
		}
		return fzf.find(searchQuery).map((result) => result.item)
	}, [searchQuery, fzf])

	// Group filtered components
	const filteredGroupedComponents = useMemo(() => {
		const groups: Record<string, ComponentListItemData[]> = {}

		filteredComponents.forEach((component) => {
			if (!groups[component.group]) {
				groups[component.group] = []
			}
			groups[component.group].push(component)
		})

		return groups
	}, [filteredComponents])

	// Auto focus search input when opened
	useEffect(() => {
		if (opened) {
			searchInputRef.current?.focus()
			setSelectedIndex(-1)
			setSearchQuery('')
		}
	}, [opened])

	const handleKeyDown = (e: React.KeyboardEvent) => {
		const totalItems = filteredComponents.length

		switch (e.key) {
			case 'ArrowDown':
				e.preventDefault()
				setSelectedIndex((prev) => (prev + 1) % totalItems)
				break
			case 'ArrowUp':
				e.preventDefault()
				setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems)
				break
			case 'Enter':
				e.preventDefault()
				if (filteredComponents[selectedIndex]) {
					onSelect(filteredComponents[selectedIndex].type)
					onClose()
				}
				break
			case 'Escape':
				e.preventDefault()
				onClose()
				break
			case 'Tab':
				e.preventDefault()
				if (e.shiftKey) {
					setSelectedIndex((prev) => (prev - 1 + totalItems) % totalItems)
				} else {
					setSelectedIndex((prev) => (prev + 1) % totalItems)
				}
				break
		}
	}

	// Ensure selected item is in view
	useEffect(() => {
		const selectedElement = listRef.current?.querySelector(`[data-index="${selectedIndex}"]`)
		if (selectedElement) {
			selectedElement.scrollIntoView({ block: 'nearest' })
		}
	}, [selectedIndex])

	return (
		<Stack gap="xs">
			<Group gap="xs">
				<TextInput
					ref={searchInputRef}
					placeholder="Search components..."
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					onKeyDown={handleKeyDown}
					style={{ flex: 1 }}
					leftSection={SEARCH_ICON}
					rightSection={useMemo(
						() =>
							searchQuery && (
								<ActionIcon size="sm" variant="subtle" onClick={() => setSearchQuery('')}>
									<X size={16} />
								</ActionIcon>
							),
						[searchQuery]
					)}
				/>
			</Group>

			<Stack gap="md" ref={listRef} style={{ maxHeight: '400px', overflowY: 'auto' }}>
				{Object.entries(filteredGroupedComponents).map(([groupName, components]) => (
					<Stack gap="xs" key={groupName}>
						<Text size="sm" fw={500} c="dimmed">
							{groupName}
						</Text>
						<Stack gap="0">
							{components.map((component) => {
								const index = filteredComponents.indexOf(component)
								const Icon = component.icon
								return (
									<UnstyledButton
										key={component.type}
										data-index={index}
										data-selected={index === selectedIndex}
										className={classes.componentItem}
										onClick={() => {
											onSelect(component.type)
											onClose()
										}}
									>
										<Group gap="sm">
											<Icon size={18} />
											<div>
												<Text size="sm">{component.title}</Text>
												{/* <Text size="xs" c="dimmed">
													{component.description}
												</Text> */}
											</div>
										</Group>
									</UnstyledButton>
								)
							})}
						</Stack>
					</Stack>
				))}
			</Stack>
		</Stack>
	)
}
