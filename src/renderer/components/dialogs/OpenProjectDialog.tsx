import { backend } from '@backend/backend'
import { Modal, Stack, Text } from '@mantine/core'
import { useState } from 'react'

import { useRecentProjects } from '../../hooks/useRecentProjects'
import { ProjectPathInput } from './ProjectPathInput'
import { RecentProjectsList } from './RecentProjectsList'

interface OpenProjectDialogProps {
	opened: boolean
	onClose: () => void
	onOpenProject: (projectPath: string) => void
}

export default function OpenProjectDialog({ opened, onClose, onOpenProject }: OpenProjectDialogProps) {
	const [projectPath, setProjectPath] = useState('/Users/vlad/dev/papa-cherry-2')
	const { recentProjects, removeProject, checkProjectExists } = useRecentProjects()

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault()
		if (projectPath.trim()) {
			onOpenProject(projectPath.trim())
			onClose()
		}
	}

	const handleBrowse = async () => {
		const result = await backend.selectDirectory({
			title: 'Select project folder',
			defaultPath: projectPath || undefined,
		})

		if (!result.canceled && result.path) {
			setProjectPath(result.path)
		}
	}

	const handleRecentProjectClick = (path: string) => {
		onOpenProject(path)
		onClose()
	}

	return (
		<Modal opened={opened} onClose={onClose} title="Open Project" size="lg" centered>
			<form onSubmit={handleSubmit}>
				<Stack gap="md">
					<ProjectPathInput
						value={projectPath}
						onChange={setProjectPath}
						onSubmit={handleSubmit}
						onBrowse={handleBrowse}
						autoFocus={recentProjects.length === 0}
					/>

					<div
						style={{
							height: 1,
							background: 'var(--mantine-color-dark-4)',
							margin: '0.5rem 0',
						}}
					/>

					<Stack gap="xs">
						<Text size="sm" fw={500}>
							Recent Projects
						</Text>
						<RecentProjectsList
							projects={recentProjects}
							onSelectProject={handleRecentProjectClick}
							onRemoveProject={removeProject}
							checkProjectExists={checkProjectExists}
						/>
					</Stack>
				</Stack>
			</form>
		</Modal>
	)
}
