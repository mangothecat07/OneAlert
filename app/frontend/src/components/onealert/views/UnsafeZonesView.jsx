import React, { useState, useEffect } from "react";
import { GoogleMap, useJsApiLoader, Circle, Marker } from "@react-google-maps/api";
import { Map, AlertTriangle, ShieldAlert } from "lucide-react";

const containerStyle = {
  width: "100%",
  height: "100%",
  borderRadius: "0.75rem",
};

// Center on India as default
const defaultCenter = {
  lat: 20.5937,
  lng: 78.9629,
};

const mapOptions = {
  disableDefaultUI: false,
  zoomControl: true,
  streetViewControl: false,
  mapTypeControl: false,
  fullscreenControl: true,
  styles: [
    // Dark mode map styles roughly matching the app
    { elementType: "geometry", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.stroke", stylers: [{ color: "#242f3e" }] },
    { elementType: "labels.text.fill", stylers: [{ color: "#746855" }] },
    {
      featureType: "administrative.locality",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "poi",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "poi.park",
      elementType: "geometry",
      stylers: [{ color: "#263c3f" }],
    },
    {
      featureType: "poi.park",
      elementType: "labels.text.fill",
      stylers: [{ color: "#6b9a76" }],
    },
    {
      featureType: "road",
      elementType: "geometry",
      stylers: [{ color: "#38414e" }],
    },
    {
      featureType: "road",
      elementType: "geometry.stroke",
      stylers: [{ color: "#212a37" }],
    },
    {
      featureType: "road",
      elementType: "labels.text.fill",
      stylers: [{ color: "#9ca5b3" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry",
      stylers: [{ color: "#746855" }],
    },
    {
      featureType: "road.highway",
      elementType: "geometry.stroke",
      stylers: [{ color: "#1f2835" }],
    },
    {
      featureType: "road.highway",
      elementType: "labels.text.fill",
      stylers: [{ color: "#f3d19c" }],
    },
    {
      featureType: "transit",
      elementType: "geometry",
      stylers: [{ color: "#2f3948" }],
    },
    {
      featureType: "transit.station",
      elementType: "labels.text.fill",
      stylers: [{ color: "#d59563" }],
    },
    {
      featureType: "water",
      elementType: "geometry",
      stylers: [{ color: "#17263c" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.fill",
      stylers: [{ color: "#515c6d" }],
    },
    {
      featureType: "water",
      elementType: "labels.text.stroke",
      stylers: [{ color: "#17263c" }],
    },
  ],
};

const UnsafeZonesView = () => {
  const [zones, setZones] = useState([]);
  const [loading, setLoading] = useState(true);
  
  // Use a blank string if undefined to force the map to render (it will show 'development purposes only' watermark)
  const apiKey = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || "";

  const { isLoaded } = useJsApiLoader({
    id: "google-map-script",
    googleMapsApiKey: apiKey,
  });

  useEffect(() => {
    const fetchZones = async () => {
      try {
        const resp = await fetch(`${import.meta.env.VITE_BACKEND_URL}/api/unsafe-zones`);
        if (resp.ok) {
          const data = await resp.json();
          setZones(data.zones || []);
        }
      } catch (e) {
        console.error("Failed to fetch unsafe zones", e);
      } finally {
        setLoading(false);
      }
    };
    fetchZones();
  }, []);

  const getCircleOptions = (threatLevel) => {
    let fillColor = "#ef4444"; // danger
    if (threatLevel === "high") fillColor = "#f97316"; // orange
    if (threatLevel === "medium") fillColor = "#eab308"; // yellow

    return {
      strokeColor: fillColor,
      strokeOpacity: 0.8,
      strokeWeight: 2,
      fillColor: fillColor,
      fillOpacity: 0.35,
      clickable: false,
      draggable: false,
      editable: false,
      visible: true,
      zIndex: 1,
    };
  };

  return (
    <div className="h-full flex flex-col gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-10 pr-1">
      <div className="flex flex-col gap-1 shrink-0 px-2">
        <h2 className="text-2xl font-display font-bold text-[var(--danger)] flex items-center gap-3">
          <Map size={28} />
          Unsafe Zones Prediction
        </h2>
        <p className="text-sm text-[var(--text-secondary)]">
          AI-generated 1km-radius risk areas based on real-time incident density and threat analysis.
        </p>
      </div>

      <div className="flex-1 relative bg-[var(--surface)] border border-[var(--border)] rounded-xl overflow-hidden min-h-[400px]">
        {!isLoaded ? (
          <div className="absolute inset-0 flex items-center justify-center text-[var(--text-secondary)] font-mono text-sm">
            Loading Google Maps...
          </div>
        ) : (
          <GoogleMap
            mapContainerStyle={containerStyle}
            center={zones.length > 0 ? zones[0].center : defaultCenter}
            zoom={zones.length > 0 ? 12 : 5}
            options={mapOptions}
          >
            {zones.map((zone) => (
              <React.Fragment key={zone.id}>
                <Circle
                  center={zone.center}
                  radius={zone.radius_meters}
                  options={getCircleOptions(zone.threat_level)}
                />
                <Marker
                  position={zone.center}
                  icon={{
                    path: typeof window !== "undefined" && window.google ? window.google.maps.SymbolPath.CIRCLE : 0,
                    scale: 6,
                    fillColor: zone.threat_level === "critical" ? "#ef4444" : "#f97316",
                    fillOpacity: 1,
                    strokeWeight: 2,
                    strokeColor: "#ffffff",
                  }}
                  title={`High Risk Zone: ${zone.incident_count} recent incidents`}
                />
              </React.Fragment>
            ))}
          </GoogleMap>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 shrink-0 px-2 mt-2">
        <div className="p-4 rounded-xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 flex items-center gap-4">
          <ShieldAlert className="text-[var(--danger)] w-8 h-8" />
          <div>
            <h4 className="font-bold text-sm text-[var(--text-primary)]">Critical Zones</h4>
            <p className="text-xs text-[var(--text-secondary)]">High density of active physical emergencies</p>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-orange-500/30 bg-orange-500/5 flex items-center gap-4">
          <AlertTriangle className="text-orange-500 w-8 h-8" />
          <div>
            <h4 className="font-bold text-sm text-[var(--text-primary)]">High Risk</h4>
            <p className="text-xs text-[var(--text-secondary)]">Elevated threat level or recent crimes</p>
          </div>
        </div>
        <div className="p-4 rounded-xl border border-[var(--border)] bg-[var(--surface)] flex flex-col justify-center">
          <h4 className="font-bold text-sm text-[var(--text-primary)]">Radius Definition</h4>
          <p className="text-xs text-[var(--text-secondary)]">1km boundary from cluster center</p>
        </div>
      </div>
    </div>
  );
};

export default UnsafeZonesView;
