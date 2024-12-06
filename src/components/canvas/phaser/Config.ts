export type GameOrientation = 'portrait' | 'landscape'

export function getOrientation(width: number, height: number): GameOrientation {
	return width > height ? 'landscape' : 'portrait'
}

export class Config {
	public static readonly PLAY_SIZE = { WIDTH: 1000, HEIGHT: 750 }
	public static readonly EDITOR_SIZE = { WIDTH: 750, HEIGHT: 1000 }
	public static SOURCE_GAME_WIDTH = Config.PLAY_SIZE.WIDTH
	public static SOURCE_GAME_HEIGHT = Config.PLAY_SIZE.HEIGHT
	public static readonly ORIENTATION = getOrientation(Config.SOURCE_GAME_WIDTH, Config.SOURCE_GAME_HEIGHT)
	public static GAME_WIDTH = Config.SOURCE_GAME_WIDTH
	public static GAME_HEIGHT = Config.SOURCE_GAME_HEIGHT
	public static HALF_GAME_WIDTH = Config.GAME_WIDTH * 0.5
	public static HALF_GAME_HEIGHT = Config.GAME_HEIGHT * 0.5
	public static ASPECT_RATIO = Config.SOURCE_GAME_WIDTH / Config.SOURCE_GAME_HEIGHT
	public static ASSETS_SCALE = 1
}
