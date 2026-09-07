'use client';
import { useEffect, useRef, useState } from 'react';
import type * as Leaflet from 'leaflet';
import { OFFICE, type Bounds, type Place, type Property } from '@/lib/domain';
export type MapProps = {
  center: { lat: number; lng: number };
  places: Place[];
  saved: Property[];
  selected: string | null;
  onBounds: (bounds: Bounds) => void;
  onSelect: (p: Place | Property) => void;
  placing: boolean;
  onPlace: (lat: number, lng: number) => void;
};
export default function ApartmentMap(props: MapProps) {
  const ref = useRef<HTMLDivElement>(null),
    mapRef = useRef<Leaflet.Map | null>(null),
    layers = useRef<Leaflet.LayerGroup | null>(null),
    latest = useRef(props);
  useEffect(() => {
    latest.current = props;
  }, [props]);
  const [ready, setReady] = useState(false);
  const [tileError, setTileError] = useState(false);
  useEffect(() => {
    let cancelled = false;
    let observer: ResizeObserver | undefined;
    void import('leaflet').then((L) => {
      if (cancelled || !ref.current) return;
      const map = L.map(ref.current, {
        zoomControl: false,
        minZoom: 10,
        maxBounds: [
          [37.15, -122.25],
          [37.6, -121.7],
        ],
        maxBoundsViscosity: 0.8,
      }).setView([latest.current.center.lat, latest.current.center.lng], 13);
      mapRef.current = map;
      L.control.zoom({ position: 'topright' }).addTo(map);
      L.control
        .scale({ imperial: true, metric: false, position: 'bottomright' })
        .addTo(map);
      const tiles = L.tileLayer(
        'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
        {
          maxZoom: 19,
          attribution:
            '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        },
      ).addTo(map);
      tiles.on('tileerror', () => setTileError(true));
      tiles.on('tileload', () => setTileError(false));
      L.marker([OFFICE.lat, OFFICE.lng], {
        icon: L.divIcon({
          className: 'office-map-marker',
          html: '<span>G</span>',
          iconSize: [36, 36],
          iconAnchor: [18, 18],
        }),
        title: 'Google Caribbean 100 · approximate campus pin',
      })
        .addTo(map)
        .bindTooltip('Google · Caribbean 100 (approximate campus pin)');
      layers.current = L.layerGroup().addTo(map);
      const report = () => {
        const b = map.getBounds();
        latest.current.onBounds({
          south: b.getSouth(),
          west: b.getWest(),
          north: b.getNorth(),
          east: b.getEast(),
        });
      };
      map.on('moveend', report);
      map.on('click', (e: Leaflet.LeafletMouseEvent) => {
        if (latest.current.placing)
          latest.current.onPlace(e.latlng.lat, e.latlng.lng);
      });
      observer = new ResizeObserver(() => {
        map.invalidateSize();
        report();
      });
      observer.observe(ref.current);
      report();
      setReady(true);
    });
    return () => {
      cancelled = true;
      observer?.disconnect();
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, []);
  useEffect(() => {
    mapRef.current?.flyTo([props.center.lat, props.center.lng], 14, {
      duration: 0.7,
    });
  }, [props.center]);
  useEffect(() => {
    if (!ready || !layers.current) return;
    void import('leaflet').then((L) => {
      const group = layers.current;
      if (!group) return;
      group.clearLayers();
      const savedIds = new Set(props.saved.map((p) => p.osmId).filter(Boolean));
      const records: (Place | Property)[] = [
        ...props.places.filter((p) => !savedIds.has(p.osmId)),
        ...props.saved,
      ];
      for (const p of records) {
        if (p.lat === null || p.lng === null) continue;
        const isSaved = 'id' in p,
          key = isSaved ? p.id : p.osmId,
          selected = props.selected === key;
        const marker = L.marker([p.lat, p.lng], {
          title: p.name,
          icon: L.divIcon({
            className: `property-marker ${isSaved ? 'saved-marker' : ''} ${selected ? 'selected-marker' : ''}`,
            html: `<span>${isSaved ? '★' : '•'}</span>`,
            iconSize: selected ? [34, 34] : [26, 26],
            iconAnchor: selected ? [17, 17] : [13, 13],
          }),
        });
        const tip = document.createElement('span');
        tip.textContent = p.name;
        marker.bindTooltip(tip, { direction: 'top', offset: [0, -14] });
        marker.on('click', () => latest.current.onSelect(p));
        marker.addTo(group);
      }
    });
  }, [props.places, props.saved, props.selected, ready]);
  return (
    <>
      <div
        ref={ref}
        className={`map-canvas ${props.placing ? 'placing' : ''}`}
        aria-label="Interactive apartment map. Use arrow keys to pan, plus and minus to zoom."
      />
      {tileError && (
        <output className="tile-error">
          Map tiles are temporarily unavailable. Your saved tracker is still
          accessible.
        </output>
      )}
    </>
  );
}
