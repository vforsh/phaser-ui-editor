import { Stack } from '@mantine/core'
import { Snapshot } from 'valtio'
import { getAssetRelativePath, type AssetTreeItemData } from '../../../../types/assets'
import { BaseSectionProps } from '../BaseSection'
import { ReadonlyPropertyRow } from '../PropertyRow'

export type AssetSectionData = Snapshot<AssetTreeItemData>

export interface AssetSectionProps extends BaseSectionProps<AssetSectionData> {}

export function AssetSection({ data }: AssetSectionProps) {
	return (
		<Stack gap="xs">
			<ReadonlyPropertyRow label="Name" value={data.name} />
			<ReadonlyPropertyRow label="Id" value={data.id} />
			<ReadonlyPropertyRow label="Type" value={data.type} />
			<ReadonlyPropertyRow label="Path" value={getAssetRelativePath(data.path)} />
		</Stack>
	)
}
