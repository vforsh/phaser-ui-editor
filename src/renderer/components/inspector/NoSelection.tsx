import { Text, Center } from '@mantine/core';

export function NoSelection() {
  return (
    <Center h="100%" py="xl">
      <Text c="dimmed" size="sm">
        Select an item to inspect
      </Text>
    </Center>
  );
}