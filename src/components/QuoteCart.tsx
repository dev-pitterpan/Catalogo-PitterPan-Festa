// O painel restaura o foco ao fechar e mantém o teclado dentro dele enquanto está aberto.
import {
  Trash2,
  ShoppingBag,
  X,
  MessageCircle,
  ArrowUpRight,
} from "lucide-react";
import type { QuoteItem } from "../types/catalog";
interface Props {
  selected: QuoteItem[];
  open: boolean;
  onOpen: () => void;
  onClose: () => void;
  onChange: (item: QuoteItem, delta: number) => void;
  onRemove: (id: string) => void;
  onClear: () => void;
  onSend: () => void;
}
import { useEffect, useRef, useState } from "react";
import { Quantity, asset } from "./ProductCard";
import { totalQuantity } from "../lib/quote";
export default function QuoteCart({
  selected,
  open,
  onOpen,
  onClose,
  onChange,
  onRemove,
  onClear,
  onSend,
}: Props) {
  const [buying, setBuying] = useState(false);
  const [checkoutError, setCheckoutError] = useState("");
  // Resolve os IDs atuais no servidor: carrinhos antigos podem não ter a variante salva.
  async function buyOnSite() {
    if (buying || !selected.length) return;
    setBuying(true);
    setCheckoutError("");
    try {
      const response = await fetch("/api/checkout/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: selected.map(({ id, quantity }) => ({ id, quantity })),
        }),
      });
      const result = await response.json();
      if (!response.ok)
        throw new Error(result.error || "Não foi possível preparar a compra.");
      window.location.assign(result.checkoutUrl);
    } catch (error) {
      setCheckoutError(
        error instanceof Error
          ? error.message
          : "Não foi possível preparar a compra. Tente novamente.",
      );
    } finally {
      setBuying(false);
    }
  }
  useEffect(() => {
    setCheckoutError("");
  }, [selected]);
  const count = totalQuantity(selected),
    panelRef = useRef<HTMLElement>(null);
  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement;
    panelRef.current?.focus();
    const trap = (e: KeyboardEvent) => {
      if (e.key !== "Tab") return;
      const nodes = [
        ...(panelRef.current?.querySelectorAll<HTMLElement>(
          "button:not(:disabled), a[href]",
        ) || []),
      ];
      const first = nodes[0],
        last = nodes.at(-1);
      if (
        e.shiftKey &&
        (document.activeElement === first ||
          document.activeElement === panelRef.current)
      ) {
        e.preventDefault();
        last?.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", trap);
    return () => {
      document.removeEventListener("keydown", trap);
      if (previous instanceof HTMLElement) previous.focus();
    };
  }, [open]);
  const grouped = Object.groupBy(
    selected,
    (item) => item.catalog || "Catálogo",
  );
  const groups = count ? (
    Object.entries(grouped).map(([name, items]) => (
      <section className="quote-group" key={name}>
        <header className="quote-group__header">
          <span className="quote-group__dot" />
          <strong>{name}</strong>
          <small>{totalQuantity(items || [])} itens</small>
        </header>
        <div className="quote-group__items">
          {(items || []).map((item) => (
            <article className="quote-item" key={item.id}>
              <div className="quote-item__media">
                <img src={asset(item.image)} alt="" />
              </div>
              <div className="quote-item__content">
                <span className="quote-item__code">{item.id}</span>
                <strong>{item.name}</strong>
                <small>{item.category}</small>
                <Quantity
                  cart
                  name={item.name}
                  quantity={item.quantity}
                  onChange={(delta) => onChange(item, delta)}
                />
              </div>
              <button
                className="quote-item__remove"
                type="button"
                onClick={() => onRemove(item.id)}
                aria-label={`Remover ${item.name} do carrinho`}
              >
                <Trash2 aria-hidden="true" />
              </button>
            </article>
          ))}
        </div>
      </section>
    ))
  ) : (
    <div className="quote-cart__empty">
      <strong>Comece sua seleção</strong>
      <p>
        Escolha os itens que combinam com a sua festa. Eles aparecerão aqui para
        você comprar no site ou pedir um orçamento completo.
      </p>
    </div>
  );
  return (
    <div className="quote-cart-root">
      <button
        className="quote-cart-trigger"
        type="button"
        onClick={onOpen}
        data-cart-open
        aria-label="Abrir carrinho"
      >
        <span className="quote-cart-trigger__icon">
          <ShoppingBag aria-hidden="true" />
          <span className="quote-cart-trigger__count" data-cart-count>
            {count}
          </span>
        </span>
        <span className="quote-cart-trigger__copy">
          <small>Meu carrinho</small>
          <strong>Ver seleção</strong>
        </span>
      </button>

      <button
        className={`quote-cart-backdrop ${open ? "is-open" : ""}`}
        onClick={onClose}
        type="button"
        data-cart-backdrop
        aria-label="Fechar orçamento"
      ></button>

      <aside
        className={`quote-cart ${open ? "is-open" : ""}`}
        ref={panelRef}
        tabIndex={-1}
        role="dialog"
        aria-modal={open || undefined}
        inert={!open}
        data-cart
        aria-label="Carrinho Pitter Pan"
      >
        <header className="quote-cart__header">
          <div className="quote-cart__brand">
            <span className="quote-cart__brandmark">
              <img
                src="/assets/images/brand/pitter-pan-logo.svg"
                alt="Pitter Pan Festas"
              />
            </span>
            <div>
              <p className="quote-cart__eyebrow">Pitter Pan Festas</p>
              <h2 className="quote-cart__title">Meu carrinho</h2>
            </div>
          </div>

          <button
            className="quote-cart__close"
            type="button"
            onClick={onClose}
            data-cart-close
            aria-label="Fechar orçamento"
          >
            <X aria-hidden="true" />
          </button>

          <p className="quote-cart__subtitle">
            Revise seus itens para comprar no site ou pedir orçamento pelo
            WhatsApp.
          </p>

          <div className="quote-cart__summary">
            <div>
              <span>Total de itens</span>
              <strong data-cart-footer-count>{count}</strong>
            </div>
            <div>
              <span>Próximo passo</span>
              <strong>Comprar ou pedir orçamento</strong>
            </div>
          </div>
        </header>

        <div className="quote-cart__items" data-cart-items>
          {groups}
        </div>

        <footer className="quote-cart__footer">
          <div className="quote-cart__footer-copy">
            <span>Sem preços no catálogo</span>
            <strong>
              Preços, estoque e frete serão confirmados na Shopify.
            </strong>
          </div>

          {checkoutError && (
            <p className="quote-cart__checkout-error" role="alert">
              {checkoutError}
            </p>
          )}
          <button
            className="quote-cart__checkout"
            type="button"
            onClick={buyOnSite}
            disabled={!count || buying}
            aria-busy={buying}
          >
            <ShoppingBag aria-hidden="true" />
            <span>{buying ? "Preparando compra…" : "Comprar no site"}</span>
            <ArrowUpRight aria-hidden="true" />
          </button>

          <button
            className="quote-cart__whatsapp"
            type="button"
            onClick={onSend}
            disabled={!count}
            data-cart-whatsapp
          >
            <span className="quote-cart__whatsapp-icon" aria-hidden="true">
              <MessageCircle aria-hidden="true" />
            </span>
            <span>
              <small>Atendimento pelo WhatsApp</small>
              <strong>Pedir orçamento no WhatsApp</strong>
            </span>
            <ArrowUpRight aria-hidden="true" />
          </button>

          <button
            className="quote-cart__clear"
            type="button"
            onClick={onClear}
            disabled={!count}
            data-cart-clear
          >
            Limpar carrinho
          </button>
        </footer>
      </aside>
    </div>
  );
}
