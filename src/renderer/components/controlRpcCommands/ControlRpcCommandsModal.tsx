import { Box, Code, Collapse, Group, Modal, ScrollArea, Stack, Text, TextInput, Tooltip } from '@mantine/core'
import { useDisclosure } from '@mantine/hooks'
import { Info, Search } from 'lucide-react'
import { useMemo, useState } from 'react'

const SearchIcon = <Search size={16} />
import { filterEntries, type ControlRpcGroup, useControlRpcCommandsModel } from './controlRpcCommandsModel'
import { ControlRpcCommandsNav } from './ControlRpcCommandsNav'

const modalSize = 1080
const contentHeight = 624

interface ControlRpcCommandsModalProps {
	opened: boolean
	onClose: () => void
	activeGroup: ControlRpcGroup
	onGroupChange: (group: ControlRpcGroup) => void
}

const tooltipText =
	'These commands can be called programmatically via the editorctl CLI tool using JSON-RPC 2.0 over WebSocket. Example: npm run editorctl -- call openProject \'{"path":"/path/to/project"}\''

const MODAL_TITLE = (
	<Group gap="xs" style={{ paddingLeft: 'calc(var(--mantine-spacing-sm) + 10px)' }}>
		<Text fw={600}>Editor Commands</Text>
		<Tooltip label={tooltipText} withArrow position="top" openDelay={200} multiline w={300}>
			<Box style={{ cursor: 'help', display: 'flex', alignItems: 'center' }}>
				<Info size={16} style={{ opacity: 0.6 }} />
			</Box>
		</Tooltip>
	</Group>
)

export function ControlRpcCommandsModal({ opened, onClose, activeGroup, onGroupChange }: ControlRpcCommandsModalProps) {
	const [searchQuery, setSearchQuery] = useState('')
	const { entries, groups } = useControlRpcCommandsModel()

	const filteredEntries = useMemo(() => filterEntries(entries, activeGroup, searchQuery), [entries, activeGroup, searchQuery])

	return (
		<Modal
			opened={opened}
			onClose={onClose}
			title={MODAL_TITLE}
			size={modalSize}
			centered
			transitionProps={{ duration: 100 }}
			padding={0}
		>
			<Box p="md">
				<Group align="stretch" gap={0} wrap="nowrap">
					<Box
						w={240}
						h={contentHeight}
						style={{
							backgroundColor: 'var(--mantine-color-dark-8)',
							borderRadius: 'var(--mantine-radius-md)',
							overflow: 'hidden',
						}}
					>
						<ControlRpcCommandsNav groups={groups} activeGroup={activeGroup} onSelect={onGroupChange} />
					</Box>
					<Box style={{ flex: 1, minWidth: 0, overflow: 'hidden', height: contentHeight }}>
						<Stack gap={0} style={{ height: '100%' }}>
							<Box px="xl" pb="md">
								<TextInput
									placeholder="Search commands..."
									leftSection={SearchIcon}
									value={searchQuery}
									onChange={(e) => setSearchQuery(e.currentTarget.value)}
								/>
							</Box>
							<Box style={{ flex: 1, overflow: 'hidden' }}>
								<ScrollArea h="100%" type="hover">
									<Stack gap="lg" px="xl" style={{ overflow: 'hidden' }}>
										{filteredEntries.length === 0 ? (
											<Text c="dimmed" size="sm">
												No commands found.
											</Text>
										) : (
											filteredEntries.map((entry) => <MethodCard key={entry.method} entry={entry} />)
										)}
									</Stack>
								</ScrollArea>
							</Box>
						</Stack>
					</Box>
				</Group>
			</Box>
		</Modal>
	)
}

interface MethodCardProps {
	entry: ReturnType<typeof useControlRpcCommandsModel>['entries'][0]
}

