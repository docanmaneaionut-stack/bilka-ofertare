import type { MouseEvent } from "react";

// Cosul de stergere (S25, BUG-11; simularea pag. 3): pictograma mica, gri, rosie la
// trecerea cu mouse-ul, la capatul randului, peste tot unde era "x". Nu intra in drumul
// tastaturii (tabIndex -1) si nu raspunde la nicio tasta: stergerea doar cu clic.
export function BtnSterge({ onClick, eticheta, disabled }: { onClick: () => void; eticheta: string; disabled?: boolean }) {
  return (
    <button
      type="button"
      className="cos"
      tabIndex={-1}
      aria-label={eticheta}
      title={eticheta}
      disabled={disabled}
      onClick={(e: MouseEvent<HTMLButtonElement>) => {
        // doar clicul real (cu mouse / atingere); Enter / Space pe buton sunt oprite in onKeyDown
        if (e.detail === 0 && e.nativeEvent instanceof KeyboardEvent) return;
        onClick();
      }}
      onKeyDown={(e) => e.preventDefault()}
      onKeyUp={(e) => e.preventDefault()}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
        <path fill="currentColor" d="M9 3h6a1 1 0 0 1 1 1v1h4a1 1 0 1 1 0 2h-1l-.9 13.1A2 2 0 0 1 16.1 22H7.9a2 2 0 0 1-2-1.9L5 7H4a1 1 0 0 1 0-2h4V4a1 1 0 0 1 1-1Zm1 2h4V4h-4v1ZM7 7l.9 13h8.2L17 7H7Zm3 2a1 1 0 0 1 1 1v8a1 1 0 1 1-2 0v-8a1 1 0 0 1 1-1Zm4 0a1 1 0 0 1 1 1v8a1 1 0 1 1-2 0v-8a1 1 0 0 1 1-1Z" />
      </svg>
    </button>
  );
}
