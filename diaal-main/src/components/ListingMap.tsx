import React, { useEffect, useMemo } from 'react';
import L from 'leaflet';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  icon: string;
  priceLabel: string;
}

export interface MapFocus {
  center: [number, number];
  zoom: number;
}

interface ListingMapProps {
  pins: MapPin[];
  selectedId: string | null;
  satellite: boolean;
  onSelectPin: (id: string) => void;
  onMapReady: (map: L.Map) => void;
  /** When set (e.g. a city filter is chosen), the map flies here and overrides
   *  the automatic fit-to-pins behaviour. */
  focus?: MapFocus | null;
}

// Mogadishu is the default market; used when nothing matches the filters.
const DEFAULT_CENTER: [number, number] = [2.0469, 45.3182];
const DEFAULT_ZOOM = 12;

const OSM_TILES = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';
const SATELLITE_TILES =
  'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}';
const SATELLITE_ATTRIBUTION = 'Tiles &copy; Esri &mdash; Source: Esri, Maxar, Earthstar Geographics';

/** Imperative behaviours: expose the map, fit results, follow the selected pin,
 *  and honour an explicit focus target (e.g. a chosen city). */
function MapController({
  pins,
  selectedId,
  focus,
  onMapReady,
}: {
  pins: MapPin[];
  selectedId: string | null;
  focus?: MapFocus | null;
  onMapReady: (map: L.Map) => void;
}) {
  const map = useMap();

  useEffect(() => {
    onMapReady(map);
  }, [map, onMapReady]);

  const focusKey = focus ? `${focus.center[0]},${focus.center[1]}:${focus.zoom}` : '';

  // Fly to an explicitly requested location (city filter) — this takes priority
  // over the automatic fit-to-pins below.
  useEffect(() => {
    if (!focus) return;
    map.flyTo(focus.center, focus.zoom, { duration: 0.8 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [focusKey, map]);

  // Fit the viewport to the result set whenever the matching listings change.
  useEffect(() => {
    if (focus) return;
    if (pins.length === 0) {
      map.setView(DEFAULT_CENTER, DEFAULT_ZOOM);
      return;
    }
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 13);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [60, 60], maxZoom: 14 });
  }, [pins, map, focus]);

  // Follow the active pin when the user selects or cycles through results.
  useEffect(() => {
    const pin = pins.find((p) => p.id === selectedId);
    if (!pin) return;
    map.flyTo([pin.lat, pin.lng], Math.max(map.getZoom(), 13), { duration: 0.6 });
  }, [selectedId, pins, map]);

  return null;
}

export const ListingMap: React.FC<ListingMapProps> = ({
  pins,
  selectedId,
  satellite,
  onSelectPin,
  onMapReady,
  focus,
}) => {
  const icons = useMemo(() => {
    const cache = new Map<string, L.DivIcon>();
    return {
      get: (pin: MapPin, selected: boolean): L.DivIcon => {
        const key = `${pin.id}:${selected}`;
        let icon = cache.get(key);
        if (!icon) {
          const tone = selected
            ? 'bg-secondary text-on-secondary ring-4 ring-secondary/30'
            : 'bg-primary text-on-primary';
          icon = L.divIcon({
            className: 'listing-map-pin',
            html: `<div style="transform:translate(-50%,-100%)" class="flex items-center gap-1 px-3 py-1.5 rounded-full shadow-lg font-bold text-xs whitespace-nowrap ${tone}"><span class="material-symbols-outlined text-[13px]">${pin.icon}</span><span>${pin.priceLabel}</span></div><div style="transform:translate(-50%,-50%) rotate(45deg)" class="w-2 h-2 shadow ${selected ? 'bg-secondary' : 'bg-primary'}"></div>`,
            iconSize: [0, 0],
            iconAnchor: [0, 0],
          });
          cache.set(key, icon);
        }
        return icon;
      },
    };
  }, []);

  return (
    <MapContainer
      center={DEFAULT_CENTER}
      zoom={DEFAULT_ZOOM}
      zoomControl={false}
      className="h-full w-full"
      attributionControl
    >
      <TileLayer
        key={satellite ? 'satellite' : 'streets'}
        url={satellite ? SATELLITE_TILES : OSM_TILES}
        attribution={satellite ? SATELLITE_ATTRIBUTION : OSM_ATTRIBUTION}
        maxZoom={19}
      />
      <MapController pins={pins} selectedId={selectedId} focus={focus} onMapReady={onMapReady} />
      {pins.map((pin) => (
        <Marker
          key={pin.id}
          position={[pin.lat, pin.lng]}
          icon={icons.get(pin, pin.id === selectedId)}
          eventHandlers={{ click: () => onSelectPin(pin.id) }}
        />
      ))}
    </MapContainer>
  );
};
