'use client';
import { useState, useEffect } from 'react';
import LeafletMap, { type MapProps } from './apartment-map';
import GoogleMap from './google-map';
import { getMapConfig } from '@/lib/client';
export default function MapProvider(props: MapProps) {
  const [config, setConfig] = useState<{
      googleMapsApiKey: string;
      googleMapsMapId: string;
    } | null>(null),
    [failed, setFailed] = useState(false);
  useEffect(() => {
    let live = true;
    const refresh = () => {
      setFailed(false);
      getMapConfig()
        .then((d) => {
          if (live) setConfig(d);
        })
        .catch(() => {
          if (live) setConfig({ googleMapsApiKey: '', googleMapsMapId: '' });
        });
    };
    refresh();
    window.addEventListener('homebase-map-config', refresh);
    return () => {
      live = false;
      window.removeEventListener('homebase-map-config', refresh);
    };
  }, []);
  return (
    <>
      {config?.googleMapsApiKey && !failed ? (
        <GoogleMap
          {...props}
          apiKey={config.googleMapsApiKey}
          mapId={config.googleMapsMapId}
          onFailure={() => setFailed(true)}
        />
      ) : (
        <LeafletMap {...props} />
      )}
      <div className="map-provider-label">
        {config?.googleMapsApiKey && !failed ? 'Google Maps' : 'OpenStreetMap'}
        {failed ? ' · Google Maps could not load' : ''}
      </div>
    </>
  );
}
