'use client';
import { useEffect, useRef, useState } from 'react';
import { OFFICE } from '@/lib/domain';
import type { MapProps } from './apartment-map';
let loader: Promise<void> | null = null;
function loadGoogle(key: string) {
  if (loader) return loader;
  loader = new Promise<void>((resolve, reject) => {
    const win = window as unknown as {
      homebaseMapsReady?: () => void;
      gm_authFailure?: () => void;
    };
    const timeout = setTimeout(
      () => reject(new Error('Google Maps timed out.')),
      20000,
    );
    win.homebaseMapsReady = () => {
      clearTimeout(timeout);
      resolve();
    };
    win.gm_authFailure = () => {
      clearTimeout(timeout);
      reject(new Error('Google Maps key was rejected.'));
      window.dispatchEvent(new Event('homebase-google-error'));
    };
    const script = document.createElement('script');
    script.src =
      'https://maps.googleapis.com/maps/api/js?' +
      new URLSearchParams({
        key,
        v: 'quarterly',
        loading: 'async',
        callback: 'homebaseMapsReady',
        libraries: 'maps,marker',
      });
    script.async = true;
    script.onerror = () => {
      clearTimeout(timeout);
      reject(new Error('Google Maps could not load.'));
    };
    document.head.appendChild(script);
  });
  return loader;
}
export default function GoogleMap(
  props: MapProps & { apiKey: string; mapId: string; onFailure: () => void },
) {
  const node = useRef<HTMLDivElement>(null),
    mapRef = useRef<google.maps.Map | null>(null),
    markers = useRef<google.maps.marker.AdvancedMarkerElement[]>([]),
    latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  }, [props]);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    let disposed = false;
    let office: google.maps.marker.AdvancedMarkerElement | undefined;
    let observer: ResizeObserver | undefined;
    const fail = () => latest.current.onFailure();
    window.addEventListener('homebase-google-error', fail);
    loadGoogle(props.apiKey)
      .then(async () => {
        await google.maps.importLibrary('marker');
        if (disposed || !node.current) return;
        const map = new google.maps.Map(node.current, {
          center: latest.current.center,
          zoom: 13,
          mapId: props.mapId || 'DEMO_MAP_ID',
          mapTypeControl: true,
          mapTypeControlOptions: {
            position: google.maps.ControlPosition.TOP_LEFT,
          },
          streetViewControl: true,
          fullscreenControl: false,
          zoomControl: true,
          zoomControlOptions: {
            position: google.maps.ControlPosition.RIGHT_CENTER,
          },
          gestureHandling: 'greedy',
          minZoom: 10,
          restriction: {
            latLngBounds: {
              south: 37.15,
              west: -122.25,
              north: 37.6,
              east: -121.7,
            },
          },
        });
        mapRef.current = map;
        office = new google.maps.marker.AdvancedMarkerElement({
          map,
          position: { lat: OFFICE.lat, lng: OFFICE.lng },
          title: 'Google Caribbean 100 · approximate campus pin',
        });
        const report = () => {
          const b = map.getBounds();
          if (b)
            latest.current.onBounds({
              south: b.getSouthWest().lat(),
              west: b.getSouthWest().lng(),
              north: b.getNorthEast().lat(),
              east: b.getNorthEast().lng(),
            });
        };
        map.addListener('idle', report);
        map.addListener('click', (e: google.maps.MapMouseEvent) => {
          if (latest.current.placing && e.latLng)
            latest.current.onPlace(e.latLng.lat(), e.latLng.lng());
        });
        observer = new ResizeObserver(() =>
          google.maps.event.trigger(map, 'resize'),
        );
        observer.observe(node.current);
        setReady(true);
      })
      .catch(() => {
        if (!disposed) fail();
      });
    return () => {
      disposed = true;
      window.removeEventListener('homebase-google-error', fail);
      observer?.disconnect();
      markers.current.forEach((m) => (m.map = null));
      if (office) office.map = null;
      if (mapRef.current)
        google.maps.event.clearInstanceListeners(mapRef.current);
      mapRef.current = null;
    };
  }, [props.apiKey, props.mapId]);
  useEffect(() => {
    mapRef.current?.panTo(props.center);
    mapRef.current?.setZoom(14);
  }, [props.center]);
  useEffect(() => {
    if (!ready || !mapRef.current) return;
    markers.current.forEach((m) => (m.map = null));
    const ids = new Set(props.saved.map((p) => p.osmId));
    const records = [
      ...props.places.filter((p) => !ids.has(p.osmId)),
      ...props.saved,
    ];
    markers.current = records.flatMap((p) => {
      if (p.lat === null || p.lng === null) return [];
      const saved = 'id' in p;
      const pin = document.createElement('div');
      pin.className = `google-property-pin ${saved ? 'saved-marker' : ''} ${props.selected === (saved ? p.id : p.osmId) ? 'selected-marker' : ''}`;
      pin.textContent = saved ? '★' : '•';
      const marker = new google.maps.marker.AdvancedMarkerElement({
        map: mapRef.current,
        position: { lat: p.lat, lng: p.lng },
        title: p.name,
        content: pin,
      });
      marker.addListener('click', () => latest.current.onSelect(p));
      return [marker];
    });
  }, [props.places, props.saved, props.selected, ready]);
  return (
    <div
      className={`map-canvas ${props.placing ? 'placing' : ''}`}
      ref={node}
      aria-label="Google Maps apartment discovery map"
    />
  );
}
