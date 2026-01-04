import { ScrollArea, Stack, Text } from '@mantine/core'
import { useKeyboardNavigation } from '../../hooks/useKeyboardNavigation'
import type { RecentProject } from '../../types/project'
import { RecentProjectItem } from './RecentProjectItem'

interface RecentProjectsListProps {
	projects: RecentProject[]
	onSelectProject: (dir: string) => void
	onRemoveProject: (dir: string) => void
	checkProjectExists: (dir: string) => boolean
}

export function RecentProjectsList({
	projects,
	onSelectProject,
	onRemoveProject,
	checkProjectExists,
}: RecentProjectsListProps) {
	const { focusedIndex, getItemProps } = useKeyboardNavigation({
		items: projects,
		onSelect: (project) => onSelectProject(project.dir),
	})

	if (projects.length === 0) {
		return (
			<Text c="dimmed" ta="center" py="xl" size="sm">
				No recent projects
			</Text>
		)
	}

	return (
		<ScrollArea.Autosize mah={330}>
			<Stack gap="xs">
				{projects.map((project, index) => (
					<RecentProjectItem
						key={project.dir}
						{...getItemProps(index)}
						name={project.name}
						dir={project.dir}
						exists={checkProjectExists(project.dir)}
						onSelect={() => onSelectProject(project.dir)}
						onRemove={() => onRemoveProject(project.dir)}
						focused={focusedIndex === index}
					/>
				))}
			</Stack>
		</ScrollArea.Autosize>
	)
}
