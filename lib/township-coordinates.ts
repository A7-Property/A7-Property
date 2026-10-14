export interface TownshipCoord {
  lat: number;
  lng: number;
  spread: number;
}

export const townshipCoordinates: Record<string, TownshipCoord> = {
  Bahan: { lat: 16.8367, lng: 96.1797, spread: 0.012 },
  Kamayut: { lat: 16.8258, lng: 96.1282, spread: 0.01 },
  Hlaing: { lat: 16.8632, lng: 96.1156, spread: 0.014 },
  Yankin: { lat: 16.8494, lng: 96.2056, spread: 0.011 },
  Sanchaung: { lat: 16.8153, lng: 96.1356, spread: 0.008 },
  Dagon: { lat: 16.7886, lng: 96.1756, spread: 0.012 },
  Mayangone: { lat: 16.8658, lng: 96.1033, spread: 0.013 },
  Chanmyathazi: { lat: 21.9417, lng: 96.0786, spread: 0.015 },
  Aungmyaythazan: { lat: 21.9583, lng: 96.0917, spread: 0.012 },
};

export function getCoordinatesForProperty(index: number, township: string): { lat: number; lng: number } {
  const base = townshipCoordinates[township];
  if (!base) return { lat: 16.8409, lng: 96.1735 };
  const seed = index * 0.6180339887;
  const angle = seed * Math.PI * 2;
  const radius = base.spread * (0.3 + 0.7 * ((seed % 1)));
  return {
    lat: base.lat + radius * Math.sin(angle),
    lng: base.lng + radius * Math.cos(angle),
  };
}