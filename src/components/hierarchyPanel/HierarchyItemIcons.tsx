import { EditableObjectJson } from '@components/canvas/phaser/scenes/main/objects/EditableObject'
import { ActionIcon, Group, Tooltip, useMantineTheme } from '@mantine/core'
import { state } from '@state/State'
import { Eye, EyeOff, FolderSearch, Lock, Unlock } from 'lucide-react'
import { memo } from 'react'
import { useSnapshot } from 'valtio'

interface HierarchyItemIconsProps {
	objState: EditableObjectJson
	isHovered: boolean
	linkedAssetId: string | undefined
}

function HierarchyItemIcons({ objState, isHovered, linkedAssetId }: HierarchyItemIconsProps) {
	const theme = useMantineTheme()
	const objSnap = useSnapshot(objState)

	return (
		<Group gap="4px" wrap="nowrap" mr="xs">
			<Tooltip label={'Locate in Assets'}>
				<ActionIcon
					variant="subtle"
					size="sm"
					color={theme.colors.gray[5]}
					disabled={!linkedAssetId}
					onClick={(e) => {
						e.stopPropagation()
						state.assets.locateAsset?.(linkedAssetId!)
					}}
					style={{
						visibility: isHovered ? 'visible' : 'hidden',
						transition: 'visibility 33ms ease',
					}}
				>
					<FolderSearch size={14} />
				</ActionIcon>
			</Tooltip>

			<Tooltip label={objSnap.visible ? 'Hide' : 'Show'}>
				<ActionIcon
					variant="subtle"
					size="sm"
					color={theme.colors.gray[5]}
					onClick={(e) => {
						e.stopPropagation()
						objState.visible = !objSnap.visible
					}}
					style={{
						visibility: isHovered ? 'visible' : 'hidden',
						transition: 'visibility 33ms ease',
					}}
				>
					{objSnap.visible ? <Eye size={14} /> : <EyeOff size={14} />}
				</ActionIcon>
			</Tooltip>

			<Tooltip label={objSnap.locked ? 'Unlock' : 'Lock'}>
				<ActionIcon
					variant="subtle"
					size="sm"
					color={theme.colors.gray[5]}
					onClick={(e) => {
						e.stopPropagation()
						objState.locked = !objSnap.locked
					}}
					style={{
						visibility: objSnap.locked || isHovered ? 'visible' : 'hidden',
						transition: 'visibility 33ms ease',
					}}
				>
					{objSnap.locked ? <Lock size={14} /> : <Unlock size={14} />}
				</ActionIcon>
			</Tooltip>
		</Group>
	)
}

export default memo(HierarchyItemIcons)
