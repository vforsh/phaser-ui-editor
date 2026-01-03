import { Button, Stack } from '@mantine/core'
import { FolderOpen } from 'lucide-react'
import { Snapshot } from 'valtio'
import { backend } from '../../../../backend-renderer/backend'
import { getAssetRelativePath, type AssetTreeItemData } from '../../../../types/assets'
import { BaseSectionProps } from '../BaseSection'
import { ReadonlyPropertyRow } from '../PropertyRow'

export type AssetSectionData = Snapshot<AssetTreeItemData>

export interface AssetSectionProps extends BaseSectionProps<AssetSectionData> {}

const isMac = window.navigator.userAgent.toLowerCase().includes('mac')

export function AssetSection({ data }: AssetSectionProps) {
	const physicalPath =
		data.type === 'spritesheet-frame' || data.type === 'spritesheet-folder' ? data.imagePath : data.path

	return (
		<Stack gap="xs">
			<ReadonlyPropertyRow label="Name" value={data.name} />
			<ReadonlyPropertyRow label="Id" value={data.id} />
			<ReadonlyPropertyRow label="Type" value={data.type} />
			<ReadonlyPropertyRow label="Path" value={getAssetRelativePath(data.path)} />
			<Button
				fullWidth
				variant="light"
				leftSection={<FolderOpen size={16} />}
				onClick={() => {
					void backend.showItemInFolder({ path: physicalPath })
				}}
				mt="sm"
			>
				{isMac ? 'Open in Finder' : 'Open in Explorer'}
			</Button>
		</Stack>
	)
}
