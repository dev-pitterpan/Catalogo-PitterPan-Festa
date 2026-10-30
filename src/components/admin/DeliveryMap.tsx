"use client";
import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin } from "lucide-react";
import PitterSpinner from "./PitterSpinner";
import type { readDestinations } from "../../server/sales/destinations";
import type { Map as LeafletMap } from "leaflet";
type City = Awaited<ReturnType<typeof readDestinations>>["cities"][number];
const number = (n: number) => n.toLocaleString("pt-BR");
export default function DeliveryMap({ cities }: { cities: City[] }) {
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const resetRef = useRef<() => void>(() => {});
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [tilesFailed, setTilesFailed] = useState(false);
  const located = cities.filter((c) => c.location);
  const missing = cities
    .filter((c) => !c.location)
    .reduce((sum, c) => sum + c.orders, 0);
  useEffect(() => {
    let cancelled = false;
    let cleanup = () => {};
    setReady(false);
    setFailed(false);
    setTilesFailed(false);
    void import("leaflet")
      .then((L) => {
        if (cancelled || !container.current) return;
        const map = L.map(container.current, {
          scrollWheelZoom: false,
          zoomControl: true,
          minZoom: 3,
          maxZoom: 16,
        }).setView([-15.5, -51], 4);
        mapRef.current = map;
        L.control.scale({ imperial: false, position: "bottomleft" }).addTo(map);
        const tiles = L.tileLayer(
          "https://tile.openstreetmap.org/{z}/{x}/{y}.png",
          {
            attribution:
              '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
            maxZoom: 19,
          },
        ).addTo(map);
        tiles.on("tileerror", () => {
          if (!cancelled) setTilesFailed(true);
        });
        const points = cities.filter(
          (
            c,
          ): c is City & {
            location: { latitude: number; longitude: number };
          } => c.location !== null,
        );
        const bounds = L.latLngBounds(
          points.map((c) => [c.location.latitude, c.location.longitude]),
        );
        const reset = () => {
          if (bounds.isValid())
            map.fitBounds(bounds, {
              padding: [55, 55],
              maxZoom: 11,
              animate: false,
            });
          else map.setView([-15.5, -51], 4, { animate: false });
        };
        resetRef.current = reset;
        reset();
        const markers = L.layerGroup().addTo(map);
        function draw() {
          markers.clearLayers();
          // Groups use screen distance, so nearby cities separate as the manager zooms in.
          const groups = new Map<string, typeof points>();
          for (const city of points) {
            const position = map.project(
              [city.location.latitude, city.location.longitude],
              map.getZoom(),
            );
            const key = `${Math.floor(position.x / 64)}:${Math.floor(position.y / 64)}`;
            const group = groups.get(key) || [];
            group.push(city);
            groups.set(key, group);
          }
          for (const group of groups.values()) {
            const orders = group.reduce((n, c) => n + c.orders, 0),
              units = group.reduce((n, c) => n + c.units, 0);
            const lat =
              group.reduce((n, c) => n + c.location.latitude, 0) / group.length;
            const lng =
              group.reduce((n, c) => n + c.location.longitude, 0) /
              group.length;
            const places = [
              ...new Set(group.map((c) => `${c.city} · ${c.state}`)),
            ];
            const title = `${places.length === 1 ? places[0] : `${places.length} cidades`}: ${number(orders)} pedidos, ${number(units)} unidades`;
            const marker = L.marker([lat, lng], {
              alt: title,
              keyboard: true,
              icon: L.divIcon({
                className: "delivery-map-pin",
                html: `<span class="${places.length > 1 ? "is-cluster" : ""}">${number(orders)}</span>`,
                iconSize: [32, 32],
                iconAnchor: [16, 16],
              }),
              riseOnHover: true,
            }).addTo(markers);
            // DOM textContent avoids interpreting merchant or customer text as HTML.
            const tooltip = document.createElement("div");
            const tooltipTitle = document.createElement("strong");
            tooltipTitle.textContent =
              places.length === 1
                ? places[0]
                : `${places.length} cidades próximas`;
            const tooltipCount = document.createElement("span");
            tooltipCount.textContent = `${number(orders)} pedidos · ${number(units)} unidades`;
            tooltip.append(tooltipTitle, tooltipCount);
            const list = document.createElement("div");
            list.className = "delivery-map-city-list";
            for (const city of group.slice(0, 4)) {
              const row = document.createElement("div");
              const name = document.createElement("span");
              name.textContent = `${city.city} · ${city.state}`;
              const count = document.createElement("b");
              count.textContent = `${number(city.orders)} pedidos`;
              row.append(name, count);
              list.append(row);
            }
            if (places.length > 4) {
              const more = document.createElement("small");
              more.textContent = `Mais ${places.length - 4} cidades. Aproxime para detalhar.`;
              list.append(more);
            }
            if (places.length > 1) tooltip.append(list);
            // Explicit hover events keep Leaflet's click/touch bindings out.
            const hover = L.tooltip({
              direction: "auto",
              offset: [0, -14],
              className: "delivery-map-hover",
            }).setContent(tooltip);
            const showDetails = () =>
              hover.setLatLng(marker.getLatLng()).addTo(map);
            const hideDetails = () => hover.remove();
            marker.on("mouseover", showDetails);
            marker.on("mouseout", hideDetails);
            marker.on("remove", hideDetails);
            const element = marker.getElement();
            element?.setAttribute("aria-label", title);
            element?.addEventListener("focus", () => {
              if (element.matches(":focus-visible")) showDetails();
            });
            element?.addEventListener("blur", hideDetails);
            marker.on("click", () => {
              hideDetails();
              if (places.length > 1) {
                const groupBounds = L.latLngBounds(
                  group.map((c) => [c.location.latitude, c.location.longitude]),
                );
                map.fitBounds(groupBounds, {
                  padding: [65, 65],
                  maxZoom: Math.min(16, map.getZoom() + 3),
                });
              }
            });
          }
        }
        map.on("zoomend", draw);
        draw();
        const resize = new ResizeObserver(() =>
          map.invalidateSize({ animate: false }),
        );
        resize.observe(container.current);
        setReady(true);
        cleanup = () => {
          resize.disconnect();
          map.remove();
          mapRef.current = null;
          resetRef.current = () => {};
        };
      })
      .catch(() => {
        if (!cancelled) setFailed(true);
      });
    return () => {
      cancelled = true;
      cleanup();
    };
  }, [cities]);
  return (
    <div className="delivery-map">
      <div className="delivery-map-toolbar">
        <span>
          <MapPin size={14} />
          {number(located.reduce((n, c) => n + c.orders, 0))} pedidos
          localizados
        </span>
        <button
          className="admin-button"
          onClick={() => resetRef.current()}
          disabled={!ready}
        >
          <LocateFixed size={15} /> Enquadrar destinos
        </button>
      </div>
      <div className="delivery-map-stage">
        <div
          ref={container}
          className="delivery-map-canvas"
          role="region"
          aria-label="Mapa interativo das entregas por cidade. Passe o mouse ou use Tab nos pontos para consultar quantidades. Clique nos agrupamentos para aproximar."
        />
        {!ready && !failed && (
          <div className="delivery-map-overlay">
            <PitterSpinner label="Preparando o mapa…" />
          </div>
        )}
        {failed && (
          <div className="delivery-map-overlay" role="alert">
            Não foi possível abrir o mapa. Consulte os destinos na tabela
            abaixo.
          </div>
        )}
        {ready && !located.length && (
          <div className="delivery-map-empty">
            Nenhum destino localizado nesta seleção.
          </div>
        )}
      </div>
      {tilesFailed && (
        <p className="delivery-map-warning" role="status">
          O fundo do mapa não pôde ser carregado completamente. As quantidades
          continuam disponíveis nos pontos e na tabela.
        </p>
      )}
      <div className="delivery-map-legend">
        <span>
          <i /> Número no ponto = pedidos
        </span>
        <span>
          <i className="is-group" /> Pontos próximos são agrupados
        </span>
      </div>
      <p className="delivery-map-note">
        Localização aproximada por cidade, sem indicar o endereço do cliente.
        Passe o mouse nos pontos para ver pedidos e unidades. Clique nos
        agrupamentos para aproximar.
        {missing > 0 &&
          ` ${number(missing)} pedidos sem coordenadas nesta seleção estão na tabela.`}
      </p>
    </div>
  );
}
