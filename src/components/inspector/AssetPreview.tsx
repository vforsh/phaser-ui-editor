import { Box, Image, Stack, Text } from '@mantine/core';
import { useMemo } from 'react';
import type { AssetTreeItemData } from '../../types/assets';
import { formatFileSize } from '../../utils/formatters';

interface AssetPreviewProps {
  asset: AssetTreeItemData;
}

export function AssetPreview({ asset }: AssetPreviewProps) {
  const placeholderUrl = useMemo(() => {
    const seeds = [
      'game-asset',
      'pixel-art',
      'game-sprite',
      'game-texture',
      'game-ui'
    ];
    const seed = seeds[Math.floor(Math.random() * seeds.length)];
    return `https://source.unsplash.com/featured/512x512?${seed}`;
  }, [asset.path]);

  const dimensions = useMemo(() => {
    if ('size' in asset) {
      return asset.size;
    }
    return null;
  }, [asset]);

  return (
    <Stack gap="md">
      <Box style={{ 
        aspectRatio: '1',
        overflow: 'hidden',
        borderRadius: 4,
        backgroundColor: '#1A1B1E',
      }}>
        <Image
          src={placeholderUrl}
          alt={asset.name}
          style={{ objectFit: 'contain', width: '100%', height: '100%' }}
        />
      </Box>

      {dimensions && (
        <Stack gap="xs">
          <Text fw={500} size="sm">Metadata</Text>
          <Stack gap={4}>
            <MetadataRow 
              label="Dimensions" 
              value={`${dimensions.w} × ${dimensions.h}px`} 
            />
            <MetadataRow 
              label="Size" 
              value={formatFileSize(dimensions.w * dimensions.h * 4)} 
            />
            <MetadataRow 
              label="Type" 
              value={asset.type} 
            />
          </Stack>
        </Stack>
      )}
    </Stack>
  );
}

interface MetadataRowProps {
  label: string;
  value: string;
}

function MetadataRow({ label, value }: MetadataRowProps) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
      <Text size="sm" c="dimmed">{label}</Text>
      <Text size="sm">{value}</Text>
    </div>
  );
}