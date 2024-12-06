import { useState } from 'react';
import { Box, UnstyledButton, Group, Text, Collapse } from '@mantine/core';
import { ChevronRight } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

interface InspectorSectionProps {
  title: string;
  icon: LucideIcon;
  content: React.ReactNode;
  defaultExpanded?: boolean;
}

export function InspectorSection({ 
  title, 
  icon: Icon, 
  content,
  defaultExpanded = false 
}: InspectorSectionProps) {
  const [expanded, setExpanded] = useState(defaultExpanded);

  return (
    <Box>
      <UnstyledButton
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: 'var(--mantine-spacing-xs)',
          borderRadius: 'var(--mantine-radius-sm)',
          backgroundColor: 'var(--mantine-color-dark-6)',
          transition: 'background-color 150ms ease',
        }}
      >
        <Group gap="xs">
          <div
            style={{
              transform: `rotate(${expanded ? '90deg' : '0deg'})`,
              transition: 'transform 200ms ease',
            }}
          >
            <ChevronRight size={16} />
          </div>
          <Icon size={16} />
          <Text size="sm" fw={500}>
            {title}
          </Text>
        </Group>
      </UnstyledButton>

      <Collapse in={expanded} transitionDuration={200}>
        <Box pt="xs" pb="sm" px="sm">
          {content}
        </Box>
      </Collapse>
    </Box>
  );
}