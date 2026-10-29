// Approximate city-centre coordinates keyed by lowercase city name, used to
// fly/zoom the map when a city filter pill is selected. Names must match the
// `cities` arrays in ./countries.ts.
export const CITY_COORDINATES: Record<string, [number, number]> = {
  // Somalia
  mogadishu: [2.0469, 45.3182],
  hargeisa: [9.5624, 44.077],
  garowe: [9.3596, 49.5149],
  kismayo: [0.3581, 42.5454],
  bosaso: [11.2842, 49.1816],
  // Kenya
  nairobi: [-1.2921, 36.8219],
  mombasa: [-4.0435, 39.6682],
  kisumu: [-0.0917, 34.768],
  nakuru: [-0.3031, 36.08],
  // United Arab Emirates
  dubai: [25.2048, 55.2708],
  'abu dhabi': [24.4539, 54.3773],
  sharjah: [25.3463, 55.4209],
  // United Kingdom
  london: [51.5074, -0.1278],
  birmingham: [52.4862, -1.8904],
  manchester: [53.4808, -2.2426],
  // United States
  minneapolis: [44.9778, -93.265],
  columbus: [39.9612, -82.9988],
  seattle: [47.6062, -122.3321],
  // Turkey
  istanbul: [41.0082, 28.9784],
  ankara: [39.9334, 32.8597],
  antalya: [36.8969, 30.7133],
};
