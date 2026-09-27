import { MakeTime, Observer, RotateVector, Rotation_EQJ_HOR, Vector } from 'astronomy-engine'

export const SHENZHEN = { latitude: 22.5431, longitude: 114.0579, timezone: 'Asia/Shanghai' }
const observer = new Observer(SHENZHEN.latitude, SHENZHEN.longitude, 0)
const epoch = MakeTime(new Date('2000-01-01T12:00:00Z'))
const radians = Math.PI / 180

/** Catalog right ascension and declination are J2000, both in degrees. */
export function equatorialVector(ra: number, dec: number): Vector {
  const latitude = dec * radians
  const longitude = ra * radians
  return new Vector(Math.cos(latitude) * Math.cos(longitude), Math.cos(latitude) * Math.sin(longitude), Math.sin(latitude), epoch)
}

export interface SkyPoint { x: number; y: number; altitude: number }

/** Zenith-centered stereographic view: north up, east left, no below-horizon stars. */
export function createSkyProjection(date: Date, width: number, height: number) {
  // Astronomy Engine includes precession/nutation from J2000 and Earth rotation.
  const rotation = Rotation_EQJ_HOR(date, observer)
  const radius = Math.hypot(width, height) * .52
  return (vector: Vector): SkyPoint | null => {
    const horizontal = RotateVector(rotation, vector)
    const length = horizontal.Length()
    const up = horizontal.z / length
    if (up <= 0) return null
    const scale = radius / (1 + up)
    return {
      x: width / 2 + (horizontal.y / length) * scale,
      y: height / 2 - (horizontal.x / length) * scale,
      altitude: Math.asin(Math.min(1, up)) / radians
    }
  }
}

/** Sample the short great-circle arc, not a line across RA's +/-180 degree seam. */
export function arcBetween(a: Vector, b: Vector, steps = 8): Vector[] {
  return Array.from({ length: steps + 1 }, (_, index) => {
    const t = index / steps
    const x = a.x * (1 - t) + b.x * t
    const y = a.y * (1 - t) + b.y * t
    const z = a.z * (1 - t) + b.z * t
    const norm = Math.hypot(x, y, z)
    return new Vector(x / norm, y / norm, z / norm, epoch)
  })
}
