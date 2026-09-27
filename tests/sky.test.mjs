import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { Observer, MakeTime, Rotation_HOR_EQJ, RotateVector, Vector } from 'astronomy-engine'
import { SHENZHEN, equatorialVector, createSkyProjection, arcBetween } from '../docs/.vitepress/sky/coordinates.ts'

const catalog = JSON.parse(readFileSync(new URL('../docs/.vitepress/sky/stars.json', import.meta.url)))
const date = new Date('2026-09-26T12:00:00Z')
const observer = new Observer(SHENZHEN.latitude, SHENZHEN.longitude, 0)

test('star catalog retains valid coordinates, magnitudes and unique HIP identifiers', () => {
  assert.equal(catalog.length, 5044)
  assert.equal(new Set(catalog.map(row => row[0])).size, 5044)
  for (const [id, ra, dec, mag] of catalog) {
    assert(Number.isInteger(id) && Math.abs(ra) <= 180 && Math.abs(dec) <= 90 && mag <= 6)
  }
  assert(catalog.find(row => row[0] === 32349)[3] < -1) // Sirius, brightest night-sky star
})

test('zenith is centered, east is left, north is up, nadir is invisible', () => {
  const project = createSkyProjection(date, 1200, 800)
  const rotation = Rotation_HOR_EQJ(date, observer)
  const toEquatorial = (x, y, z) => RotateVector(rotation, new Vector(x, y, z, MakeTime(date)))
  const zenith = project(toEquatorial(0, 0, 1))
  assert(Math.abs(zenith.x - 600) < 1e-8 && Math.abs(zenith.y - 400) < 1e-8)
  const north = project(toEquatorial(Math.SQRT1_2, 0, Math.SQRT1_2))
  assert(north.y < 400 && Math.abs(north.x - 600) < 1e-8)
  const east = project(toEquatorial(0, -Math.SQRT1_2, Math.SQRT1_2))
  assert(east.x < 600 && Math.abs(east.y - 400) < 1e-8)
  assert.equal(project(toEquatorial(0, 0, -1)), null)
})

test('Polaris stays near Shenzhen latitude throughout a day; south pole stays hidden', () => {
  const [, ra, dec] = catalog.find(row => row[0] === 11767)
  for (let hour = 0; hour < 24; hour += 3) {
    const project = createSkyProjection(new Date(date.getTime() + hour * 3600000), 1200, 800)
    const polaris = project(equatorialVector(ra, dec))
    assert(polaris && Math.abs(polaris.altitude - SHENZHEN.latitude) < 1)
    assert.equal(project(equatorialVector(0, -90)), null)
  }
})

test('same UTC instant is timezone independent; the real sky changes after six hours', () => {
  const vega = equatorialVector(279.2347, 38.7837)
  const a = createSkyProjection(date, 1200, 800)(vega)
  const b = createSkyProjection(new Date('2026-09-26T20:00:00+08:00'), 1200, 800)(vega)
  const later = createSkyProjection(new Date('2026-09-26T18:00:00Z'), 1200, 800)(vega)
  assert.deepEqual(a, b)
  assert(a)
  assert(!later || Math.hypot(a.x - later.x, a.y - later.y) > 200)
})

test('constellation segments cross the RA seam by the short spherical arc', () => {
  const arc = arcBetween(equatorialVector(179, 20), equatorialVector(-179, 20))
  for (const point of arc) {
    assert(Math.abs(point.Length() - 1) < 1e-12)
    assert(point.x < -.9)
  }
})
