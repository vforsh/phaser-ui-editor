import { match } from 'ts-pattern'
import { Logger } from 'tslog'
import { EditableComponent, EditableComponentJson, EditableComponentType } from './EditableComponent'
import { EditableGridLayoutComponent } from '../EditableGridLayoutComponent'
import { EditableHorizontalLayoutComponent } from '../EditableHorizontalLayoutComponent'
import { EditablePinnerComponent } from '../EditablePinnerComponent'
import { EditableVerticalLayoutComponent } from '../EditableVerticalLayoutComponent'

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
		return new EditableHorizontalLayoutComponent()
	}

	private verticalLayout() {
		return new EditableVerticalLayoutComponent()
	}

	private gridLayout() {
		return new EditableGridLayoutComponent()
	}

	public fromJson(json: EditableComponentJson): EditableComponent {
		// TODO components - implement create from json

		// @ts-expect-error
		return null
	}
}
