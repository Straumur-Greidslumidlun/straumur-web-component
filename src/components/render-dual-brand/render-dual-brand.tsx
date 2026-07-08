import { h } from "preact";
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
}

interface BrandOptionProps {
  brand: string;
  brandName?: string;
  isSelected: boolean;
  onBrandClick: (e: h.JSX.TargetedMouseEvent<HTMLSpanElement>) => void;
}

function BrandOption({ brand, brandName, isSelected, onBrandClick }: BrandOptionProps): h.JSX.Element {
  // Enter/Space activate the option like a click. Synthesizing a real click (rather than calling
  // onBrandClick directly) keeps the currentTarget/data-value that Adyen's dualBrandingChangeHandler reads.
  const handleKeyDown = (e: h.JSX.TargetedKeyboardEvent<HTMLSpanElement>) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      e.currentTarget.click();
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
      tabIndex={0}
    >
      <div className="straumur__card-component__dual-branding--logo--item">
        <RenderBrandIcon brand={brand} defaultToBrandName={false} />
        &nbsp;{brandName ?? ""}
      </div>
      {isSelected && <CheckmarkIcon color="var(--straumur__color-neon-green-zeta)" />}
    </span>
  );
}

export function RenderDualBrandComponent({
  dualBrandConfiguration,
  selectedBrand,
  onBrandClick,
}: RenderDualBrandComponentProps): h.JSX.Element {
  return (
    <div className="straumur__card-component__dual-branding" role="radiogroup" aria-label="Card brand">
      <BrandOption
        brand={dualBrandConfiguration.brand1}
        brandName={dualBrandConfiguration.brand1Name}
        isSelected={selectedBrand === dualBrandConfiguration.brand1}
        onBrandClick={onBrandClick}
      />
      <BrandOption
        brand={dualBrandConfiguration.brand2}
        brandName={dualBrandConfiguration.brand2Name}
        isSelected={selectedBrand === dualBrandConfiguration.brand2}
        onBrandClick={onBrandClick}
      />
    </div>
  );
}

export type { DualBrandConfiguration };
