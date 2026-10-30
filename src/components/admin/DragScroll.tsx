"use client";

import { useRef, type ReactNode } from "react";

export default function DragScroll({ children }: { children: ReactNode }) {
  const gesture = useRef<{
    id: number;
    x: number;
    y: number;
    left: number;
    top: number;
    dragging: boolean;
  } | null>(null);
  const suppressClick = useRef(false);

  return (
    <div
      className="admin-table-scroll finance-table-viewport drag-scroll"
      role="region"
      tabIndex={0}
      aria-label="Pedidos com rolagem. Clique e arraste para navegar pela tabela."
      onPointerDown={(event) => {
        if (event.pointerType !== "mouse" || event.button !== 0) return;
        const node = event.currentTarget;
        const rect = node.getBoundingClientRect();
        if (
          (event.target as Element).closest(
            "a, button, input, select, textarea",
          ) ||
          event.clientX - rect.left >= node.clientWidth ||
          event.clientY - rect.top >= node.clientHeight
        )
          return;
        suppressClick.current = false;
        gesture.current = {
          id: event.pointerId,
          x: event.clientX,
          y: event.clientY,
          left: node.scrollLeft,
          top: node.scrollTop,
          dragging: false,
        };
      }}
      onPointerMove={(event) => {
        const start = gesture.current;
        if (!start || start.id !== event.pointerId) return;
        if (!(event.buttons & 1)) {
          gesture.current = null;
          delete event.currentTarget.dataset.dragging;
          return;
        }
        const dx = event.clientX - start.x;
        const dy = event.clientY - start.y;
        if (!start.dragging && Math.hypot(dx, dy) < 5) return;
        if (!start.dragging) {
          start.dragging = true;
          event.currentTarget.setPointerCapture(event.pointerId);
          event.currentTarget.dataset.dragging = "true";
        }
        event.preventDefault();
        event.currentTarget.scrollLeft = start.left - dx;
        event.currentTarget.scrollTop = start.top - dy;
      }}
      onPointerUp={(event) => {
        suppressClick.current = gesture.current?.dragging ?? false;
        gesture.current = null;
        delete event.currentTarget.dataset.dragging;
        if (event.currentTarget.hasPointerCapture(event.pointerId)) {
          event.currentTarget.releasePointerCapture(event.pointerId);
        }
      }}
      onLostPointerCapture={(event) => {
        gesture.current = null;
        delete event.currentTarget.dataset.dragging;
      }}
      onPointerCancel={(event) => {
        gesture.current = null;
        delete event.currentTarget.dataset.dragging;
      }}
      onClickCapture={(event) => {
        if (!suppressClick.current) return;
        suppressClick.current = false;
        event.preventDefault();
        event.stopPropagation();
      }}
      onDragStart={(event) => event.preventDefault()}
    >
      {children}
    </div>
  );
}
