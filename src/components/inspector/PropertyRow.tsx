import { Group, Text } from '@mantine/core';

interface PropertyRowProps {
  label: string;
  value: string | number;
}

export function PropertyRow({ label, value }: PropertyRowProps) {
  return (
    <Group justify="space-between" wrap="nowrap">
      <Text size="sm" c="dimmed" style={{ minWidth: 80 }}>
        {label}
      </Text>
      <Text size="sm" style={{ flex: 1, textAlign: 'right' }}>
        {value}
      </Text>
    </Group>
  );
}