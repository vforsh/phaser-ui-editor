import { Stack, Text } from '@mantine/core';
import type { AssetTreeItemData } from '../types/assets';
import { PanelTitle } from './PanelTitle';
import { AssetPreview } from './inspector/AssetPreview';

interface InspectorPanelProps {
  selectedAsset: AssetTreeItemData | null;
}

export default function InspectorPanel({ selectedAsset }: InspectorPanelProps) {
  const showPreview = selectedAsset && (
    selectedAsset.type === 'image' ||
    selectedAsset.type === 'spritesheet' ||
    selectedAsset.type === 'spritesheet-frame'
  );

  return (
    <Stack gap="xs" p="xs">
      <PanelTitle title="Inspector" />

      {showPreview ? (
        <AssetPreview asset={selectedAsset} />
      ) : (
        <Text c="dimmed" size="sm" ta="center" pt="xl">
          {selectedAsset ? 'No preview available' : 'Select an item to inspect'}
        </Text>
      )}
    </Stack>
  );
}