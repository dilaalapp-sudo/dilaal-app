import React, { useEffect, useRef, useState, useMemo } from 'react';
import L from 'leaflet';
import { PropertyListing } from '../types';

interface RealMapViewProps {
  listings: PropertyListing[];
  selectedListingId: string | null;
  onSelectListing: (id: string) => void;
  formatPrice: (amount: number, compact?: boolean) => string;
  selectedCity?: string;
  selectedCountryCode?: string;
  onOpenListingDetails: (id: string) => void;
}

// City coordinate lookup for dynamic flyTo
const CITY_COORDINATES: Record<string, { lat: number; lng: number; zoom: number; label: string }> = {
  all: { lat: 2.0469, lng: 45.3182, zoom: 13, label: 'Mogadishu Central' },
  mogadishu: { lat: 2.0469, lng: 45.3182, zoom: 13, label: 'Mogadishu (Banaadir)' },
  hargeisa: { lat: 9.5600, lng: 44.0650, zoom: 13, label: 'Hargeisa (Maroodi Jeex)' },
  garowe: { lat: 8.4064, lng: 48.4845, zoom: 13, label: 'Garowe (Nugaal)' },
  kismayo: { lat: -0.3582, lng: 42.5454, zoom: 13, label: 'Kismayo (Jubaland)' },
  bosaso: { lat: 11.2842, lng: 49.1816, zoom: 13, label: 'Bosaso (Bari)' },
  baidoa: { lat: 3.1138, lng: 43.6498, zoom: 13, label: 'Baidoa (Bay)' },
  nairobi: { lat: -1.286389, lng: 36.817223, zoom: 12, label: 'Nairobi (Eastleigh/Kilimani)' },
  mombasa: { lat: -4.0435, lng: 39.6682, zoom: 12, label: 'Mombasa' },
  dubai: { lat: 25.2048, lng: 55.2708, zoom: 12, label: 'Dubai (Business Bay/Deira)' },
  london: { lat: 51.5074, lng: -0.1278, zoom: 12, label: 'London Diaspora Corridor' },
  istanbul: { lat: 41.0082, lng: 28.9784, zoom: 12, label: 'Istanbul Gateway' },
  minneapolis: { lat: 44.9778, lng: -93.2650, zoom: 12, label: 'Minneapolis (Cedar-Riverside)' },
};

const COUNTRY_COORDINATES: Record<string, { lat: number; lng: number; zoom: number }> = {
  SO: { lat: 2.0469, lng: 45.3182, zoom: 12 },
  KE: { lat: -1.286389, lng: 36.817223, zoom: 12 },
  AE: { lat: 25.2048, lng: 55.2708, zoom: 12 },
  GB: { lat: 51.5074, lng: -0.1278, zoom: 11 },
  TR: { lat: 41.0082, lng: 28.9784, zoom: 11 },
  US: { lat: 44.9778, lng: -93.2650, zoom: 11 },
};

