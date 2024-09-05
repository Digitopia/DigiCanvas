export const mapNumber = (number, inMin, inMax, outMin, outMax) =>
  ((number - inMin) * (outMax - outMin)) / (inMax - inMin) + outMin

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function randomFloat(min, max) {
  return Math.random() * (max - min) + min
}

export function randomInt(min, max) {
  return Math.round(randomFloat(min, max))
}

// taken from https://stackoverflow.com/questions/25582882/javascript-math-random-normal-distribution-gaussian-b  ell-curve
export function randomGaussian(mean = 0, stdev = 1) {
  const u = 1 - Math.random() // Converting [0,1) to (0,1]
  const v = Math.random()
  const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v)
  // Transform to the desired mean and standard deviation:
  return z * stdev + mean
}

// taken from p5.js (with help from ChatGPT, so here be dragons)
export function lerpColor(c1, c2, amt) {
  let r1, g1, b1, a1
  let r2, g2, b2, a2
  let r3, g3, b3, a3

  r1 = c1[0]
  g1 = c1[1]
  b1 = c1[2]
  a1 = c1[3]

  r2 = c2[0]
  g2 = c2[1]
  b2 = c2[2]
  a2 = c2[3]

  r3 = r1 + (r2 - r1) * amt
  g3 = g1 + (g2 - g1) * amt
  b3 = b1 + (b2 - b1) * amt
  a3 = a1 + (a2 - a1) * amt

  return [r3, g3, b3, a3]
}

export function mapExp(val, min, max) {
  const norm = mapNumber(val, min, max, 0, 1)
  const exp = norm ** 2
  const ret = +mapNumber(exp, 0, 1, min, max).toFixed(2)
  return ret
}

export function mapLog(val, min, max) {
  if (val <= 0) return min // Handle zero and negative inputs
  const minLog = Math.log(min)
  const maxLog = Math.log(max)
  const scale = (maxLog - minLog) / (max - min)
  return Math.exp(minLog + scale * (val - min))
}
