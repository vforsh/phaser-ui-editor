import process from 'node:process'
import { table } from 'table'

export function printTable(rows: any[][]): void {
	if (rows.length === 0) {
		return
	}
	process.stdout.write(table(rows))
}
