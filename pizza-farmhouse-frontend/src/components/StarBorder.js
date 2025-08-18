// src/components/StarBorder.js
import "./StarBorder.css";

const StarBorder = ({
  as: Component = "div", // Changed default to div for better layout control
  className = "",
  color = "#F97316", // Using your primary theme color
  speed = "4s",
  thickness = 2,
  children,
  ...rest
}) => {
  return (
    <Component
      className={`star-border-container ${className}`}
      style={{
        padding: `${thickness}px`,
        ...rest.style
      }}
      {...rest}
    >
      <div className="inner-content">{children}</div>
      <div
        className="border-gradient-top"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 40%)`,
          animationDuration: speed,
        }}
      ></div>
      <div
        className="border-gradient-bottom"
        style={{
          background: `radial-gradient(circle, ${color}, transparent 40%)`,
          animationDuration: speed,
        }}
      ></div>
    </Component>
  );
};

export default StarBorder;