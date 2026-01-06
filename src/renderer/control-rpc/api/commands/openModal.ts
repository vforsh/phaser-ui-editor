import { z } from 'zod'

import { CONTROL_RPC_GROUP_IDS } from '../../../modals/ModalIds'
import { settingsSectionIds } from '../../../settings/EditorSettings'
import { CommandDefinition } from '../ControlApi'
import { successSchema } from '../shared-schemas'

const settingsSectionIdSchema = z.enum(settingsSectionIds)
const controlRpcGroupSchema = z.enum(CONTROL_RPC_GROUP_IDS)

const settingsModalParamsSchema = z
	.object({
		sectionId: settingsSectionIdSchema.describe('Active settings section id'),
	})
	.strict()

const controlRpcCommandsParamsSchema = z
	.object({
		group: controlRpcGroupSchema.describe('Active control RPC command group'),
	})
	.strict()

export const openModalCommand = {
	group: 'misc',
	description: 'Opens a global renderer modal by id, closing any currently open modal.',
	input: z
		.discriminatedUnion('id', [
			z
				.object({
					id: z.literal('settings'),
					params: settingsModalParamsSchema.optional(),
				})
				.strict(),
			z
				.object({
					id: z.literal('controlRpcCommands'),
					params: controlRpcCommandsParamsSchema.optional(),
				})
				.strict(),
		])
		.describe('Input parameters for opening a global modal'),
	output: successSchema.describe('Success response indicating the modal was opened'),
} satisfies CommandDefinition

export type OpenModalInput = z.input<typeof openModalCommand.input>
