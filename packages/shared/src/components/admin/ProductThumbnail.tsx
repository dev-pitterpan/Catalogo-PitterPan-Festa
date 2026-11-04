"use client";
import { cardImage } from "../../lib/catalog/image";
const placeholder = "/assets/images/brand/product-placeholder.svg";
export default function ProductThumbnail({ src }: { src: string | null }) {
  return (
    <img
      src={cardImage(src || placeholder, 120)}
      alt=""
      width={48}
      height={48}
      loading="lazy"
      decoding="async"
      onError={(event) => {
        event.currentTarget.onerror = null;
        event.currentTarget.src = placeholder;
      }}
    />
  );
}
