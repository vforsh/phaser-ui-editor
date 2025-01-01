import { Stack } from '@mantine/core';
import { PropertyRow } from '../PropertyRow';
import type { AssetTreeItemData } from '../../../types/assets';

interface BasicInfoSectionProps {
  asset: AssetTreeItemData;
}

export function BasicInfoSection({ asset }: BasicInfoSectionProps) {
  return (
    <Stack gap="xs">
      <PropertyRow label="Name" value={asset.name} />
      <PropertyRow label="Type" value={asset.type} />
      <PropertyRow label="Path" value={asset.path} />
    </Stack>
  );
}