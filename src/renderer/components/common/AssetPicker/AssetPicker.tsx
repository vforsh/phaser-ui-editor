import { Box, Button, Input, MantineSize, Text, useMantineTheme } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { State, state, useSnapshot } from '@state/State'
import { clsx } from 'clsx'
import { LocateFixed, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { match } from 'ts-pattern'
import { AssetTreeItemData, getAssetById } from '../../../types/assets'
import classes from './AssetPicker.module.css'
import { AssetPickerSelectMenu } from './AssetPickerSelectMenu'

export interface AssetPickerProps {
	assetIds: string[]
	selectedAssetId: string | null
	onSelect: (assetId: string) => void
	onClear: () => void
	onLocate?: (assetId: string) => void
	label?: string
	modalTitle?: string
	error?: string
	size?: MantineSize | (string & {})
	// TODO add disabled prop
}

export function AssetPicker({
	assetIds,
	selectedAssetId,
	onSelect,
	onClear,
	onLocate,
	label,
	error,
	size = 'xs',
	modalTitle,
}: AssetPickerProps) {
	const theme = useMantineTheme()
	const [opened, { open, close }] = useDisclosure(false)
	const [search, setSearch] = useState('')
	const assetsSnap = useSnapshot(state.assets.items)
	const { locateAsset } = useSnapshot(state.assets)

	const selectedAsset = selectedAssetId ? getAssetById(assetsSnap as State['assets']['items'], selectedAssetId) : null

	return (
		<>
			<Input.Wrapper label={label} error={error} size={size}>
				{/* TODO replace with Button.Group */}
				{/* https://mantine.dev/core/button/#buttongroup */}
				<Box onClick={open} className={clsx(classes.container, error && classes.error)}>
					<Text size="xs" c={selectedAsset ? undefined : 'dimmed'}>
						{selectedAsset ? getAssetLabel(selectedAsset) : 'Select asset...'}
					</Text>
					<div className={classes.buttonGroup}>
						{selectedAssetId && (
							<Button
								variant="subtle"
								size="compact-xs"
								onClick={(e) => {
									e.stopPropagation()
									onClear()
								}}
								className={classes.button}
							>
								<Trash2 size={14} color={theme.colors.gray[5]} />
							</Button>
						)}
						<Button
							variant="subtle"
							size="compact-xs"
							onClick={(e) => {
								e.stopPropagation()
								if (selectedAssetId) {
									if (onLocate) {
										onLocate(selectedAssetId)
									} else if (locateAsset) {
										locateAsset(selectedAssetId)
									}
								}
							}}
							className={classes.button}
							disabled={!selectedAssetId}
						>
							<LocateFixed size={14} color={theme.colors.gray[5]} />
						</Button>
					</div>
				</Box>
			</Input.Wrapper>

			{opened && (
				<AssetPickerSelectMenu
					opened={opened}
					onClose={close}
					assetIds={assetIds}
					onSelect={onSelect}
					search={search}
					onSearchChange={setSearch}
					selectedAssetId={selectedAssetId}
					title={modalTitle ?? `Select ${label?.toLowerCase() ?? 'asset'}`}
				/>
			)}
		</>
	)
}

function getAssetLabel(asset: AssetTreeItemData) {
	return match(asset)
		.with({ type: 'bitmap-font' }, (asset) => asset.name)
		.with({ type: 'web-font' }, (asset) => asset.fullName || asset.fontFamily)
		.with({ type: 'spritesheet-frame' }, (asset) => asset.pathInHierarchy)
		.otherwise(() => asset.name)
}
