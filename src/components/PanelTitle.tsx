import { Box, Title } from '@mantine/core'
import React from 'react'

interface PanelTitleProps {
	title: string
}

export const PanelTitle: React.FC<PanelTitleProps> = ({ title }) => {
	return (
		<Box w="100%">
			<Title order={5} ml="4px" ta="left">
				{title}
			</Title>
		</Box>
	)
}
