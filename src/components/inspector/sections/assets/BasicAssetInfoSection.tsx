import { Stack } from '@mantine/core'
import type { AssetTreeItemData } from '../../../../types/assets'
import { ReadonlyPropertyRow } from '../PropertyRow'

interface BasicAssetInfoSectionProps {
	asset: AssetTreeItemData
}

export function BasicAssetInfoSection({ asset }: BasicAssetInfoSectionProps) {
	return (
		<Stack gap="xs">
			<ReadonlyPropertyRow label="Name" value={asset.name} />
			<ReadonlyPropertyRow label="Type" value={asset.type} />
			<ReadonlyPropertyRow label="Path" value={asset.path} />
		</Stack>
	)
}