function MethodCard({ entry }: MethodCardProps) {
	const [inputRawOpen, { toggle: toggleInputRaw }] = useDisclosure(false)
	const [outputRawOpen, { toggle: toggleOutputRaw }] = useDisclosure(false)

	const handleMethodClick = async () => {
		try {
			await navigator.clipboard.writeText(entry.method)
		} catch (error) {
			console.error('Failed to copy to clipboard:', error)
		}
	}

	return (
		<Box
			p="md"
			style={{
				border: '1px solid var(--mantine-color-dark-4)',
				borderRadius: 'var(--mantine-radius-md)',
				backgroundColor: 'var(--mantine-color-dark-7)',
				maxWidth: '100%',
				overflow: 'hidden',
			}}
		>
			<Stack gap="md">
				<Group justify="space-between" align="flex-start">
					<Code
						style={{
							fontSize: 'var(--mantine-font-size-sm)',
							maxWidth: '100%',
							overflow: 'hidden',
							textOverflow: 'ellipsis',
							cursor: 'pointer',
							transition: 'opacity 0.2s ease',
						}}
						onClick={handleMethodClick}
						onMouseEnter={(e) => {
							e.currentTarget.style.opacity = '0.7'
						}}
						onMouseLeave={(e) => {
							e.currentTarget.style.opacity = '1'
						}}
					>
						{entry.method}
					</Code>
				</Group>

				{entry.description && (
					<Text size="sm" c="dimmed">
						{entry.description}
					</Text>
				)}

				<Stack gap="xs">
					<Text size="sm" fw={600}>
						Input
					</Text>
					{entry.inputShapeLines.length > 0 ? (
						<>
							<Box
								p="xs"
								style={{
									backgroundColor: 'var(--mantine-color-dark-8)',
									borderRadius: 'var(--mantine-radius-sm)',
									fontFamily: 'var(--mantine-font-family-monospace)',
									fontSize: 'var(--mantine-font-size-xs)',
									maxWidth: '100%',
									overflow: 'hidden',
								}}
							>
								<Stack gap={2}>
									{entry.inputShapeLines.map((line, idx) => (
										<Text key={idx} size="xs" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
											{line}
										</Text>
									))}
								</Stack>
							</Box>
							<Group gap="xs">
								<Text
									size="xs"
									c="blue"
									style={{ cursor: 'pointer' }}
									onClick={toggleInputRaw}
									component="button"
									type="button"
								>
									{inputRawOpen ? 'Hide' : 'Show'} raw schema
								</Text>
							</Group>
							<Collapse in={inputRawOpen}>
								<Code block style={{ fontSize: 'var(--mantine-font-size-xs)' }}>
									{JSON.stringify(entry.inputSchema, null, 2)}
								</Code>
							</Collapse>
						</>
					) : (
						<>
							<Text size="xs" c="dimmed">
								Non-object schema. View raw schema.
							</Text>
							<Group gap="xs">
								<Text
									size="xs"
									c="blue"
									style={{ cursor: 'pointer' }}
									onClick={toggleInputRaw}
									component="button"
									type="button"
								>
									{inputRawOpen ? 'Hide' : 'Show'} raw schema
								</Text>
							</Group>
							<Collapse in={inputRawOpen}>
								<Code block style={{ fontSize: 'var(--mantine-font-size-xs)' }}>
									{JSON.stringify(entry.inputSchema, null, 2)}
								</Code>
							</Collapse>
						</>
					)}
				</Stack>

				<Stack gap="xs">
					<Text size="sm" fw={600}>
						Output
					</Text>
					{entry.outputShapeLines.length > 0 ? (
						<>
							<Box
								p="xs"
								style={{
									backgroundColor: 'var(--mantine-color-dark-8)',
									borderRadius: 'var(--mantine-radius-sm)',
									fontFamily: 'var(--mantine-font-family-monospace)',
									fontSize: 'var(--mantine-font-size-xs)',
									maxWidth: '100%',
									overflow: 'hidden',
								}}
							>
								<Stack gap={2}>
									{entry.outputShapeLines.map((line, idx) => (
										<Text key={idx} size="xs" style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
											{line}
										</Text>
									))}
								</Stack>
							</Box>
							<Group gap="xs">
								<Text
									size="xs"
									c="blue"
									style={{ cursor: 'pointer' }}
									onClick={toggleOutputRaw}
									component="button"
									type="button"
								>
									{outputRawOpen ? 'Hide' : 'Show'} raw schema
								</Text>
							</Group>
							<Collapse in={outputRawOpen}>
								<Code block style={{ fontSize: 'var(--mantine-font-size-xs)' }}>
									{JSON.stringify(entry.outputSchema, null, 2)}
								</Code>
							</Collapse>
						</>
					) : (
						<>
							<Text size="xs" c="dimmed">
								Non-object schema. View raw schema.
							</Text>
							<Group gap="xs">
								<Text
									size="xs"
									c="blue"
									style={{ cursor: 'pointer' }}
									onClick={toggleOutputRaw}
									component="button"
									type="button"
								>
									{outputRawOpen ? 'Hide' : 'Show'} raw schema
								</Text>
							</Group>
							<Collapse in={outputRawOpen}>
								<Code block style={{ fontSize: 'var(--mantine-font-size-xs)' }}>
									{JSON.stringify(entry.outputSchema, null, 2)}
								</Code>
							</Collapse>
						</>
					)}
				</Stack>
			</Stack>
		</Box>
	)
}
