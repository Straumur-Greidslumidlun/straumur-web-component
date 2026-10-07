import { h } from "preact";
import { useRef } from "preact/hooks";
import { RenderBrandIcon } from "../../utils/renderBrandIcons";
import CheckmarkIcon from "../../assets/icons/checkmark";

type DualBrandConfiguration = {
  brand1: string;
  brand1Name?: string;
  brand1ImageUrl?: string;
  brand2: string;
  brand2Name?: string;
  brand2ImageUrl?: string;
};

interface RenderDualBrandComponentProps {
  dualBrandConfiguration: DualBrandConfiguration;
  selectedBrand: string | null;
  onBrandClick: (e: h.JSX.TargetedMouseEvent<HTMLSpanElement>) => void;
  /** Accessible name of the radiogroup (localized by the caller). */
  label: string;
}

interface BrandOptionProps {
  brand: string;
  brandName?: string;
  isSelected: boolean;
  /** Roving tabindex: only one option of the group is in the tab order. */
  isTabStop: boolean;
  onBrandClick: (e: h.JSX.TargetedMouseEvent<HTMLSpanElement>) => void;
  onArrow: (from: HTMLSpanElement) => void;
}

const ARROW_KEYS = ["ArrowRight", "ArrowDown", "ArrowLeft", "ArrowUp"];

function BrandOption({
  brand,
  brandName,
  isSelected,
  isTabStop,
  onBrandClick,
  onArrow,
}: BrandOptionProps): h.JSX.Element {
  // Enter/Space activate the option like a click. Synthesizing a real click (rather than calling
  // onBrandClick directly) keeps the currentTarget/data-value that Adyen's dualBrandingChangeHandler reads.
  const handleKeyDown = (e: h.JSX.TargetedKeyboardEvent<HTMLSpanElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.currentTarget.click();
    } else if (ARROW_KEYS.includes(e.key)) {
      e.preventDefault();
      onArrow(e.currentTarget);
    }
  };

  return (
    <span
      className={
        `straumur__card-component__dual-branding--logo` +
        (isSelected ? " straumur__card-component__dual-branding--logo--selected" : "")
      }
      title={brand}
      data-value={brand}
      onClick={onBrandClick}
      onKeyDown={handleKeyDown}
      role="radio"
      aria-checked={isSelected}
      aria-label={brandName ?? brand}
      tabIndex={isTabStop ? 0 : -1}
    >
      <div className="straumur__card-component__dual-branding--logo--item">
        <RenderBrandIcon brand={brand} defaultToBrandName={false} />
        &nbsp;{brandName ?? ""}
      </div>
      {isSelected && <CheckmarkIcon color="var(--straumur__color-neon-green-zeta)" />}
    </span>
  );
}

/**
 * Co-badged card brand picker, following the WAI-ARIA radio group pattern: one tab stop (the selected
 * option, or the first while none is), and arrow keys move focus to the other option and select it.
 */
export function RenderDualBrandComponent({
  dualBrandConfiguration,
  selectedBrand,
  onBrandClick,
  label,
}: RenderDualBrandComponentProps): h.JSX.Element {
  const groupRef = useRef<HTMLDivElement>(null);
  const { brand1, brand2 } = dualBrandConfiguration;
  const firstIsTabStop = selectedBrand !== brand2;

  // Two options, so every arrow direction lands on "the other one" (wrapping, per the pattern).
  const handleArrow = (from: HTMLSpanElement) => {
    const options = Array.from(groupRef.current?.querySelectorAll<HTMLSpanElement>('[role="radio"]') ?? []);
    const next = options.find((option) => option !== from);
    if (next) {
      next.focus();
      next.click();
    }
  };

  return (
    <div className="straumur__card-component__dual-branding" role="radiogroup" aria-label={label} ref={groupRef}>
      <BrandOption
        brand={brand1}
        brandName={dualBrandConfiguration.brand1Name}
        isSelected={selectedBrand === brand1}
        isTabStop={firstIsTabStop}
        onBrandClick={onBrandClick}
        onArrow={handleArrow}
      />
      <BrandOption
        brand={brand2}
        brandName={dualBrandConfiguration.brand2Name}
        isSelected={selectedBrand === brand2}
        isTabStop={!firstIsTabStop}
        onBrandClick={onBrandClick}
        onArrow={handleArrow}
      />
    </div>
  );
}

export type { DualBrandConfiguration };
