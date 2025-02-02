import { Box, Button, Input, Text, useMantineTheme } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { State, state, useSnapshot } from '@state/State'
import { clsx } from 'clsx'
import { LocateFixed, Trash2 } from 'lucide-react'
import { useState } from 'react'
import { getAssetById } from '../../../types/assets'
import classes from './AssetPicker.module.css'
import { AssetPickerSelectMenu } from './AssetPickerSelectMenu'

export interface AssetPickerProps {
	assetIds: string[]
	selectedAssetId: string | null
	onSelect: (assetId: string) => void
	onClear: () => void
	onLocate: () => void
	label?: string
	error?: string
}

export function AssetPicker({
	assetIds,
	selectedAssetId,
	onSelect,
	onClear,
	onLocate,
	label,
	error,
}: AssetPickerProps) {
	const theme = useMantineTheme()
	const [opened, { open, close }] = useDisclosure(false)
	const [search, setSearch] = useState('')
	const assetsSnap = useSnapshot(state.assets.items)

	const selectedAsset = selectedAssetId ? getAssetById(assetsSnap as State['assets']['items'], selectedAssetId) : null

	return (
		<>
			<Input.Wrapper label={label} error={error} size="xs">
				<Box onClick={open} className={clsx(classes.container, error && classes.error)}>
					<Text size="xs" c={selectedAsset ? undefined : 'dimmed'}>
						{selectedAsset ? selectedAsset.name : 'Select asset...'}
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
								<Trash2 size={16} color={theme.colors.gray[5]} />
							</Button>
						)}
						<Button
							variant="subtle"
							size="compact-xs"
							onClick={(e) => {
								e.stopPropagation()
								onLocate()
							}}
							className={classes.button}
							disabled={!selectedAssetId}
						>
							<LocateFixed size={16} color={theme.colors.gray[5]} />
						</Button>
					</div>
				</Box>
			</Input.Wrapper>

			<AssetPickerSelectMenu
				opened={opened}
				onClose={close}
				assetIds={assetIds}
				onSelect={onSelect}
				search={search}
				onSearchChange={setSearch}
				selectedAssetId={selectedAssetId}
				title={`Select ${label?.toLowerCase() ?? 'asset'}`}
			/>
		</>
	)
}
