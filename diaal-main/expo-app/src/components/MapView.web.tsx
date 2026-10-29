import React, {
  forwardRef,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
} from 'react';
import { StyleSheet, View } from 'react-native';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

// react-native-maps is native-only, so the web build renders the same pins on
// a Leaflet map with the same OSM/Esri tile URLs the native UrlTile uses.
export interface Region {
  latitude: number;
  longitude: number;
  latitudeDelta: number;
  longitudeDelta: number;
}

interface Coordinate {
  latitude: number;
  longitude: number;
}

interface MarkerProps {
  coordinate: Coordinate;
  children?: React.ReactNode;
  onPress?: () => void;
}

interface UrlTileProps {
  urlTemplate: string;
}

interface MapViewProps {
  style?: object;
  children?: React.ReactNode;
  initialRegion?: Region;
  mapType?: string;
  toolbarEnabled?: boolean;
  showsCompass?: boolean;
  rotateEnabled?: boolean;
}

interface Camera {
  center: Coordinate;
  zoom: number;
  heading?: number;
  pitch?: number;
  altitude?: number;
}

export const Marker: React.FC<MarkerProps> = () => null;
export const UrlTile: React.FC<UrlTileProps> = () => null;

const DEFAULT_REGION: Region = {
  latitude: 2.0469,
  longitude: 45.3182,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

const PIN_CSS = `
.dilaal-map-pin {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 44px;
  height: 30px;
  padding: 0 10px;
  border-radius: 15px;
  font: 600 12px/1 Inter, system-ui, -apple-system, sans-serif;
  white-space: nowrap;
  cursor: pointer;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
  border: 1px solid rgba(0, 0, 0, 0.06);
  transform: translate(-50%, -50%);
}
.dilaal-map-pin:active { transform: translate(-50%, -50%) scale(0.96); }
.leaflet-container { background: #eaedff; font-family: Inter, system-ui, sans-serif; }
.leaflet-control-attribution { font-size: 9px; }
`;

function regionToZoom(region: Region): number {
  const delta = region.longitudeDelta || DEFAULT_REGION.longitudeDelta;
  const zoom = Math.log2(360 / delta);
  return Math.max(2, Math.min(19, Math.round(zoom)));
}

function zoomToDelta(zoom: number): number {
  return 360 / Math.pow(2, zoom);
}

function flattenStyle(style: unknown): Record<string, unknown> {
  if (!style) return {};
  if (Array.isArray(style)) {
    return style.reduce<Record<string, unknown>>((acc, item) => {
      if (!item) return acc;
      return { ...acc, ...flattenStyle(item) };
    }, {});
  }
  if (typeof style === 'object') return style as Record<string, unknown>;
  return {};
}

function collectText(node: React.ReactNode): string {
  if (node === null || node === undefined || node === false) return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(collectText).join('');
  if (React.isValidElement(node)) {
    return collectText((node.props as { children?: React.ReactNode }).children);
  }
  return '';
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

interface Pin {
  key: string;
  latitude: number;
  longitude: number;
  label: string;
  background: string;
  color: string;
  border: string;
  onPress?: () => void;
}

function extractPins(children: React.ReactNode): Pin[] {
  const pins: Pin[] = [];
  React.Children.forEach(children, (child) => {
    if (!React.isValidElement(child) || child.type !== Marker) return;
    const props = child.props as MarkerProps;
    if (!props.coordinate) return;
    const decoration = flattenStyle(
      (React.Children.toArray(props.children)[0] as React.ReactElement | undefined)?.props
        ?.style
    );
    const labelChild = React.Children.toArray(props.children)[0] as React.ReactElement | undefined;
    const textDecoration = flattenStyle(
      (React.Children.toArray(labelChild?.props?.children)[0] as React.ReactElement | undefined)
        ?.props?.style
    );
    pins.push({
      key: child.key ? String(child.key) : `${props.coordinate.latitude},${props.coordinate.longitude}`,
      latitude: props.coordinate.latitude,
      longitude: props.coordinate.longitude,
      label: collectText(props.children) || '•',
      background: String(decoration.backgroundColor ?? '#003527'),
      color: String(textDecoration.color ?? '#ffffff'),
      border: String(decoration.borderColor ?? 'rgba(0,0,0,0.06)'),
      onPress: props.onPress,
    });
  });
  return pins;
}

function extractTileUrl(children: React.ReactNode): string | null {
  let url: string | null = null;
  React.Children.forEach(children, (child) => {
    if (React.isValidElement(child) && child.type === UrlTile) {
      url = (child.props as UrlTileProps).urlTemplate;
    }
  });
  return url;
}

const MapView = forwardRef<unknown, MapViewProps>(
  ({ style, children, initialRegion }, ref) => {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const mapRef = useRef<L.Map | null>(null);
    const tileRef = useRef<L.TileLayer | null>(null);
    const pinLayersRef = useRef<L.LayerGroup | null>(null);
    const initialRegionRef = useRef(initialRegion ?? DEFAULT_REGION);

    const pins = useMemo(() => extractPins(children), [children]);
    const tileUrl = extractTileUrl(children);

    useEffect(() => {
      const styleTag = document.createElement('style');
      styleTag.textContent = PIN_CSS;
      document.head.appendChild(styleTag);
      return () => {
        styleTag.remove();
      };
    }, []);

    useEffect(() => {
      if (!hostRef.current || mapRef.current) return;
      const region = initialRegionRef.current;
      const map = L.map(hostRef.current, {
        center: [region.latitude, region.longitude],
        zoom: regionToZoom(region),
        zoomControl: false,
        attributionControl: true,
        preferCanvas: true,
      });
      map.attributionControl.setPrefix('');
      mapRef.current = map;
      pinLayersRef.current = L.layerGroup().addTo(map);

      const invalidate = () => map.invalidateSize();
      invalidate();
      const raf = requestAnimationFrame(invalidate);
      window.addEventListener('resize', invalidate);

      return () => {
        cancelAnimationFrame(raf);
        window.removeEventListener('resize', invalidate);
        map.remove();
        mapRef.current = null;
        pinLayersRef.current = null;
        tileRef.current = null;
      };
    }, []);

    useEffect(() => {
      const map = mapRef.current;
      if (!map) return;
      const attribution = tileUrl && tileUrl.includes('arcgisonline')
        ? '&copy; Esri, Maxar, Earthstar Geographics'
        : '&copy; OpenStreetMap contributors';
      if (tileRef.current) {
        map.removeLayer(tileRef.current);
        tileRef.current = null;
      }
      const url = tileUrl ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';
      const layer = L.tileLayer(url, { maxZoom: 19, attribution });
      layer.addTo(map);
      tileRef.current = layer;
    }, [tileUrl]);

    useEffect(() => {
      const group = pinLayersRef.current;
      if (!group) return;
      group.clearLayers();
      pins.forEach((pin) => {
        const icon = L.divIcon({
          className: '',
          html: `<span class="dilaal-map-pin" style="background:${escapeHtml(pin.background)};color:${escapeHtml(pin.color)};border-color:${escapeHtml(pin.border)}">${escapeHtml(pin.label)}</span>`,
          iconSize: [0, 0],
        });
        const marker = L.marker([pin.latitude, pin.longitude], { icon, keyboard: false });
        if (pin.onPress) marker.on('click', () => pin.onPress?.());
        marker.addTo(group);
      });
    }, [pins]);

    useImperativeHandle(
      ref,
      () => ({
        animateToRegion: (region: Region, duration = 300) => {
          mapRef.current?.flyTo(
            [region.latitude, region.longitude],
            regionToZoom(region),
            { duration: Math.max(duration, 1) / 1000 }
          );
        },
        fitToCoordinates: (
          coordinates: Coordinate[],
          options?: { edgePadding?: { top: number; right: number; bottom: number; left: number }; animated?: boolean }
        ) => {
          if (!coordinates.length) return;
          const bounds = L.latLngBounds(
            coordinates.map((coordinate) => [coordinate.latitude, coordinate.longitude] as [number, number])
          );
          const padding = options?.edgePadding;
          mapRef.current?.fitBounds(bounds, {
            paddingTopLeft: padding ? [padding.left, padding.top] : [40, 40],
            paddingBottomRight: padding ? [padding.right, padding.bottom] : [40, 40],
            animate: options?.animated !== false,
          });
        },
        animateCamera: (camera: Camera, options?: { duration?: number }) => {
          mapRef.current?.flyTo(
            [camera.center.latitude, camera.center.longitude],
            camera.zoom,
            { duration: Math.max(options?.duration ?? 200, 1) / 1000 }
          );
        },
        getCamera: async (): Promise<Camera> => {
          const map = mapRef.current;
          if (!map) return { center: { latitude: DEFAULT_REGION.latitude, longitude: DEFAULT_REGION.longitude }, zoom: 12 };
          const center = map.getCenter();
          return { center: { latitude: center.lat, longitude: center.lng }, zoom: map.getZoom() };
        },
        getMapBoundaries: async () => {
          const map = mapRef.current;
          if (!map) return null;
          const bounds = map.getBounds();
          return {
            northEast: { latitude: bounds.getNorthEast().lat, longitude: bounds.getNorthEast().lng },
            southWest: { latitude: bounds.getSouthWest().lat, longitude: bounds.getSouthWest().lng },
          };
        },
        setCamera: (camera: Camera) => {
          mapRef.current?.setView([camera.center.latitude, camera.center.longitude], camera.zoom);
        },
        _zoomDelta: zoomToDelta,
      }),
      []
    );

    return (
      <View style={[styles.wrap, style]}>
        <View ref={hostRef as never} style={styles.host} />
      </View>
    );
  }
);

MapView.displayName = 'MapView';

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden' },
  host: { flex: 1 },
});

export default MapView as unknown as React.ComponentType<
  React.ComponentProps<typeof View> & {
    initialRegion?: Region;
    children?: React.ReactNode;
    mapType?: string;
  }
>;
