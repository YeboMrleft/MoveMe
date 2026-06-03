import React, { useRef, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import WebView from 'react-native-webview';
import Constants from 'expo-constants';

const TOKEN: string =
  process.env.EXPO_PUBLIC_MAPBOX_TOKEN ??
  (Constants.expoConfig?.extra as any)?.mapboxToken ??
  '';

export interface DriverPosition {
  latitude: number;
  longitude: number;
  heading?: number;
}

interface Props {
  driver: DriverPosition | null;
  destination: { latitude: number; longitude: number };
  destinationLabel: 'pickup' | 'dropoff';
}

const buildHTML = (token: string, dest: { latitude: number; longitude: number }, label: string) => `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8"/>
<meta name="viewport" content="initial-scale=1,maximum-scale=1,user-scalable=no"/>
<link href="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.css" rel="stylesheet"/>
<script src="https://api.mapbox.com/mapbox-gl-js/v3.3.0/mapbox-gl.js"></script>
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  body, #map { width:100%; height:100vh; font-family:sans-serif; }
  #info {
    position:absolute; top:12px; left:50%; transform:translateX(-50%);
    background:rgba(255,255,255,0.95); border-radius:20px;
    padding:8px 18px; display:flex; gap:16px; align-items:center;
    box-shadow:0 2px 12px rgba(0,0,0,0.15); z-index:10;
    font-size:13px; font-weight:700; color:#1A1A1A;
    border:1px solid #E0E0E0; white-space:nowrap;
  }
  #info .eta { color:#007A4D; }
  #info .dist { color:#555; font-weight:600; }
  #dest-label {
    position:absolute; bottom:12px; left:50%; transform:translateX(-50%);
    background:#007A4D; color:#fff; border-radius:20px;
    padding:8px 18px; font-size:13px; font-weight:700;
    box-shadow:0 2px 8px rgba(0,122,77,0.4); z-index:10; white-space:nowrap;
  }
</style>
</head>
<body>
<div id="map"></div>
<div id="info"><span class="eta" id="eta">Calculating…</span><span class="dist" id="dist"></span></div>
<div id="dest-label">📍 ${label === 'pickup' ? 'Pickup location' : 'Dropoff location'}</div>
<script>
  mapboxgl.accessToken = '${token}';

  var DEST = [${dest.longitude}, ${dest.latitude}];
  var driverMarker = null;
  var destMarker = null;
  var currentDriver = null;
  var routeFetching = false;

  var map = new mapboxgl.Map({
    container: 'map',
    style: 'mapbox://styles/mapbox/streets-v12',
    center: DEST,
    zoom: 14,
    pitch: 55,
    bearing: 0,
  });

  // Destination marker
  var destEl = document.createElement('div');
  destEl.style.cssText = 'width:40px;height:40px;border-radius:50%;background:' +
    (${label === "'pickup'"} ? '#007A4D' : '#E03C31') +
    ';color:#fff;display:flex;align-items:center;justify-content:center;' +
    'font-size:22px;border:3px solid #fff;box-shadow:0 2px 10px rgba(0,0,0,0.3);';
  destEl.innerHTML = '${label === 'pickup' ? '📍' : '🏁'}';

  map.on('load', function() {
    destMarker = new mapboxgl.Marker({ element: destEl }).setLngLat(DEST).addTo(map);

    // Route source + layers
    map.addSource('route', { type:'geojson', data:{ type:'Feature', geometry:{ type:'LineString', coordinates:[] }, properties:{} } });

    // Route casing (white outline)
    map.addLayer({ id:'route-casing', type:'line', source:'route',
      layout:{ 'line-join':'round', 'line-cap':'round' },
      paint:{ 'line-color':'#fff', 'line-width':10 }
    });

    // Route fill
    map.addLayer({ id:'route-fill', type:'line', source:'route',
      layout:{ 'line-join':'round', 'line-cap':'round' },
      paint:{ 'line-color':'#007A4D', 'line-width':6 }
    });
  });

  async function fetchRoute(driverLng, driverLat) {
    if (routeFetching) return;
    routeFetching = true;
    try {
      var url = 'https://api.mapbox.com/directions/v5/mapbox/driving/' +
        driverLng + ',' + driverLat + ';' + DEST[0] + ',' + DEST[1] +
        '?geometries=geojson&steps=false&access_token=${token}';
      var res = await fetch(url);
      var data = await res.json();
      if (!data.routes || !data.routes[0]) return;
      var route = data.routes[0];

      // Draw route
      var src = map.getSource('route');
      if (src) src.setData({ type:'Feature', geometry: route.geometry, properties:{} });

      // Update ETA + distance
      var mins = Math.round(route.duration / 60);
      var km = (route.distance / 1000).toFixed(1);
      document.getElementById('eta').textContent = mins < 1 ? 'Arriving' : mins + ' min';
      document.getElementById('dist').textContent = km + ' km away';
    } catch(e) {}
    finally { routeFetching = false; }
  }

  window.updateDriver = function(lng, lat, heading) {
    currentDriver = { lng, lat, heading };

    // Create or move driver marker
    if (!driverMarker) {
      var el = document.createElement('div');
      el.style.cssText = 'width:44px;height:44px;border-radius:50%;background:#007A4D;' +
        'color:#fff;display:flex;align-items:center;justify-content:center;' +
        'font-size:24px;border:3px solid #fff;box-shadow:0 2px 14px rgba(0,122,77,0.5);';
      el.innerHTML = '🚚';
      driverMarker = new mapboxgl.Marker({ element: el, rotationAlignment:'map' })
        .setLngLat([lng, lat]).addTo(map);
    } else {
      driverMarker.setLngLat([lng, lat]);
    }

    // Rotate driver icon with heading
    if (driverMarker._element && heading != null && heading >= 0) {
      driverMarker._element.style.transform = 'rotate(' + heading + 'deg)';
    }

    // Camera follows driver — heading-up navigation style
    map.easeTo({
      center: [lng, lat],
      bearing: (heading != null && heading >= 0) ? heading : map.getBearing(),
      pitch: 55,
      zoom: 16,
      duration: 1000,
    });

    // Fetch actual road route
    fetchRoute(lng, lat);
  };
</script>
</body>
</html>`;

export default function DriverNavMap({ driver, destination, destinationLabel }: Props) {
  const webRef = useRef<WebView>(null);
  const initialised = useRef(false);

  useEffect(() => {
    if (!driver) return;
    const js = `window.updateDriver(${driver.longitude},${driver.latitude},${driver.heading ?? -1}); true;`;
    if (initialised.current) {
      webRef.current?.injectJavaScript(js);
    }
  }, [driver]);

  return (
    <View style={styles.root}>
      <WebView
        ref={webRef}
        style={styles.map}
        source={{ html: buildHTML(TOKEN, destination, destinationLabel) }}
        scrollEnabled={false}
        javaScriptEnabled
        originWhitelist={['*']}
        onLoad={() => {
          initialised.current = true;
          if (driver) {
            webRef.current?.injectJavaScript(
              `window.updateDriver(${driver.longitude},${driver.latitude},${driver.heading ?? -1}); true;`
            );
          }
        }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1 },
  map: { flex: 1 },
});
