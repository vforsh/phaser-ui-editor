import assert from 'node:assert/strict'
import path from 'node:path'

const isAbsolutePath = (value) => path.isAbsolute(value) || path.win32.isAbsolute(value)
const normalizePath = (value) => (path.win32.isAbsolute(value) ? path.win32.normalize(value) : path.normalize(value))

const cases = [
	{ input: '/Users/test/project', isAbs: true, normalized: '/Users/test/project' },
	{ input: '/Users/test/../project', isAbs: true, normalized: '/Users/project' },
	{ input: 'C:\\Users\\test\\project', isAbs: true, normalized: 'C:\\Users\\test\\project' },
	{ input: 'C:/Users/test/../project', isAbs: true, normalized: 'C:\\Users\\project' },
	{ input: './relative/path', isAbs: false, normalized: path.normalize('./relative/path') },
]

cases.forEach(({ input, isAbs, normalized }) => {
	assert.equal(isAbsolutePath(input), isAbs, `isAbsolutePath(${input})`)
	assert.equal(normalizePath(input), normalized, `normalizePath(${input})`)
})

console.log('path-matrix: ok')
