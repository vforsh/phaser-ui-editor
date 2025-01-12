namespace TexturePacker {
	export interface Atlas {
		textures: Texture[]
		meta: Meta
	}

	export interface Texture {
		image: string
		format: string
		size: Size
		scale: number
		frames: Frame[]
	}

	export interface Size {
		w: number
		h: number
	}

	export interface Frame {
		filename: string
		rotated: boolean
		trimmed: boolean
		sourceSize: Size
		spriteSourceSize: SpriteSourceSize
		frame: FrameRect
		anchor: Anchor
		scale9Borders?: {
			x: number
			y: number
			w: number
			h: number
		}
	}

	export interface SpriteSourceSize {
		x: number
		y: number
		w: number
		h: number
	}

	export interface FrameRect {
		x: number
		y: number
		w: number
		h: number
	}

	export interface Anchor {
		x: number
		y: number
	}

	export interface Meta {
		app: string
		version: string
		smartupdate: string
	}
}
