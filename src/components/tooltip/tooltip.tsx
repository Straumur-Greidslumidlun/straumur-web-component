import { h, FunctionalComponent, ComponentChildren } from "preact";
import "./tooltip.css";
import { useId, useState } from "preact/hooks";

interface TooltipProps {
  children: ComponentChildren;
  content: ComponentChildren;
  /**
   * Which side of the trigger the tooltip opens toward. Defaults to "bottom".
   * Use "top" inside overflow:hidden containers (e.g. the card form's expandable) where a
   * downward tooltip would be clipped.
   */
  placement?: "top" | "bottom";
  /**
   * Accessible name for the trigger. When set, the trigger becomes a keyboard-focusable button that
   * also opens on focus and on tap (touch has no hover) and closes on Escape/blur — use it whenever the
   * tooltip carries information the shopper needs (e.g. the CVC hint). Without it the tooltip stays a
   * hover-only visual aid (e.g. the brand-overflow indicator, whose brands are also listed elsewhere).
   */
  label?: string;
}

export const Tooltip: FunctionalComponent<TooltipProps> = ({
  children,
  content,
  placement = "bottom",
  label,
}): h.JSX.Element | null => {
  const [isVisible, setIsVisible] = useState(false);
  const tooltipId = useId();
  const show = () => setIsVisible(true);
  const hide = () => setIsVisible(false);

  const interactiveProps: h.JSX.HTMLAttributes<HTMLDivElement> = label
    ? {
        role: "button",
        tabIndex: 0,
        "aria-label": label,
        "aria-describedby": isVisible ? tooltipId : undefined,
        onFocus: show,
        onBlur: hide,
        // A tap fires focus then click, so click only opens (a toggle would close it at once);
        // tapping elsewhere blurs it closed.
        onClick: show,
        onKeyDown: (event) => {
          if (event.key === "Escape") hide();
        },
      }
    : {};

  return (
    <div style={{ position: "relative" }}>
      <div onMouseEnter={show} onMouseLeave={hide} {...interactiveProps}>
        {children}
      </div>
      {isVisible && (
        <div
          id={tooltipId}
          role="tooltip"
          className={`straumur__tooltip__content straumur__tooltip__content--${placement}`}
        >
          {content}
        </div>
      )}
    </div>
  );
};
