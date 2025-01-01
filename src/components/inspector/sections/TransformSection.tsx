import { Stack, Group, NumberInput } from '@mantine/core';
import { PropertyRow } from '../PropertyRow';

interface TransformSectionProps {
  x?: number;
  y?: number;
  rotation?: number;
  scale?: { x: number; y: number };
}

export function TransformSection({ 
  x = 0, 
  y = 0, 
  rotation = 0,
  scale = { x: 1, y: 1 } 
}: TransformSectionProps) {
  return (
    <Stack gap="xs">
      <Group grow>
        <NumberInput
          label="X"
          value={x}
          onChange={(val) => console.log('x changed:', val)}
          decimalScale={2}
          size="xs"
        />
        <NumberInput
          label="Y"
          value={y}
          onChange={(val) => console.log('y changed:', val)}
          decimalScale={2}
          size="xs"
        />
      </Group>
      <NumberInput
        label="Rotation"
        value={rotation}
        onChange={(val) => console.log('rotation changed:', val)}
        decimalScale={2}
        size="xs"
      />
      <Group grow>
        <NumberInput
          label="Scale X"
          value={scale.x}
          onChange={(val) => console.log('scale.x changed:', val)}
          decimalScale={2}
          size="xs"
        />
        <NumberInput
          label="Scale Y"
          value={scale.y}
          onChange={(val) => console.log('scale.y changed:', val)}
          decimalScale={2}
          size="xs"
        />
      </Group>
    </Stack>
  );
}