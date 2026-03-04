// ============================================================
// ETo Calculator — Hargreaves-Samani Method
// ============================================================
// Implements the simplified Hargreaves-Samani equation for
// Reference Evapotranspiration (ETo) estimation.
//
// ETo = 0.0023 × (Tmean + 17.8) × (Tmax − Tmin)^0.5 × Ra
//
// Ra (Extraterrestrial Radiation) is calculated from latitude
// and day of year using solar geometry (not a constant).
// ============================================================

/**
 * Calculate day of year (1–365/366)
 */
export function getDayOfYear(date: Date = new Date()): number {
  const start = new Date(date.getFullYear(), 0, 0);
  const diff = date.getTime() - start.getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

/**
 * Calculate Extraterrestrial Radiation (Ra) in mm/day
 * Based on FAO-56 equations (Allen et al., 1998)
 *
 * @param latitude - Latitude in decimal degrees (negative for South)
 * @param dayOfYear - Day of the year (1–365)
 * @returns Ra in mm/day equivalent (MJ/m²/day ÷ 2.45)
 */
export function calculateRa(latitude: number, dayOfYear: number): number {
  // Solar constant
  const Gsc = 0.0820; // MJ/m²/min

  // Convert latitude to radians
  const phi = (Math.PI / 180) * latitude;

  // Inverse relative distance Earth-Sun
  const dr = 1 + 0.033 * Math.cos((2 * Math.PI / 365) * dayOfYear);

  // Solar declination (radians)
  const delta = 0.409 * Math.sin((2 * Math.PI / 365) * dayOfYear - 1.39);

  // Sunset hour angle (radians)
  const tanProduct = -Math.tan(phi) * Math.tan(delta);
  // Clamp between -1 and 1 (polar regions)
  const ws = Math.acos(Math.max(-1, Math.min(1, tanProduct)));

  // Ra in MJ/m²/day
  const Ra_mj =
    ((24 * 60) / Math.PI) *
    Gsc *
    dr *
    (ws * Math.sin(phi) * Math.sin(delta) +
      Math.cos(phi) * Math.cos(delta) * Math.sin(ws));

  // Convert MJ/m²/day to mm/day (÷ 2.45 latent heat of vaporization)
  return Math.max(0, Ra_mj / 2.45);
}

/**
 * Calculate ETo using Hargreaves-Samani equation
 *
 * @param tMax - Maximum daily temperature (°C)
 * @param tMin - Minimum daily temperature (°C)
 * @param latitude - Latitude in decimal degrees
 * @param dayOfYear - Day of the year (1–365)
 * @returns ETo in mm/day
 */
export function calculateETo(
  tMax: number,
  tMin: number,
  latitude: number,
  dayOfYear: number
): number {
  const tMean = (tMax + tMin) / 2;
  const tRange = Math.max(0, tMax - tMin); // Avoid negative sqrt
  const Ra = calculateRa(latitude, dayOfYear);

  const eto = 0.0023 * (tMean + 17.8) * Math.sqrt(tRange) * Ra;
  return Math.max(0, eto);
}

/**
 * Calculate ETc from ETo and crop coefficient
 * @param eto - Reference evapotranspiration (mm/day)
 * @param kc - Crop coefficient (default 1.05 for adult coffee)
 */
export function calculateETc(eto: number, kc: number = 1.05): number {
  return eto * kc;
}
