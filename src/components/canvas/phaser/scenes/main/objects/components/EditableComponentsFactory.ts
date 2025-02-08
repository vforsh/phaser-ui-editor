import { match } from 'ts-pattern'
import { Logger } from 'tslog'
import { EditableComponent, EditableComponentJson, EditableComponentType } from './EditableComponent'
import { EditablePinnerComponent } from './EditablePinnerComponent'

interface EditableComponentsFactoryOptions {
	logger: Logger<{}>
}

export class EditableComponentsFactory {
	constructor(private readonly options: EditableComponentsFactoryOptions) {}

	public create(type: EditableComponentType): EditableComponent {
		return match(type)
			.with('pinner', () => this.pinner())
			.with('localization', () => this.localization())
			.with('input', () => this.input())
			.with('horizontal-layout', () => this.horizontalLayout())
			.with('vertical-layout', () => this.verticalLayout())
			.with('grid-layout', () => this.gridLayout())
			.exhaustive()
	}

	private pinner() {
		const pinner = new EditablePinnerComponent()
		return pinner
	}

	private localization() {
		return null as any
	}

	private input() {
		return null as any
	}

	private horizontalLayout() {
		return null as any
	}

	private verticalLayout() {
		return null as any
	}

	private gridLayout() {
		return null as any
	}

	public fromJson(json: EditableComponentJson): EditableComponent {
		// TODO implement

		// @ts-expect-error
		return null
	}
}
