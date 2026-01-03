export type ParserOptions = {}

/**
 * Parses Phaser game objects to and from JSON
 */
export class Parser {
	constructor(private options: ParserOptions) {}

	public toJson(item: Phaser.GameObjects.GameObject): string {
		return ''
	}

	// TODO return Result
	public fromJSON(json: string): Phaser.GameObjects.GameObject | null {
		return null
	}
}
