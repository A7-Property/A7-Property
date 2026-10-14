"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { MapPin, Navigation } from "lucide-react";
import { useLanguage } from "@/components/i18n/language-provider";
import type { Property } from "@/lib/properties";
import { formatCompactPrice } from "@/lib/properties";
import { cn } from "@/lib/utils";

interface PropertyMapProps {
  properties: Property[];
  selectedId?: string | null;
  onSelect?: (id: string) => void;
  className?: string;
  compact?: boolean;
  markerLabel?: (property: Property) => string;
  /** Allows web-only tile hosting without changing existing app map behavior. */
  tileUrl?: string;
  /** Desktop result synchronization when a marker is activated by keyboard. */
  keyboardSelection?: boolean;
  showPrivacyNotice?: boolean;
  showLiveLabel?: boolean;
  drawArea?: boolean;
  drawnBounds?: MapSearchBounds | null;
  onDrawArea?: (bounds: MapSearchBounds) => void;
}

interface MapSearchBounds {
  north: number;
  south: number;
  east: number;
  west: number;
}

type LeafletModule = typeof import("leaflet");
type ReactLeafletModule = typeof import("react-leaflet");

let leafletPromise: Promise<{ L: LeafletModule; RL: ReactLeafletModule }> | null = null;

function loadLeaflet() {
  if (!leafletPromise) {
    leafletPromise = Promise.all([
      import("leaflet"),
      import("react-leaflet"),
    ]).then(([L, RL]) => {
      L.default.Marker.prototype.options.icon = L.default.divIcon({ className: "" });
      return { L: L.default, RL } as { L: LeafletModule; RL: ReactLeafletModule };
    });
  }
  return leafletPromise;
}

function makePriceIcon(L: LeafletModule, label: string, selected: boolean) {
  const bg = selected ? "#101828" : "#123B73";
  const html = `<div style="background:${bg};color:#fff;border:2px solid #fff;border-radius:999px;padding:4px 10px;font-size:10px;font-weight:700;font-family:inherit;white-space:nowrap;box-shadow:0 3px 12px rgba(16,24,40,.25)">${label}</div>`;
  return L.divIcon({ html, className: "a7-price-marker", iconSize: [0, 0], iconAnchor: [0, 0] });
}

function makeSingleIcon(L: LeafletModule) {
  const html = `<div style="filter:drop-shadow(0 4px 10px rgba(18,59,115,.35))"><svg xmlns="http://www.w3.org/2000/svg" width="36" height="36" viewBox="0 0 24 24" fill="#4DA3FF" stroke="#fff" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3" fill="#fff"/></svg></div>`;
  return L.divIcon({ html, className: "a7-single-marker", iconSize: [36, 36], iconAnchor: [18, 36] });
}

/**
 * A lister is not required to provide coordinates. Such a listing is left off
 * the map entirely rather than pinned at a guessed position.
 */
type LocatedProperty = Property & { lat: number; lng: number };

function hasPosition(property: Property): property is LocatedProperty {
  return property.lat !== null && property.lng !== null;
}

function FitBounds({ L, RL, properties, selectedId }: { L: LeafletModule; RL: ReactLeafletModule; properties: LocatedProperty[]; selectedId?: string | null }) {
  const map = RL.useMap();

  useEffect(() => {
    if (properties.length === 0) return;
    if (properties.length === 1) {
      map.setView([properties[0].lat, properties[0].lng], 15, { animate: true });
      return;
    }
    const bounds = L.latLngBounds(properties.map((p) => [p.lat, p.lng] as [number, number]));
    if (selectedId) {
      const sel = properties.find((p) => p.id === selectedId);
      if (sel) {
        map.flyTo([sel.lat, sel.lng], 15, { duration: 0.5 });
        return;
      }
    }
    map.fitBounds(bounds, { padding: [40, 40], maxZoom: 14 });
  }, [properties, selectedId, map, L]);

  return null;
}

function DrawSearchArea({ RL, onDrawArea }: { RL: ReactLeafletModule; onDrawArea?: (bounds: MapSearchBounds) => void }) {
  const [start, setStart] = useState<[number, number] | null>(null);
  const minimumSpan = 0.0005;

  RL.useMapEvents({
    click(event) {
      const point: [number, number] = [event.latlng.lat, event.latlng.lng];
      if (!start) {
        setStart(point);
        return;
      }

      // Ignore an accidental double-tap on the same spot. A real search area
      // needs two visibly separate corners to avoid a zero-result point query.
      if (
        Math.abs(start[0] - point[0]) < minimumSpan
        && Math.abs(start[1] - point[1]) < minimumSpan
      ) {
        setStart(point);
        return;
      }

      onDrawArea?.({
        north: Math.max(start[0], point[0]),
        south: Math.min(start[0], point[0]),
        east: Math.max(start[1], point[1]),
        west: Math.min(start[1], point[1]),
      });
      setStart(null);
    },
  });

  return (
    start ? <RL.CircleMarker center={start} radius={7} pathOptions={{ color: "#FFFFFF", weight: 3, fillColor: "#4DA3FF", fillOpacity: 1 }} /> : null
  );
}