export const RealMapView: React.FC<RealMapViewProps> = ({
  listings,
  selectedListingId,
  onSelectListing,
  formatPrice,
  selectedCity = 'all',
  selectedCountryCode = 'all',
  onOpenListingDetails,
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const tileLayerRef = useRef<L.TileLayer | null>(null);
  const labelsLayerRef = useRef<L.TileLayer | null>(null);
  const markersGroupRef = useRef<L.LayerGroup | null>(null);

  const [isSatellite, setIsSatellite] = useState<boolean>(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage((current) => (current === msg ? null : current));
    }, 2500);
  };

  // Determine current center
  const initialCoord = useMemo(() => {
    if (selectedCity && selectedCity !== 'all' && CITY_COORDINATES[selectedCity.toLowerCase()]) {
      return CITY_COORDINATES[selectedCity.toLowerCase()];
    }
    if (selectedCountryCode && selectedCountryCode !== 'all' && COUNTRY_COORDINATES[selectedCountryCode]) {
      const c = COUNTRY_COORDINATES[selectedCountryCode];
      return { lat: c.lat, lng: c.lng, zoom: c.zoom, label: selectedCountryCode };
    }
    return CITY_COORDINATES.mogadishu;
  }, [selectedCity, selectedCountryCode]);

  // 1. Initialize Leaflet Map once
  useEffect(() => {
    if (!mapContainerRef.current) return;
    if (mapInstanceRef.current) return;

    // Create map
    const map = L.map(mapContainerRef.current, {
      center: [initialCoord.lat, initialCoord.lng],
      zoom: initialCoord.zoom,
      zoomControl: false, // We render custom tactile zoom buttons
      attributionControl: false, // Clean UI attribution
    });

    // Add Carto Voyager tiles as default street map
    const streetTile = L.tileLayer(
      'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
      {
        maxZoom: 19,
        subdomains: 'abcd',
      }
    ).addTo(map);

    tileLayerRef.current = streetTile;

    // Layer group for property markers
    const markersGroup = L.layerGroup().addTo(map);
    markersGroupRef.current = markersGroup;

    mapInstanceRef.current = map;

    // Trigger invalidateSize after render
    const t = setTimeout(() => {
      map.invalidateSize();
    }, 200);

    return () => {
      clearTimeout(t);
      map.remove();
      mapInstanceRef.current = null;
      tileLayerRef.current = null;
      labelsLayerRef.current = null;
      markersGroupRef.current = null;
    };
  }, []);

  // 2. Handle Satellite vs Street tile switching
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // Remove existing tile layers
    if (tileLayerRef.current) {
      map.removeLayer(tileLayerRef.current);
      tileLayerRef.current = null;
    }
    if (labelsLayerRef.current) {
      map.removeLayer(labelsLayerRef.current);
      labelsLayerRef.current = null;
    }

    if (isSatellite) {
      // Esri World Imagery (High-res satellite)
      const satLayer = L.tileLayer(
        'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
        {
          maxZoom: 19,
          attribution: 'Esri, Maxar, Earthstar Geographics',
        }
      ).addTo(map);
      tileLayerRef.current = satLayer;

      // Carto labels overlay for streets & landmarks over satellite
      const labelLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager_only_labels/{z}/{x}/{y}{r}.png',
        {
          maxZoom: 19,
          subdomains: 'abcd',
          pane: 'shadowPane',
        }
      ).addTo(map);
      labelsLayerRef.current = labelLayer;
    } else {
      // Carto Voyager Street map
      const streetLayer = L.tileLayer(
        'https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png',
        {
          maxZoom: 19,
          subdomains: 'abcd',
        }
      ).addTo(map);
      tileLayerRef.current = streetLayer;
    }
  }, [isSatellite]);

  // 3. Update dynamic markers whenever listings or selection change
  useEffect(() => {
    const map = mapInstanceRef.current;
    const group = markersGroupRef.current;
    if (!map || !group) return;

    group.clearLayers();

    listings.forEach((listing) => {
      // Coordinates at (0,0) mean "not provided" and must not be plotted
      if (
        !Number.isFinite(listing.lat) ||
        !Number.isFinite(listing.lng) ||
        (listing.lat === 0 && listing.lng === 0)
      ) {
        return;
      }

      const isSelected = selectedListingId === listing.id;
      const formattedPrice = formatPrice(listing.price, true);
      const iconName =
        listing.category === 'land'
          ? 'landscape'
          : listing.category === 'car'
          ? 'directions_car'
          : listing.category === 'commercial'
          ? 'apartment'
          : 'home';

      // Custom HTML Marker matching luxury app theme
      const customHtml = `
        <div class="diaal-marker-wrap ${isSelected ? 'is-selected' : ''}" style="cursor: pointer;">
          <div class="diaal-marker-pill ${
            isSelected
              ? 'bg-[#904d00] text-white ring-4 ring-[#fe932c]/50 shadow-xl scale-110'
              : 'bg-[#003527] text-white hover:bg-[#064e3b] shadow-md'
          } flex items-center gap-1.5 px-3 py-1.5 rounded-full font-bold text-xs transition-all whitespace-nowrap">
            <span class="material-symbols-outlined" style="font-size: 14px; line-height: 1;">${iconName}</span>
            <span style="font-size: 11px; font-weight: 800; letter-spacing: -0.01em;">${formattedPrice}</span>
          </div>
          <div class="diaal-marker-pointer ${
            isSelected ? 'bg-[#904d00]' : 'bg-[#003527]'
          }" style="width: 8px; height: 8px; transform: rotate(45deg); margin: -4px auto 0 auto; box-shadow: 0 2px 4px rgba(0,0,0,0.2);"></div>
        </div>
      `;

      const customIcon = L.divIcon({
        className: 'diaal-custom-icon',
        html: customHtml,
        iconSize: [110, 36],
        iconAnchor: [55, 36],
      });

      const marker = L.marker([listing.lat, listing.lng], {
        icon: customIcon,
        zIndexOffset: isSelected ? 1000 : 100,
      });

      marker.on('click', () => {
        onSelectListing(listing.id);
        map.panTo([listing.lat, listing.lng], {
          animate: true,
          duration: 0.5,
        });
      });

      group.addLayer(marker);
    });
  }, [listings, selectedListingId, formatPrice, onSelectListing]);

  // 4. Center map when selectedCity or selectedCountry changes
  useEffect(() => {
    const map = mapInstanceRef.current;
    if (!map) return;

    if (selectedCity && selectedCity !== 'all' && CITY_COORDINATES[selectedCity.toLowerCase()]) {
      const coord = CITY_COORDINATES[selectedCity.toLowerCase()];
      map.flyTo([coord.lat, coord.lng], coord.zoom, { duration: 1.2 });
      showToast(`Viewing real map of ${coord.label}`);
    } else if (selectedCountryCode && selectedCountryCode !== 'all' && COUNTRY_COORDINATES[selectedCountryCode]) {
      const coord = COUNTRY_COORDINATES[selectedCountryCode];
      map.flyTo([coord.lat, coord.lng], coord.zoom, { duration: 1.2 });
      showToast(`Viewing real map of ${selectedCountryCode} jurisdiction`);
    }
  }, [selectedCity, selectedCountryCode]);

  // Zoom handlers
  const handleZoomIn = () => {
    mapInstanceRef.current?.zoomIn();
  };

  const handleZoomOut = () => {
    mapInstanceRef.current?.zoomOut();
  };

  // Recenter handler
  const handleRecenter = () => {
    const map = mapInstanceRef.current;
    if (!map) return;

    // If there's an active selected listing, center on it
    const active = listings.find((l) => l.id === selectedListingId);
    if (
      active &&
      Number.isFinite(active.lat) &&
      Number.isFinite(active.lng) &&
      !(active.lat === 0 && active.lng === 0)
    ) {
      map.flyTo([active.lat, active.lng], 15, { duration: 0.9 });
      showToast(`Focused on ${active.location.split(',')[0]}`);
      return;
    }

    // Otherwise center on the currently selected region
    map.flyTo([initialCoord.lat, initialCoord.lng], initialCoord.zoom, { duration: 1 });
    showToast(`Centered on ${initialCoord.label}`);
  };

  return (
    <div className="relative w-full h-full min-h-[calc(100vh-220px)] flex-1 overflow-hidden select-none">
      {/* Real Map Leaflet Container */}
      <div
        ref={mapContainerRef}
        className="w-full h-full min-h-[calc(100vh-220px)] absolute inset-0 z-0 bg-slate-100 dark:bg-slate-900"
      />

      {/* Floating Notification Toast */}
      {toastMessage && (
        <div className="absolute top-16 left-1/2 -translate-x-1/2 z-30 pointer-events-none transition-all duration-300">
          <div className="bg-surface-container-lowest/95 backdrop-blur-md px-4 py-2 rounded-2xl shadow-xl border border-outline-variant/30 text-xs font-bold text-on-surface flex items-center gap-2">
            <span className="material-symbols-outlined text-[16px] text-primary">explore</span>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Top Right: Real Map Control HUD */}
      <div className="absolute top-3 right-3 flex flex-col gap-2 z-20">
        {/* Recenter Button */}
        <button
          type="button"
          aria-label="Recenter Map"
          onClick={handleRecenter}
          className="w-10 h-10 rounded-2xl bg-surface-container-lowest text-on-surface shadow-md flex items-center justify-center hover:bg-surface-container active:scale-95 transition-all cursor-pointer border border-outline-variant/25"
          title="Recenter Map"
        >
          <span className="material-symbols-outlined text-[20px] text-primary">
            my_location
          </span>
        </button>

        {/* Satellite Imagery Toggle Button */}
        <button
          type="button"
          aria-label="Toggle Satellite Imagery"
          onClick={() => {
            setIsSatellite(!isSatellite);
            showToast(!isSatellite ? 'Satellite Aerial View Active' : 'Street Cartography Active');
          }}
          className={`w-10 h-10 rounded-2xl shadow-md flex items-center justify-center active:scale-95 transition-all cursor-pointer border border-outline-variant/25 ${
            isSatellite
              ? 'bg-[#003527] text-white ring-2 ring-[#003527]/30'
              : 'bg-surface-container-lowest text-primary hover:bg-surface-container'
          }`}
          title={isSatellite ? 'Switch to Street Map' : 'Switch to Real Satellite Imagery'}
        >
          <span className="material-symbols-outlined text-[20px]">layers</span>
        </button>

        {/* Tactile Zoom Buttons */}
        <div className="flex flex-col bg-surface-container-lowest rounded-2xl shadow-md border border-outline-variant/25 overflow-hidden">
          <button
            type="button"
            onClick={handleZoomIn}
            className="w-10 h-9 flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors cursor-pointer border-b border-outline-variant/15 active:bg-surface-container-high"
            title="Zoom In"
          >
            <span className="material-symbols-outlined text-[18px]">add</span>
          </button>
          <button
            type="button"
            onClick={handleZoomOut}
            className="w-10 h-9 flex items-center justify-center text-on-surface hover:bg-surface-container transition-colors cursor-pointer active:bg-surface-container-high"
            title="Zoom Out"
          >
            <span className="material-symbols-outlined text-[18px]">remove</span>
          </button>
        </div>
      </div>

      {/* Real Map Watermark / Mode Indicator (Bottom Right) */}
      <div className="absolute bottom-2 right-2 z-10 pointer-events-none hidden xs:flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-surface-container-lowest/80 backdrop-blur-xs text-[10px] text-outline font-semibold border border-outline-variant/15 shadow-2xs">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
        <span>{isSatellite ? 'ArcGIS Satellite HD' : 'OpenStreet & Carto Engine'}</span>
      </div>
    </div>
  );
};
