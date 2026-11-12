import React, { useMemo, useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import MarkerClusterGroup from 'react-leaflet-markercluster';
import 'leaflet.markercluster/dist/MarkerCluster.css';
import 'leaflet.markercluster/dist/MarkerCluster.Default.css';
import { PropertyListing } from '../types';
import L from 'leaflet';

interface MapViewProps {
  listings: PropertyListing[];
  selectedListingId: string | null;
  onSelectListing: (id: string) => void;
  formatPrice: (amount: number, compact?: boolean) => string;
  selectedCity?: string;
  selectedCountryCode?: string;
  height?: string;
}

// City coordinates for dynamic flyTo
const CITY_COORDINATES: Record<string, { lat: number; lng: number; zoom: number; label: string }> = {
  all: { lat: 2.0469, lng: 45.3182, zoom: 13, label: 'Mogadishu Central' },
  mogadishu: { lat: 2.0469, lng: 45.3182, zoom: 13, label: 'Mogadishu (Banaadir)' },
  hargeisa: { lat: 9.5600, lng: 44.0650, zoom: 13, label: 'Hargeisa (Maroodi Jeex)' },
  garowe: { lat: 8.4064, lng: 48.4845, zoom: 13, label: 'Garowe (Nugaal)' },
  kismayo: { lat: -0.3582, lng: 42.5454, zoom: 13, label: 'Kismayo (Jubaland)' },
  bosaso: { lat: 11.2842, lng: 49.1816, zoom: 13, label: 'Bosaso (Bari)' },
  nairobi: { lat: -1.286389, lng: 36.817223, zoom: 12, label: 'Nairobi' },
  mombasa: { lat: -4.0435, lng: 39.6682, zoom: 12, label: 'Mombasa' },
  dubai: { lat: 25.2048, lng: 55.2708, zoom: 12, label: 'Dubai' },
  london: { lat: 51.5074, lng: -0.1278, zoom: 12, label: 'London' },
  istanbul: { lat: 41.0082, lng: 28.9784, zoom: 12, label: 'Istanbul' },
};

const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number; zoom: number }> = {
  SO: { lat: 2.0469, lng: 45.3182, zoom: 12 },
  KE: { lat: -1.286389, lng: 36.817223, zoom: 12 },
  AE: { lat: 25.2048, lng: 55.2708, zoom: 12 },
  GB: { lat: 51.5074, lng: -0.1278, zoom: 11 },
  TR: { lat: 41.0082, lng: 28.9784, zoom: 11 },
  US: { lat: 44.9778, lng: -93.2650, zoom: 11 },
};

// Marker cluster spiderfy on click
function SpiderfyOnClick() {
  const map = useMap();
  React.useEffect(() => {
    map.on('spiderfied', () => {
      // No-op hook for future analytics
    });
  }, [map]);
  return null;
}

// Icon cache per category + selection state
const ICON_CACHE = new Map<string, L.DivIcon>();

function getCategoryIcon(category: string): string {
  switch (category) {
    case 'land': return 'landscape';
    case 'car': return 'directions_car';
    case 'commercial': return 'apartment';
    case 'rental': return 'apartment';
    default: return 'home';
  }
}

function getPinIcon(selected: boolean, category: string): L.DivIcon {
  const key = `${category}:${selected}`;
  let icon = ICON_CACHE.get(key);
  if (!icon) {
    const tone = selected
      ? 'bg-[#003527] text-white ring-4 ring-[#fe932c]/50 shadow-xl'
      : 'bg-primary text-on-primary shadow-md';
    const iconName = getCategoryIcon(category);
    const html = `
      <div style="transform:translate(-50%,-100%)" class="flex items-center gap-1 px-3 py-1.5 rounded-full font-bold text-xs whitespace-nowrap ${tone}">
        <span class="material-symbols-outlined text-[13px]">${iconName}</span>
      </div>
      <div style="transform:translate(-50%,-50%) rotate(45deg)" class="w-2 h-2 shadow ${selected ? 'bg-[#003527]' : 'bg-primary'}"></div>
    `;
    icon = L.divIcon({
      className: 'listing-map-pin',
      html,
      iconSize: [0, 0],
      iconAnchor: [0, 0],
    });
    ICON_CACHE.set(key, icon);
  }
  return icon;
}

