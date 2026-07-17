import { h, FunctionalComponent, ComponentChildren } from "preact";
import "./tooltip.css";
import { useRef, useState } from "preact/hooks";

interface TooltipProps {
  children: ComponentChildren;
  content: ComponentChildren;
  /**
   * Which side of the trigger the tooltip opens toward. Defaults to "bottom".
   * Use "top" inside overflow:hidden containers (e.g. the card form's expandable) where a
   * downward tooltip would be clipped.
   */
  placement?: "top" | "bottom";
}

export const Tooltip: FunctionalComponent<TooltipProps> = ({
  children,
  content,
  placement = "bottom",
}): h.JSX.Element | null => {
  const [isVisible, setIsVisible] = useState(false);
  const triggerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    setIsVisible(true);
  };

  const handleMouseLeave = () => {
    setIsVisible(false);
  };

  return (
    <div style={{ position: "relative" }}>
      <div ref={triggerRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        {children}
      </div>
      {isVisible && triggerRef && (
        <div className={`straumur__tooltip__content straumur__tooltip__content--${placement}`}>{content}</div>
      )}
    </div>
  );
};
