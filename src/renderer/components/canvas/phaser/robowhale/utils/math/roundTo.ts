/**
 * Round a value to the given precision.
 *
 * For example:
 *
 * ```javascript
 * roundTo(123.456, 0) = 123
 * roundTo(123.456, 1) = 120
 * roundTo(123.456, 2) = 100
 * ```
 *
 * To round the decimal, i.e. to round to precision, pass in a negative `place`:
 *
 * ```javascript
 * roundTo(123.456789, 0) = 123
 * roundTo(123.456789, -1) = 123.5
 * roundTo(123.456789, -2) = 123.46
 * roundTo(123.456789, -3) = 123.457
 * ```
 *
 * @param value - The value to round.
 * @param [place=0] - The place to round to. Positive to round the units, negative to round the decimal.
 * @param [base=10] - The base to round in. Default is 10 for decimal.
 *
 * @return {number} The rounded value.
 */
export function roundTo(value: number, place = 0, base = 10): number {
	const p = Math.pow(base, -place)

	return Math.round(value * p) / p
}
