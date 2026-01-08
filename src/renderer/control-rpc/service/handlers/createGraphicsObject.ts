import type { createGraphicsObjectCommand } from '@tekton/control-rpc-contract/commands/createGraphicsObject'

import type { CommandHandler } from '../types'

import { createGraphicsAt } from './createGraphicsAt'

/**
 * @see {@link createGraphicsObjectCommand} for command definition
 */
export const createGraphicsObject: CommandHandler<'createGraphicsObject'> = (ctx) => createGraphicsAt(ctx)
