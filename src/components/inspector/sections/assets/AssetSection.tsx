import { Stack } from '@mantine/core'
import { getAssetRelativePath, type AssetTreeItemData } from '../../../../types/assets'
import { ReadonlyPropertyRow } from '../PropertyRow'

interface AssetSectionProps {
	asset: AssetTreeItemData
}

export function AssetSection({ asset }: AssetSectionProps) {
	return (
		<Stack gap="xs">
			<ReadonlyPropertyRow label="Name" value={asset.name} />
			{/* <ReadonlyPropertyRow label="Id" value={asset.id} /> */}
			<ReadonlyPropertyRow label="Type" value={asset.type} />
			<ReadonlyPropertyRow label="Path" value={getAssetRelativePath(asset)} />
		</Stack>
	)
}
