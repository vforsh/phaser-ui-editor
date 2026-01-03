import { TextInput, Button, Group } from '@mantine/core';
import { useEffect, useRef } from 'react';
import { useProjectPathValidation } from '../../hooks/useProjectPathValidation';

interface ProjectPathInputProps {
  value: string;
  onChange: (value: string) => void;
  onSubmit: (e: React.FormEvent) => void;
  onBrowse?: () => void;
  autoFocus?: boolean;
}

export function ProjectPathInput({ value, onChange, onSubmit, onBrowse, autoFocus }: ProjectPathInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const { isValid, validationMessage } = useProjectPathValidation(value);

  useEffect(() => {
    if (autoFocus && inputRef.current) {
      inputRef.current.focus();
    }
  }, [autoFocus]);
  
  return (
    <Group gap="sm" grow>
      <TextInput
        ref={inputRef}
        placeholder="Enter project directory path"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        onSubmit={(e) => onSubmit(e)}
        error={value.length > 0 ? validationMessage : undefined}
        style={{ flex: 1 }}
        data-autofocus={autoFocus}
      />
      {onBrowse && (
        <Button type="button" variant="default" style={{ width: 'auto' }} onClick={onBrowse}>
          Browse
        </Button>
      )}
      <Button type="submit" style={{ width: 'auto' }} disabled={!isValid}>
        Open
      </Button>
    </Group>
  );
}
