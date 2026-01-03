// time units in descending order of precision
const TIME_UNITS = ['day', 'hour', 'minute', 'second'] as const

export type TimeUnit = (typeof TIME_UNITS)[number]

/**
 * Форматирование длительности (отрезка времени) в человекочитаемую строку.
 * ВАЖНО: этот метод предназначен для форматирования duration (продолжительности), а не конкретной даты или таймстампа.
 *
 * @param ms длительность в миллисекундах для форматирования
 * @param [precision='second'] точность отображения времени - показывает все единицы до указанной включительно
 * @param [locales] кастомный объект с локализованными строками
 *
 * @example
 * formatTime(5000) // '5s'
 * formatTime(65000) // '1m 05s'
 * formatTime(3665000) // '1h 01m 05s'
 * formatTime(90065000) // '1d 01h 01m 05s'
 *
 * @example
 * // С указанием точности
 * formatTime(90065000, 'hour') // '1d 01h'
 * formatTime(90065000, 'minute') // '1d 01h 01m'
 *
 * @example
 * // С кастомными локалями
 * const locales = { day: ' день', hour: ' час', minute: ' мин', second: ' сек' }
 * formatTime(90065000, 'second', locales) // '1 день 01 час 01 мин 05 сек'
 */
export function formatTime(ms: number, precision: TimeUnit = 'second', locales?: Record<TimeUnit, string>): string {
	let result = ''

	const totalSeconds = Math.floor(ms / 1000)
	const seconds = totalSeconds % 60
	const minutes = Math.floor((totalSeconds % 3600) / 60)
	const hours = Math.floor((totalSeconds % (3600 * 24)) / (60 * 60))
	const days = Math.floor(totalSeconds / (60 * 60 * 24))

	if (days > 0) {
		result = formatTimeUnit(days, 'day', false, locales)
		if (hours && shouldShowUnit('hour', precision)) {
			result += ' ' + formatTimeUnit(hours, 'hour', true, locales)
		}
		if (minutes && shouldShowUnit('minute', precision) && precision !== 'hour') {
			result += ' ' + formatTimeUnit(minutes, 'minute', true, locales)
		}
		if (seconds && shouldShowUnit('second', precision) && precision === 'second') {
			result += ' ' + formatTimeUnit(seconds, 'second', true, locales)
		}
	} else if (hours > 0) {
		result = formatTimeUnit(hours, 'hour', false, locales)
		if (minutes && shouldShowUnit('minute', precision)) {
			result += ' ' + formatTimeUnit(minutes, 'minute', true, locales)
		}
		if (seconds && shouldShowUnit('second', precision) && precision === 'second') {
			result += ' ' + formatTimeUnit(seconds, 'second', true, locales)
		}
	} else if (minutes > 0) {
		result = formatTimeUnit(minutes, 'minute', false, locales)
		if (seconds && shouldShowUnit('second', precision)) {
			result += ' ' + formatTimeUnit(seconds, 'second', true, locales)
		}
	} else {
		result = formatTimeUnit(seconds, 'second', false, locales)
	}

	return result
}

/**
 * Определяет, должна ли показываться указанная единица времени в зависимости от заданной точности
 */
function shouldShowUnit(unit: TimeUnit, precision: TimeUnit): boolean {
	const unitIndex = TIME_UNITS.indexOf(unit)
	const precisionIndex = TIME_UNITS.indexOf(precision)
	return unitIndex <= precisionIndex
}

/**
 * Метод форматирует единицу времени в соответствии с заданными параметрами
 *
 * @param value значение форматируемой единицы времени
 * @param type тип форматируемой единицы времени
 * @param [useLeadingZero=false] добавлять ли 0 в начале чисел из одной цифры
 * @param [locales] кастомный объект с локализованными строками
 */
function formatTimeUnit(value: number, type: TimeUnit, useLeadingZero = false, locales?: Record<TimeUnit, string>): string {
	return (useLeadingZero ? padWithZero(value) : value) + (locales ? locales[type] : translateTimeUnit(type))
}

function translateTimeUnit(timeUnit: TimeUnit) {
	switch (timeUnit) {
		case 'day':
			return 'd'
		case 'hour':
			return 'h'
		case 'minute':
			return 'm'
		case 'second':
			return 's'
		default:
			const _exhaustiveCheck: never = timeUnit
			throw new Error(`Unhandled time unit: ${_exhaustiveCheck}`)
	}
}

/**
 * Метод добавляет 0 в начале чисел из одной цифры
 * напр.: (55) -> "55", но (4) -> "04"
 */
function padWithZero(value: number): string {
	return (value < 10 ? '0' : '') + value
}
