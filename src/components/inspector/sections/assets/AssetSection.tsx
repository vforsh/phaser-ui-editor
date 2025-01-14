import { Stack } from '@mantine/core'
import { getAssetRelativePath, type AssetTreeItemData } from '../../../../types/assets'
import { ReadonlyPropertyRow } from '../PropertyRow'
import { BaseSectionProps } from '../BaseSection'

export type AssetSectionData = Readonly<AssetTreeItemData>

export interface AssetSectionProps extends BaseSectionProps<AssetSectionData> {}

export function AssetSection({ data }: AssetSectionProps) {
	return (
		<Stack gap="xs">
			<ReadonlyPropertyRow label="Name" value={data.name} />
			{/* <ReadonlyPropertyRow label="Id" value={asset.id} /> */}
			<ReadonlyPropertyRow label="Type" value={data.type} />
			<ReadonlyPropertyRow label="Path" value={getAssetRelativePath(data.path)} />
		</Stack>
	)
}
