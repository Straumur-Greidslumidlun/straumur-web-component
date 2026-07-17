import { Fragment, h } from "preact";
import MasterCardIcon from "../assets/icons/mastercard";
import VisaIcon from "../assets/icons/visa";
import MaestroIcon from "../assets/icons/maestro";
import AmexIcon from "../assets/icons/amex";
import JcbIcon from "../assets/icons/jcb";
import DinersIcon from "../assets/icons/diners";
import DiscoverIcon from "../assets/icons/discover";
import CupIcon from "../assets/icons/cup";
import { Tooltip } from "../components/tooltip/tooltip";
import { useMediaQuery } from "./custom-hooks/use-media-query";
import { ResolvedTheme } from "../models/models";

interface BrandIcon {
  brand: string;
  brandFullName: string;
}

export interface BrandHidden {
  brand: string;
}

interface RenderBrandIconsProps {
  brands: BrandIcon[];
  brandHidden?: BrandHidden[];
  limit?: number;
  /** Resolved widget theme. On "dark" the brand marks switch to their reversed/chipped variants. */
  theme?: ResolvedTheme;
}

// Preferred display order for the most common card brands; anything not listed is appended after
// these, keeping the order the backend sent them in (Array.prototype.sort is stable).
const BRAND_DISPLAY_ORDER = ["visa", "mc", "maestro", "amex", "jcb", "cup"];

const brandRank = (brand: string): number => {
  const index = BRAND_DISPLAY_ORDER.indexOf(brand);

  return index === -1 ? BRAND_DISPLAY_ORDER.length : index;
};

export function RenderBrandIcons({
  brands,
  brandHidden = [],
  limit = 4,
  theme = "light",
}: RenderBrandIconsProps): h.JSX.Element {
  const isWidth380 = useMediaQuery("(max-width: 380px)");
  const isWidth335 = useMediaQuery("(max-width: 335px)");
  const widthLimit = isWidth335 ? 1 : isWidth380 ? 2 : limit;

  const brandToShow = brands
    .filter((brand) => !brandHidden.some((x) => x.brand === brand.brand))
    .sort((a, b) => brandRank(a.brand) - brandRank(b.brand));

  return (
    <Fragment>
      {brandToShow.map(({ brand }, index) => {
        if (index >= Math.min(limit, widthLimit)) {
          if (index === Math.min(limit, widthLimit)) {
            return (
              <Tooltip
                content={
                  <span style={{ display: "flex", gap: "4px", overflow: "visible" }}>
                    {brandToShow.slice(Math.min(limit, widthLimit)).map(({ brand }) => (
                      <RenderBrandIcon key={brand} brand={brand} theme={theme} />
                    ))}
                  </span>
                }
              >
                <span key={brand} className="straumur__render-brand-icons__overflow">
                  +{brandToShow.length - Math.min(limit, widthLimit)}
                </span>
              </Tooltip>
            );
          }
          return null;
        }

        return <RenderBrandIcon key={brand} brand={brand} theme={theme} />;
      })}
    </Fragment>
  );
}

// Networks that publish a reversed mark: on dark we render them without the white box (in white ink
// where needed). The rest keep their multicolor logo on a light "chip" so they stay brand-compliant.
const withChip = (icon: h.JSX.Element, isDark: boolean): h.JSX.Element =>
  isDark ? <span className="straumur__brand-chip">{icon}</span> : icon;

export const RenderBrandIcon = ({
  brand,
  theme = "light",
  defaultToBrandName = true,
}: {
  brand: string;
  theme?: ResolvedTheme;
  defaultToBrandName?: boolean;
}): h.JSX.Element => {
  const isDark = theme === "dark";

  switch (brand) {
    case "visa":
      return <VisaIcon reversed={isDark} />;
    case "mc":
      return <MasterCardIcon reversed={isDark} />;
    case "maestro":
      return <MaestroIcon reversed={isDark} />;
    case "discover":
      return <DiscoverIcon reversed={isDark} />;
    case "amex":
      // Already a white logo on the Amex-blue box — reads fine on either theme.
      return <AmexIcon />;
    case "jcb":
      return withChip(<JcbIcon />, isDark);
    case "diners":
      return withChip(<DinersIcon />, isDark);
    case "cup":
      return withChip(<CupIcon />, isDark);
    default:
      if (defaultToBrandName) {
        return <span>{brand}</span>;
      }
      return <Fragment></Fragment>;
  }
};
