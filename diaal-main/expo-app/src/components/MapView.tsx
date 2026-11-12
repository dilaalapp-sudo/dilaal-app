import React, {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native';
import { WebView } from 'react-native-webview';
import type { WebViewMessageEvent } from 'react-native-webview';

// Android's Google Maps SDK refuses to render without an API key, so the
// native map is a WebView running Leaflet over OpenStreetMap/Esri tiles —
// the same imagery the web build uses, with no key or Play Services needed.

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
  tracksViewChanges?: boolean;
}

interface UrlTileProps {
  urlTemplate: string;
  maximumZ?: number;
  flipY?: boolean;
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

export interface Camera {
  center: Coordinate;
  zoom: number;
  heading?: number;
  pitch?: number;
  altitude?: number;
}

export interface MapHandle {
  animateToRegion: (region: Region, duration?: number) => void;
  fitToCoordinates: (
    coordinates: Coordinate[],
    options?: { edgePadding?: { top: number; right: number; bottom: number; left: number }; animated?: boolean }
  ) => void;
  animateCamera: (camera: { center?: Coordinate; zoom?: number }, options?: { duration?: number }) => void;
  getCamera: () => Promise<Camera>;
  getMapBoundaries: () => Promise<null>;
  setCamera: (camera: Camera) => void;
}

export const Marker: React.FC<MarkerProps> = () => null;
export const UrlTile: React.FC<UrlTileProps> = () => null;

const DEFAULT_REGION: Region = {
  latitude: 2.0469,
  longitude: 45.3182,
  latitudeDelta: 0.12,
  longitudeDelta: 0.12,
};

function regionToZoom(region: Region): number {
  const delta = region.longitudeDelta || DEFAULT_REGION.longitudeDelta;
  return Math.max(2, Math.min(19, Math.round(Math.log2(360 / delta))));
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
    const labelChild = React.Children.toArray(props.children)[0] as React.ReactElement | undefined;
    const decoration = flattenStyle(labelChild?.props?.style);
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

function buildHtml(region: Region, tileUrl: string): string {
  const zoom = regionToZoom(region);
  const attribution = tileUrl.includes('arcgisonline') ? '&copy; Esri' : '&copy; OpenStreetMap';
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8" />
<meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no" />
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css" />
<style>
  html, body, #map { height: 100%; width: 100%; margin: 0; padding: 0; background: #eef0ea; }
  .leaflet-container { background: #eef0ea; font-family: Inter, system-ui, -apple-system, sans-serif; }
  .dilaal-map-pin {
    display: inline-flex; align-items: center; justify-content: center;
    min-width: 44px; height: 30px; padding: 0 10px; border-radius: 15px;
    font: 600 12px/1 Inter, system-ui, -apple-system, sans-serif; white-space: nowrap;
    cursor: pointer; box-shadow: 0 6px 16px rgba(0, 0, 0, 0.18);
    border: 1px solid rgba(0, 0, 0, 0.06); transform: translate(-50%, -50%);
  }
  .leaflet-control-attribution { font-size: 9px; }
  #fallback { display: none; height: 100%; align-items: center; justify-content: center;
    color: #5b5f57; font: 500 13px Inter, system-ui, sans-serif; text-align: center; padding: 24px; }
</style>
</head>
<body>
<div id="map"></div>
<div id="fallback">Map could not load. Switch to the list view.</div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
(function () {
  var post = function (msg) { window.ReactNativeWebView.postMessage(JSON.stringify(msg)); };
  function fail() {
    var mapEl = document.getElementById('map');
    if (mapEl) mapEl.style.display = 'none';
    var fb = document.getElementById('fallback');
    if (fb) fb.style.display = 'flex';
    post({ type: 'error' });
  }
  if (!window.L) { fail(); return; }
  try {
    var map = L.map('map', { zoomControl: false, minZoom: 2, maxZoom: 19 }).setView([${region.latitude}, ${region.longitude}], ${zoom});
    map.attributionControl.setPrefix('');
    var tile = L.tileLayer(${JSON.stringify(tileUrl)}, { maxZoom: 19, attribution: ${JSON.stringify(attribution)} }).addTo(map);
    var group = L.layerGroup().addTo(map);
    var camera = { center: { latitude: ${region.latitude}, longitude: ${region.longitude} }, zoom: ${zoom} };
    map.on('moveend zoomend', function () {
      var c = map.getCenter();
      camera = { center: { latitude: c.lat, longitude: c.lng }, zoom: map.getZoom() };
      post({ type: 'camera', camera: camera });
    });
    window.__dilaal = {
      setMarkers: function (list) {
        group.clearLayers();
        list.forEach(function (pin) {
          var icon = L.divIcon({
            className: '',
            html: '<span class="dilaal-map-pin" style="background:' + pin.background + ';color:' + pin.color + ';border-color:' + pin.border + '">' + pin.label + '</span>',
            iconSize: [0, 0]
          });
          var marker = L.marker([pin.latitude, pin.longitude], { icon: icon, keyboard: false });
          marker.on('click', function () { post({ type: 'select', id: pin.key }); });
          group.addLayer(marker);
        });
      },
      setTile: function (url) {
        map.removeLayer(tile);
        tile = L.tileLayer(url, { maxZoom: 19, attribution: url.indexOf('arcgisonline') >= 0 ? '&copy; Esri' : '&copy; OpenStreetMap' }).addTo(map);
      },
      flyTo: function (lat, lng, z, duration) {
        map.flyTo([lat, lng], z, { duration: duration || 0.3 });
      },
      fit: function (coords, padding) {
        if (!coords.length) return;
        if (coords.length === 1) {
          map.setView([coords[0].latitude, coords[0].longitude], Math.max(map.getZoom(), 13));
          return;
        }
        var bounds = L.latLngBounds(coords.map(function (c) { return [c.latitude, c.longitude]; }));
        map.fitBounds(bounds, { padding: [padding || 48, padding || 48], animate: true });
      }
    };
    post({ type: 'ready' });
  } catch (e) {
    fail();
  }
})();
</script>
</body>
</html>`;
}

const MapView = forwardRef<MapHandle, MapViewProps>(({ style, children, initialRegion }, ref) => {
  const webRef = useRef<WebView | null>(null);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  const regionRef = useRef(initialRegion ?? DEFAULT_REGION);
  const cameraRef = useRef<Camera>({
    center: { latitude: regionRef.current.latitude, longitude: regionRef.current.longitude },
    zoom: regionToZoom(regionRef.current),
  });

  const pins = useMemo(() => extractPins(children), [children]);
  const tileUrl = extractTileUrl(children) ?? 'https://tile.openstreetmap.org/{z}/{x}/{y}.png';

  const pressRef = useRef<Map<string, () => void>>(new Map());
  pressRef.current = useMemo(() => {
    const handlers = new Map<string, () => void>();
    pins.forEach((pin) => {
      if (pin.onPress) handlers.set(pin.key, pin.onPress);
    });
    return handlers;
  }, [pins]);

  const initialTileRef = useRef(tileUrl);
  const html = useMemo(() => buildHtml(regionRef.current, initialTileRef.current), []);

  const inject = useCallback((js: string) => {
    webRef.current?.injectJavaScript(`${js};true;`);
  }, []);

  const pushMarkers = useCallback(
    (list: Pin[]) => {
      const payload = list.map((pin) => ({
        key: pin.key,
        latitude: pin.latitude,
        longitude: pin.longitude,
        label: escapeHtml(pin.label),
        background: pin.background,
        color: pin.color,
        border: pin.border,
      }));
      inject(`window.__dilaal && window.__dilaal.setMarkers(${JSON.stringify(payload)})`);
    },
    [inject]
  );

  useEffect(() => {
    if (ready) pushMarkers(pins);
  }, [ready, pins, pushMarkers]);

  useEffect(() => {
    if (ready) inject(`window.__dilaal && window.__dilaal.setTile(${JSON.stringify(tileUrl)})`);
  }, [ready, tileUrl, inject]);

  const handleMessage = useCallback((event: WebViewMessageEvent) => {
    try {
      const message = JSON.parse(event.nativeEvent.data) as {
        type?: string;
        id?: string;
        camera?: Camera;
      };
      if (message.type === 'ready') setReady(true);
      else if (message.type === 'error') setFailed(true);
      else if (message.type === 'camera' && message.camera) cameraRef.current = message.camera;
      else if (message.type === 'select' && message.id) pressRef.current.get(message.id)?.();
    } catch {
      // Ignore pages that post non-JSON messages.
    }
  }, []);

  const flyTo = useCallback(
    (latitude: number, longitude: number, zoom: number, duration = 300) => {
      cameraRef.current = { center: { latitude, longitude }, zoom };
      inject(
        `window.__dilaal && window.__dilaal.flyTo(${latitude}, ${longitude}, ${zoom}, ${Math.max(duration, 1) / 1000})`
      );
    },
    [inject]
  );

  useImperativeHandle(
    ref,
    () => ({
      animateToRegion: (region: Region, duration = 300) => {
        flyTo(region.latitude, region.longitude, regionToZoom(region), duration);
      },
      fitToCoordinates: (coordinates: Coordinate[], options) => {
        if (!coordinates.length) return;
        const padding = options?.edgePadding?.top ?? 48;
        inject(`window.__dilaal && window.__dilaal.fit(${JSON.stringify(coordinates)}, ${padding})`);
      },
      animateCamera: (camera, options) => {
        const center = camera.center ?? cameraRef.current.center;
        const zoom = camera.zoom ?? cameraRef.current.zoom;
        flyTo(center.latitude, center.longitude, zoom, options?.duration ?? 200);
      },
      getCamera: async () => cameraRef.current,
      getMapBoundaries: async () => null,
      setCamera: (camera: Camera) => {
        flyTo(camera.center.latitude, camera.center.longitude, camera.zoom, 0);
      },
    }),
    [flyTo, inject]
  );

  return (
    <View style={[styles.wrap, style]}>
      <WebView
        ref={webRef}
        source={{ html, baseUrl: 'https://dilaal.local' }}
        originWhitelist={['*']}
        javaScriptEnabled
        domStorageEnabled
        scrollEnabled={false}
        bounces={false}
        overScrollMode="never"
        setBuiltInZoomControls={false}
        androidLayerType="hardware"
        mixedContentMode="never"
        onMessage={handleMessage}
        onError={() => setFailed(true)}
        onHttpError={() => setFailed(true)}
        style={styles.web}
      />
      {!ready && !failed && (
        <View style={styles.overlay} pointerEvents="none">
          <ActivityIndicator color="#003527" />
        </View>
      )}
      {failed && (
        <View style={styles.overlay} pointerEvents="none">
          <Text style={styles.fallbackText}>Map could not load. Switch to the list view.</Text>
        </View>
      )}
    </View>
  );
});

MapView.displayName = 'MapView';

const styles = StyleSheet.create({
  wrap: { flex: 1, overflow: 'hidden' },
  web: { flex: 1, backgroundColor: '#eef0ea' },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  fallbackText: {
    fontSize: 13,
    fontWeight: '500',
    color: '#5b5f57',
    textAlign: 'center',
  },
});

export default MapView;
