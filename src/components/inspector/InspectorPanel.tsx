import { Stack } from '@mantine/core';
import { PanelTitle } from '../PanelTitle';
import { InspectorSection } from './InspectorSection';
import { useInspectorSections } from '../../hooks/useInspectorSections';
import type { AssetTreeItemData } from '../../types/assets';
import { NoSelection } from './NoSelection';

interface InspectorPanelProps {
  selectedAsset: AssetTreeItemData | null;
}

export default function InspectorPanel({ selectedAsset }: InspectorPanelProps) {
  const sections = useInspectorSections(selectedAsset);

  if (!selectedAsset) {
    return (
      <Stack gap="xs" p="xs">
        <NoSelection />
      </Stack>
    );
  }

  return (
    <Stack gap="xs" p="xs">
      {sections.map((section) => (
        <InspectorSection
          key={section.id}
          title={section.title}
          icon={section.icon}
          content={section.content}
          defaultExpanded={section.defaultExpanded}
        />
      ))}
    </Stack>
  );
}