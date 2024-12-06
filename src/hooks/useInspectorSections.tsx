import { useMemo } from 'react';
import { Info, Move, Image, Link, Settings, Eye } from 'lucide-react';
import type { AssetTreeItemData } from '../types/assets';
import { BasicInfoSection } from '../components/inspector/sections/BasicInfoSection';
import { TransformSection } from '../components/inspector/sections/TransformSection';
import { DisplaySection, type DisplayProperties } from '../components/inspector/sections/DisplaySection';
import { AssetPreview } from '../components/inspector/AssetPreview';

const defaultDisplayProperties: DisplayProperties = {
  visible: true,
  alpha: 100,
  blendMode: 'NORMAL',
};

export function useInspectorSections(asset: AssetTreeItemData | null) {
  return useMemo(() => {
    if (!asset) return [];

    const sections = [
      {
        id: 'basic-info',
        title: 'Basic Information',
        icon: Info,
        content: <BasicInfoSection asset={asset} />,
        defaultExpanded: true,
      },
      {
        id: 'display',
        title: 'Display',
        icon: Eye,
        content: (
          <DisplaySection
            properties={defaultDisplayProperties}
            onChange={(changes) => {
              console.log('Display properties changed:', changes);
              // TODO: Update display properties in state
            }}
          />
        ),
        defaultExpanded: true,
      },
      {
        id: 'transform',
        title: 'Transform',
        icon: Move,
        content: <TransformSection />,
        defaultExpanded: true,
      },
    ];

    // Add preview section for supported asset types
    if (['image', 'spritesheet', 'spritesheet-frame'].includes(asset.type)) {
      sections.unshift({
        id: 'preview',
        title: 'Preview',
        icon: Image,
        content: <AssetPreview asset={asset} />,
        defaultExpanded: true,
      });
    }

    // Add asset-specific sections
    switch (asset.type) {
      case 'spritesheet':
        sections.push({
          id: 'references',
          title: 'References',
          icon: Link,
          content: (
            <BasicInfoSection 
              asset={{
                type: 'json',
                name: asset.json.name,
                path: asset.json.path,
              }} 
            />
          ),
          defaultExpanded: false,
        });
        break;
    }

    return sections;
  }, [asset]);
}