function PropertyMap({ properties, selectedId, onSelect, className, compact = false, markerLabel, showPrivacyNotice = true, showLiveLabel = true, tileUrl = "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png", keyboardSelection = false, drawArea = false, drawnBounds, onDrawArea }: PropertyMapProps) {
  const { isMyanmar, tx } = useLanguage();
  const [modules, setModules] = useState<{ L: LeafletModule; RL: ReactLeafletModule } | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let active = true;
    loadLeaflet().then((mods) => { if (active) setModules(mods); });
    return () => { active = false; };
  }, []);

  const isSingle = properties.length === 1;
  const priceLang = isMyanmar ? "my" : "en";

  const markers = useMemo(
    () =>
      properties.filter(hasPosition).slice(0, isSingle ? 1 : 80).map((property) => {
        const selected = property.id === selectedId;
        const priceLabel = markerLabel?.(property) ?? formatCompactPrice(property, priceLang);
        return { property, selected, priceLabel };
      }),
    [properties, selectedId, isSingle, markerLabel, priceLang],
  );

  return (
    <section
      className={cn(
        "relative isolate overflow-hidden rounded-[20px] border border-[#101828]/10 bg-[#DCEBFF]",
        compact ? "min-h-[300px]" : "min-h-[420px]",
        className,
      )}
      aria-label={tx("Property map", "အိမ်တည်နေရာမြေပုံ")}
      ref={containerRef}
    >
      {modules ? (
        <modules.RL.MapContainer
          center={[16.8409, 96.1735]}
          zoom={12}
          scrollWheelZoom
          className="absolute inset-0 z-0 h-full w-full"
          style={{ background: "#DCEBFF" }}
        >
          <modules.RL.TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
            url={tileUrl}
          />
          {markers.map(({ property, selected, priceLabel }) => (
            <modules.RL.Marker
              key={property.id}
              title={property.title}
              position={[property.lat, property.lng]}
              icon={isSingle ? makeSingleIcon(modules.L) : makePriceIcon(modules.L, priceLabel, selected)}
              zIndexOffset={selected ? 1000 : 0}
              eventHandlers={{
                click: () => onSelect?.(property.id),
                ...(keyboardSelection ? { keypress: (event: import("leaflet").LeafletKeyboardEvent) => {
                  if (event.originalEvent.key === "Enter" || event.originalEvent.key === " ") {
                    event.originalEvent.preventDefault();
                    onSelect?.(property.id);
                  }
                } } : {}),
              }}
            >
              <modules.RL.Popup>
                <div className="min-w-[180px]">
                  <strong className="block text-xs font-semibold leading-snug">{property.title}</strong>
                  <span className="mt-1 block text-[10px] text-gray-500">{property.township}, {property.city}</span>
                  <span className="mt-1.5 block text-xs font-bold text-[#123B73]">{priceLabel}{property.purpose === "rent" ? tx("/mo", "/လ") : ""}</span>
                </div>
              </modules.RL.Popup>
            </modules.RL.Marker>
          ))}
          {drawnBounds && <modules.RL.Rectangle bounds={[[drawnBounds.south, drawnBounds.west], [drawnBounds.north, drawnBounds.east]]} pathOptions={{ color: "#4DA3FF", weight: 2, fillColor: "#4DA3FF", fillOpacity: 0.12 }} />}
          {drawArea && <DrawSearchArea RL={modules.RL} onDrawArea={onDrawArea} />}
          <FitBounds L={modules.L} RL={modules.RL} properties={markers.map((m) => m.property)} selectedId={selectedId} />
        </modules.RL.MapContainer>
      ) : (
        <div className="flex h-full min-h-[420px] items-center justify-center" role="status" aria-live="polite">
          <div className="flex flex-col items-center gap-3 text-[#667085]">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[#123B73] border-t-transparent" aria-hidden="true" />
            <span className="text-xs font-medium">{tx("Loading map…", "မြေပုံ ဖွင့်နေသည်…")}</span>
          </div>
        </div>
      )}
      {showLiveLabel && <div className="pointer-events-none absolute right-4 top-4 z-[500] flex items-center gap-2 rounded-full border border-white/80 bg-white/90 px-3 py-2 text-[10px] font-medium text-[#667085] shadow-sm backdrop-blur">
        <Navigation className="size-3.5 text-[#123B73]" /> {tx("Live map", "လက်ရှိမြေပုံ")}
      </div>}
      {showPrivacyNotice && <div className="pointer-events-none absolute bottom-4 left-4 z-[500] flex max-w-[250px] items-start gap-2 rounded-xl border border-white/80 bg-white/90 p-3 text-[9px] leading-4 text-[#667085] shadow-sm backdrop-blur">
        <MapPin className="mt-0.5 size-3.5 shrink-0 text-[#123B73]" /> {tx("Exact addresses remain private until an owner confirms your inquiry.", "ပိုင်ရှင်က သင့်မေးမြန်းမှုကို အတည်ပြုမချင်း လိပ်စာအတိအကျကို သီးသန့်ထားပါသည်။")}
      </div>}
    </section>
  );
}

export { PropertyMap };
export type { MapSearchBounds };
