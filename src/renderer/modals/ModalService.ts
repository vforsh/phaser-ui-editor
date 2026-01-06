import { proxy } from 'valtio/vanilla'

import type { AppCommandsEmitter } from '../AppCommands'

import {
	areModalParamsEqual,
	getDefaultModalParams,
	isModalId,
	normalizeModalParams,
	type ModalId,
	type ModalListResult,
	type ModalParamsById,
	type ModalStateSummary,
	MODAL_IDS,
} from './ModalIds'

type ActiveModal = {
	id: ModalId
	params: ModalParamsById[ModalId]
}

type ModalStore = {
	active: ActiveModal | null
}

export class ModalService {
	public readonly state = proxy<ModalStore>({
		active: null,
	})

	constructor(private readonly appCommands: AppCommandsEmitter) {
		this.registerHandlers()
	}

	public open<T extends ModalId>(id: T, params?: ModalParamsById[T]): void {
		const nextParams = params ?? getDefaultModalParams(id)
		const active = this.state.active

		if (active?.id === id && areModalParamsEqual(id, active.params as ModalParamsById[T], nextParams)) {
			return
		}

		this.state.active = { id, params: nextParams }
	}

	public close(id: ModalId): void {
		if (this.state.active?.id !== id) {
			return
		}

		this.state.active = null
	}

	public closeAll(): void {
		if (!this.state.active) {
			return
		}

		this.state.active = null
	}

	public toggle<T extends ModalId>(id: T, params?: ModalParamsById[T]): void {
		if (this.isOpen(id)) {
			this.close(id)
			return
		}

		this.open(id, params)
	}

	public isOpen(id: ModalId): boolean {
		return this.state.active?.id === id
	}

	public getParams<T extends ModalId>(id: T): ModalParamsById[T] {
		if (this.state.active?.id === id) {
			return this.state.active.params as ModalParamsById[T]
		}

		return getDefaultModalParams(id)
	}

	public getState(): ModalStateSummary {
		return { activeModalId: this.state.active?.id ?? null }
	}

	public list(): ModalListResult {
		const activeModalId = this.state.active?.id ?? null

		return {
			activeModalId,
			modals: MODAL_IDS.map((id) => ({
				id,
				isOpen: id === activeModalId,
			})),
		}
	}

	private registerHandlers(): void {
		this.appCommands.on('open-modal', (payload) => {
			if (!payload || typeof payload !== 'object') {
				throw new Error('open-modal requires a payload object')
			}

			const { id, params } = payload as { id?: unknown; params?: unknown }

			if (!isModalId(id)) {
				throw new Error('open-modal requires a valid modal id')
			}

			const nextParams = normalizeModalParams(id, params)
			this.open(id, nextParams)
		})

		this.appCommands.on('close-modal', (payload) => {
			if (!payload || typeof payload !== 'object') {
				throw new Error('close-modal requires a payload object')
			}

			const { id } = payload as { id?: unknown }

			if (!isModalId(id)) {
				throw new Error('close-modal requires a valid modal id')
			}

			this.close(id)
		})

		this.appCommands.on('close-all-modals', () => {
			this.closeAll()
		})

		this.appCommands.on('list-modals', () => this.list())
	}
}
