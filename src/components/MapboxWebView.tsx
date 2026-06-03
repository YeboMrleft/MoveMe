import React, { useRef, useEffect, useCallback } from 'react';
import { StyleSheet, ViewStyle } from 'react-native';
import WebView from 'react-native-webview';
import Constants from 'expo-constants';

const TOKEN: string =
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ??
  (Constants.expoConfig?.extra as any)?.mapboxToken ??
  '';

export interface MapMarker {
  id: string;
  longitude: number;
  latitude: number;
  color: string;
  emoji: string;
}

export interface RouteLine {
  coordinates: [number, number][]; // [lng, lat][]
  color: string;
}

interface Props {
  center: [number, number];
  zoom?: number;
  markers?: MapMarker[];
  route?: RouteLine;
  style?: ViewStyle;
}

const buildHTML = (
  token: string,
  center: [number, number],
  zoom: number,
  markers: MapMarker[],
  route?: RouteLine,
) => `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet"/>
<script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body, #map { width:100%; height:100vh; }
</style>
</head>
<body>
<div id="map"></div>
<script>
  mapboxgl.accessToken = '${token}';
  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [${center[0]}, ${center[1]}],
    zoom: ${zoom},
  });

  var markersStore = {};

  function makeMarkerEl(color, emoji) {
    var el = document.createElement('div');
    el.style.cssText = 'width:38px;height:38px;border-radius:50%;background:' + color
      + ';color:#fff;display:flex;align-items:center;justify-content:center;'
      + 'font-size:20px;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.35);cursor:pointer;';
    el.innerHTML = emoji;
    return el;
  }

  window.addOrUpdateMarker = function(id, lng, lat, color, emoji) {
    if (markersStore[id]) {
      markersStore[id].setLngLat([lng, lat]);
      return;
    }
    var el = makeMarkerEl(color, emoji);
    markersStore[id] = new mapboxgl.Marker({ element: el })
      .setLngLat([lng, lat])
      .addTo(map);
  };

  window.updateRoute = function(coords, color) {
    var src = map.getSource('route');
    var geojson = { type:'Feature', geometry:{ type:'LineString', coordinates: coords }, properties:{} };
    if (src) { src.setData(geojson); return; }
    map.addSource('route', { type:'geojson', data: geojson });
    map.addLayer({ id:'route-line', type:'line', source:'route',
      layout:{ 'line-join':'round', 'line-cap':'round' },
      paint:{ 'line-color': color, 'line-width':3, 'line-dasharray':[2,2] }
    });
  };

  window.fitBounds = function(sw, ne, pad) {
    map.fitBounds([[sw[0],sw[1]], [ne[0],ne[1]]], { padding: pad, duration:600 });
  };

  map.on('load', function() {
    ${markers.map(m =>
      `window.addOrUpdateMarker('${m.id}',${m.longitude},${m.latitude},'${m.color}','${m.emoji}');`
    ).join('\n    ')}
    ${route ? `window.updateRoute(${JSON.stringify(route.coordinates)},'${route.color}');` : ''}
  });
</script>
</body>
</html>`;

export default function MapboxWebView({ center, zoom = 12, markers = [], route, style }: Props) {
  const webRef = useRef<WebView>(null);
  const prevMarkers = useRef<MapMarker[]>([]);

  const inject = useCallback((js: string) => {
    webRef.current?.injectJavaScript(`(function(){${js}})(); true;`);
  }, []);

  useEffect(() => {
    markers.forEach(m => {
      inject(`window.addOrUpdateMarker('${m.id}',${m.longitude},${m.latitude},'${m.color}','${m.emoji}');`);
    });
    prevMarkers.current = markers;
  }, [markers]);

  useEffect(() => {
    if (!route) return;
    inject(`if(map.isStyleLoaded()) window.updateRoute(${JSON.stringify(route.coordinates)},'${route.color}');`);
  }, [route]);

  return (
    <WebView
      ref={webRef}
      style={[styles.map, style]}
      source={{ html: buildHTML(TOKEN, center, zoom, markers, route) }}
      scrollEnabled={false}
      javaScriptEnabled
      originWhitelist={['*']}
    />
  );
}

const styles = StyleSheet.create({
  map: { flex: 1 },
});
