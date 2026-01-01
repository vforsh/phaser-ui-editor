import { nanoid } from 'nanoid'
import { match } from 'ts-pattern'
import { Logger } from 'tslog'
import { GridLayoutComponent, GridLayoutComponentJson } from '../GridLayoutComponent'
import { HorizontalLayoutComponent, HorizontalLayoutComponentJson } from '../HorizontalLayoutComponent'
import { VerticalLayoutComponent, VerticalLayoutComponentJson } from '../VerticalLayoutComponent'
import { EditableComponent, EditableComponentJson, EditableComponentType } from './EditableComponent'

interface EditableComponentsFactoryOptions {
	logger: Logger<{}>
}

export class EditableComponentsFactory {
	private ids = new Set<string>()

	constructor(private readonly options: EditableComponentsFactoryOptions) {}

	private getOrCreateId(initialState?: EditableComponentJson): string {
		if (initialState?.id) {
			this.ids.add(initialState.id)
			return initialState.id
		}

		const id = this.createId()
		this.ids.add(id)
		return id
	}

	private createId(): string {
		const idLength = 10
		let id = nanoid(idLength)
		while (this.ids.has(id)) {
			id = nanoid(idLength)
		}
		this.ids.add(id)
		return id
	}

	public create(type: EditableComponentType): EditableComponent {
		return match(type)
			.with('localization', () => this.localization())
			.with('input', () => this.input())
			.with('horizontal-layout', () => this.horizontalLayout())
			.with('vertical-layout', () => this.verticalLayout())
			.with('grid-layout', () => this.gridLayout())
			.exhaustive()
	}

	private localization() {
		return null as any
	}

	private input() {
		return null as any
	}

	private horizontalLayout(initialState?: HorizontalLayoutComponentJson) {
		const id = this.getOrCreateId(initialState)
		const horizontalLayout = new HorizontalLayoutComponent(id, initialState)
		return horizontalLayout
	}

	private verticalLayout(initialState?: VerticalLayoutComponentJson) {
		const id = this.getOrCreateId(initialState)
		const verticalLayout = new VerticalLayoutComponent(id, initialState)
		return verticalLayout
	}

	private gridLayout(initialState?: GridLayoutComponentJson) {
		const id = this.getOrCreateId(initialState)
		const gridLayout = new GridLayoutComponent(id, initialState)
		return gridLayout
	}

	public fromJson(json: EditableComponentJson): EditableComponent {
		return match(json)
			.with({ type: 'horizontal-layout' }, (json) => this.horizontalLayout(json))
			.with({ type: 'vertical-layout' }, (json) => this.verticalLayout(json))
			.with({ type: 'grid-layout' }, (json) => this.gridLayout(json))
			.exhaustive()
	}

	public destroy(): void {
		this.ids.clear()
	}
}
