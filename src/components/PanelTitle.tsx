import { Box, Divider, Space, Title } from '@mantine/core'
import React from 'react'

interface PanelTitleProps {
	title: string
}

export const PanelTitle: React.FC<PanelTitleProps> = ({ title }) => {
	return (
		<Box w="100%">
			<Title order={5} ml="4px" align="left">
				{title}
			</Title>
			<Space h="xs" />
			<Divider />
		</Box>
	)
}
