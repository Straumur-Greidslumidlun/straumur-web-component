import { h, FunctionalComponent, ComponentChildren, Fragment } from "preact";
import "./tooltip.css";
import { useRef, useState } from "preact/hooks";

interface TooltipProps {
  children: ComponentChildren;
  content: ComponentChildren;
}

export const Tooltip: FunctionalComponent<TooltipProps> = ({ children, content }): h.JSX.Element | null => {
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
      {isVisible && triggerRef && <div className="core-tooltip__content">{content}</div>}
    </div>
  );
};
