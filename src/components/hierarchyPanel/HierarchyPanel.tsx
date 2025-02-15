import { Divider, Paper, ScrollArea, Stack } from '@mantine/core'
import { useWindowEvent } from '@mantine/hooks'
import { notifications } from '@mantine/notifications'
import { until } from '@open-draft/until'
import { state, unproxy, useSnapshot } from '@state/State'
import { getErrorLog } from '@utils/error/utils'
import {
	ChevronRight,
	ClipboardCopy,
	ClipboardPaste,
	Copy,
	FilePlus2,
	FolderSearch,
	Scissors,
	TextCursorInput,
	Trash2,
} from 'lucide-react'
import { ContextMenuItemOptions } from 'mantine-contextmenu'
import { useRef, useState } from 'react'
import { Logger } from 'tslog'
import { Snapshot } from 'valtio'
import { EditableContainerJson, EditableObjectJson } from '../../types/exports/exports'
import HierarchyItem from './HierarchyItem'
import styles from './HierarchyPanel.module.css'
import { HierarchyPanelTitle } from './HierarchyPanelTitle'
import { getHierarchyItemIcon, getLinkedAssetId } from './hierarchyUtils'

export function createHierarchyItemContextMenuItems(
	obj: Snapshot<EditableObjectJson>,
	isRoot = false
): ContextMenuItemOptions[] {
	let dividers = 1
	const divider = () => {
		return { key: `divider-${dividers++}` }
	}

	const appCommands = state.app?.commands

	const linkedAssetId = getLinkedAssetId(obj as EditableObjectJson, isRoot)

	const items: ContextMenuItemOptions[] = [
		{
			key: 'create',
			icon: <FilePlus2 size={16} />,
			title: 'Create',
			iconRight: <ChevronRight size={14} />,
			items: [
				{
					key: 'create-container',
					icon: getHierarchyItemIcon('Container'),
					title: 'Container',
					onClick: () => {
						appCommands?.emit('create-object', { clickedObjId: obj.id, type: 'Container' })
					},
				},
			],
		},
		divider(),
		{
			key: 'copy',
			title: 'Copy',
			icon: <ClipboardCopy size={16} />,
			onClick: () => {
				appCommands?.emit('copy-object', obj.id)
			},
		},
		{
			key: 'duplicate',
			title: 'Duplicate',
			icon: <Copy size={16} />,
			disabled: isRoot,
			onClick: () => {
				appCommands?.emit('duplicate-object', obj.id)
			},
		},
		{
			key: 'cut',
			title: 'Cut',
			icon: <Scissors size={16} />,
			disabled: isRoot,
			onClick: () => {
				appCommands?.emit('cut-object', obj.id)
			},
		},
		{
			key: 'paste',
			title: 'Paste',
			icon: <ClipboardPaste size={16} />,
			onClick: () => {
				appCommands?.emit('paste-object', obj.id)
			},
		},
		divider(),
		{
			key: 'locate-in-assets',
			title: 'Locate in Assets',
			icon: <FolderSearch size={16} />,
			disabled: !linkedAssetId,
			onClick: () => {
				state.assets.locateAsset?.(linkedAssetId!)
			},
		},
		divider(),
		{
			key: 'rename',
			title: 'Rename',
			icon: <TextCursorInput size={16} />,
			onClick: () => {
				console.log(`rename`, unproxy(obj))
			},
		},
		{
			key: 'delete',
			title: 'Delete',
			icon: <Trash2 size={16} />,
			color: 'red',
			disabled: isRoot,
			onClick: (event) => {
				appCommands?.emit('delete-object', obj.id)
			},
		},
		divider(),
		{
			key: 'copy-id',
			title: 'Copy ID',
			icon: <ClipboardCopy size={16} />,
			onClick: async () => {
				const { error } = await until(() => navigator.clipboard.writeText(obj.id))

				if (error) {
					notifications.show({
						title: 'Failed to copy ID',
						message: `${getErrorLog(error)}`,
						color: 'red',
						autoClose: 10_000,
					})

					return
				}

				notifications.show({
					title: 'ID Copied',
					message: `${obj.id} copied to clipboard`,
					color: 'green',
					autoClose: 10_000,
				})
			},
		},
		{
			key: 'copy-path',
			title: 'Copy Path',
			icon: <ClipboardCopy size={16} />,
			onClick: async () => {
				const path = appCommands?.emit('get-object-path', obj.id)
				if (!path) {
					return
				}

				const { error } = await until(() => navigator.clipboard.writeText(path))

				if (error) {
					notifications.show({
						title: 'Failed to copy path',
						message: `${getErrorLog(error)}`,
						color: 'red',
						autoClose: 10_000,
					})

					return
				}

				notifications.show({
					title: 'Path Copied',
					message: `${path} copied to clipboard`,
					color: 'green',
					autoClose: 10_000,
				})
			},
		},
	]

	return items
}

export function flattenHierarchy(root: EditableContainerJson): EditableObjectJson[] {
	const items: EditableObjectJson[] = []

	items.push(root)

	for (const child of root.children) {
		if (child.type === 'Container') {
			items.push(...flattenHierarchy(child))
		} else {
			items.push(child)
		}
	}

	return items
}

export type HierarchyPanelProps = {
	logger: Logger<{}>
}

export default function HierarchyPanel(props: HierarchyPanelProps) {
	const { logger } = props

	const panelRef = useRef<HTMLDivElement>(null)

	const [isFocused, setIsFocused] = useState(document.activeElement === panelRef.current)

	const canvasSnap = useSnapshot(state.canvas)

	const rootState = canvasSnap.root && state.canvas.objectById(canvasSnap.root.id)

	if (rootState && rootState.type !== 'Container') {
		throw new Error('Root must be a container')
	}

	useWindowEvent('keydown', (event) => {
		if (!isFocused) {
			return
		}

		if ((event.key === 's' || event.key === 'S') && (event.ctrlKey || event.metaKey)) {
			event.preventDefault()

			if (canvasSnap.hasUnsavedChanges) {
				state.app?.commands.emit('save-prefab')
			}

			return
		}

		if (event.key === 'Escape') {
			event.preventDefault()

			// TODO focus on the canvas
		}
	})

	return (
		<Paper
			style={{ height: '100%', display: 'flex', flexDirection: 'column' }}
			radius="sm"
			ref={panelRef}
			onClick={() => panelRef.current?.focus()}
			tabIndex={1}
			onFocus={() => setIsFocused(true)}
			onBlur={() => setIsFocused(false)}
			className={styles.panel}
		>
			<Stack gap="xs" p="xs" style={{ height: '100%', minHeight: 0 }}>
				<HierarchyPanelTitle
					title={canvasSnap.currentPrefab?.name || 'Hierarchy'}
					hasUnsavedChanges={canvasSnap.hasUnsavedChanges}
					onSave={() => state.app?.commands.emit('save-prefab')}
				/>
				<Divider />
				<ScrollArea style={{ flex: 1 }}>
					<Stack gap={0}>
						{rootState && (
							<HierarchyItem
								key={rootState.id}
								objState={rootState}
								selectedIds={canvasSnap.selection}
								hoveredIds={canvasSnap.hover}
								isLastChild={true}
								isRoot={true}
								activeEditContextId={canvasSnap.activeContextId}
								isPanelFocused={isFocused}
							/>
						)}
					</Stack>
				</ScrollArea>
			</Stack>
		</Paper>
	)
}
