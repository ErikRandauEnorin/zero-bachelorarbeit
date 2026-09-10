"use client"; // Client component: Leaflet needs the browser DOM/window

import { useEffect, useMemo } from "react";
import { MapContainer, TileLayer, Marker, Tooltip, useMap } from "react-leaflet";
import L from "leaflet";
import type { StorageAsset } from "@/lib/types";

/** Lightning-bolt marker icon: green when active, red when disconnected. */
function voltIcon(active: boolean, selected: boolean): L.DivIcon {
  const color = active ? "#16a34a" : "#dc2626";
  const size = selected ? 46 : 38;
  // Selected markers get an extra outer ring for emphasis
  const ring = selected
    ? `<circle cx="24" cy="24" r="21" fill="none" stroke="${color}" stroke-width="2" opacity="0.85"/>`
    : "";
  const html = `
    <svg width="${size}" height="${size}" viewBox="0 0 48 48" xmlns="http://www.w3.org/2000/svg">
      ${ring}
      <circle cx="24" cy="24" r="15" fill="#ffffff" stroke="${color}" stroke-width="3"/>
      <path d="M26 13 L17 26 h6 l-2 9 10-14 h-6 l3-8 z" fill="${color}"/>
    </svg>`;
  return L.divIcon({
    html,
    className: "asset-marker",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
  });
}

/** Flies the map viewport to the selected asset whenever the selection changes. */
function FlyTo({ asset }: { asset?: StorageAsset }) {
  const map = useMap();
  useEffect(() => {
    if (asset) {
      map.flyTo([asset.lat, asset.lng], 9, { duration: 0.8 });
    }
  }, [asset, map]);
  return null;
}

// Interactive Leaflet map showing all storage assets as markers, with a
// fly-to animation when the selection changes and tooltips on hover.
export default function AssetMap({
  assets,
  selectedId,
  onSelect,
}: {
  assets: StorageAsset[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const selected = useMemo(
    () => assets.find((a) => a.id === selectedId),
    [assets, selectedId],
  );

  return (
    <MapContainer
      center={[51.3, 10.2]}
      zoom={6}
      scrollWheelZoom
      className="h-full w-full"
      style={{ background: "#e8edf0" }}
    >
      {/* CARTO Voyager basemap tiles (light, minimal style) */}
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> · CARTO'
        url="https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
      />
      <FlyTo asset={selected} />
      {assets.map((a) => (
        <Marker
          key={a.id}
          position={[a.lat, a.lng]}
          icon={voltIcon(a.status === "aktiv", a.id === selectedId)}
          eventHandlers={{ click: () => onSelect(a.id) }}
          zIndexOffset={a.id === selectedId ? 1000 : 0} // Keep the selected marker above others
        >
          {/* Hover tooltip with a quick summary of the asset */}
          <Tooltip direction="top" offset={[0, -18]} opacity={1}>
            <div className="text-xs">
              <div className="font-semibold text-navy-900">
                {a.manufacturer} {a.model}
              </div>
              <div className="text-navy-600">
                {a.address.city} · {a.status === "aktiv" ? "aktiv" : "getrennt"} ·{" "}
                {a.soc}%
              </div>
            </div>
          </Tooltip>
        </Marker>
      ))}
    </MapContainer>
  );
}
