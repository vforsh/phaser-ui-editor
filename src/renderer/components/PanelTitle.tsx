import { Box, Title, UnstyledButton } from '@mantine/core'
import React from 'react'
import styles from './PanelTitle.module.css'

interface PanelTitleProps {
	title: string
	onClick?: () => void
}

export const PanelTitle: React.FC<PanelTitleProps> = ({ title, onClick }) => {
	let content = (
		<Title order={5} ml="4px" ta="left">
			{title}
		</Title>
	)

	if (onClick) {
		content = (
			<UnstyledButton className={styles.titleButton} onClick={onClick}>
				{content}
			</UnstyledButton>
		)
	}

	return (
		<Box w="100%" style={{ display: 'flex', alignItems: 'center' }}>
			{content}
		</Box>
	)
}