// Map controller: fit bounds, handle focus, handle spiderfy
function MapController({
  pins,
  selectedId,
  focus,
  listings,
}: {
  pins: { id: string; lat: number; lng: number; category: string }[];
  selectedId: string | null;
  focus?: { center: [number, number]; zoom: number } | null;
  listings: PropertyListing[];
}) {
  const map = useMap();

  // Fit bounds to pins when they change
  React.useEffect(() => {
    if (focus) return;
    if (pins.length === 0) {
      map.setView([2.0469, 45.3182], 12);
      return;
    }
    if (pins.length === 1) {
      map.setView([pins[0].lat, pins[0].lng], 13);
      return;
    }
    const bounds = L.latLngBounds(pins.map((p) => [p.lat, p.lng] as [number, number]));
    map.fitBounds(bounds, { padding: [70, 90], maxZoom: 14 });
  }, [pins, map, focus]);

  // Fly to focus (city/country filter)
  const focusKey = focus ? `${focus.center[0]},${focus.center[1]}:${focus.zoom}` : '';
  React.useEffect(() => {
    if (!focus) return;
    map.flyTo(focus.center, focus.zoom, { duration: 0.8 });
  }, [focusKey, map]);

  // Follow selected pin
  React.useEffect(() => {
    const pin = pins.find((p) => p.id === selectedId);
    if (!pin) return;
    map.flyTo([pin.lat, pin.lng], Math.max(map.getZoom(), 14), { duration: 0.6 });
  }, [selectedId, pins, map]);

  // Attach spiderfy popup click
  React.useEffect(() => {
    map.eachLayer((layer) => {
      if (layer instanceof L.Marker) {
        const listing = listings.find((l) => l.id === (layer.options as any).listingId);
        if (listing) {
          layer.bindPopup(
            `
            <div style="min-width:160px;font-family:inter,sans-serif;">
              <div style="font-weight:700;font-size:14px;color:#003527;line-height:1.3;">
                ${listing.title}
              </div>
              <div style="font-size:12px;color:#5c6b62;margin-top:4px;">
                ${listing.location}
              </div>
            </div>
            `,
            { className: 'diaal-map-popup' }
          );
        }
      }
    });
  }, [listings, map]);

  return null;
}

export const MapView: React.FC<MapViewProps> = ({
  listings,
  selectedListingId,
  onSelectListing,
  formatPrice,
  selectedCity = 'all',
  selectedCountryCode = 'all',
  height = '600px',
}) => {
  // Filter pins to valid coordinates
  const pins = useMemo(
    () =>
      listings
        .filter(
          (l) =>
            Number.isFinite(l.lat) &&
            Number.isFinite(l.lng) &&
            !(l.lat === 0 && l.lng === 0)
        )
        .map((l) => ({ id: l.id, lat: l.lat, lng: l.lng, category: l.category })),
    [listings]
  );

  // Determine focus from city/country filter
  const focus = useMemo((): { center: [number, number]; zoom: number } | null => {
    if (selectedCity && selectedCity !== 'all' && CITY_COORDINATES[selectedCity.toLowerCase()]) {
      const c = CITY_COORDINATES[selectedCity.toLowerCase()];
      return { center: [c.lat, c.lng], zoom: c.zoom };
    }
    if (selectedCountryCode && selectedCountryCode !== 'all' && COUNTRY_COORDINATES[selectedCountryCode]) {
      const c = COUNTRY_COORDINATES[selectedCountryCode];
      return { center: [c.lat, c.lng], zoom: c.zoom };
    }
    return null;
  }, [selectedCity, selectedCountryCode]);

  return (
    <div className="relative w-full h-full bg-surface text-on-surface rounded-2xl overflow-hidden border border-outline-variant/25 shadow-sm">
      {/* Map Container */}
      <div className={`h-[${height}] w-full z-0 relative`}>
        <MapContainer
          center={focus ? focus.center : [2.0469, 45.3182]}
          zoom={focus ? focus.zoom : 13}
          zoomControl={false}
          scrollWheelZoom={true}
          className="h-full w-full"
          attributionControl={false}
        >
          <TileLayer
            url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
            maxZoom={19}
            subdomains="abcd"
            attribution="&copy; Carto"
          />
          <MarkerClusterGroup
            spiderfyOnMaxZoom={true}
            showCoverageOnHover={false}
            zoomToBoundsOnClick={true}
            disableClusteringAtZoom={14}
            maxClusterRadius={50}
          >
            <SpiderfyOnClick />
            {pins.map((pin) => {
              const listing = listings.find((l) => l.id === pin.id);
              const isSelected = selectedListingId === pin.id;
              const priceLabel = listing ? formatPrice(listing.price, true) : '';
              return (
                <Marker
                  key={pin.id}
                  position={[pin.lat, pin.lng]}
                  icon={getPinIcon(isSelected, pin.category)}
                  eventHandlers={{
                    click: () => {
                      onSelectListing(pin.id);
                    },
                  }}
                />
              );
            })}
          </MarkerClusterGroup>
          <MapController pins={pins} selectedId={selectedListingId} focus={focus} listings={listings} />
        </MapContainer>
      </div>
    </div>
  );
};
