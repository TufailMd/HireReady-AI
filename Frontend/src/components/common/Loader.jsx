import "./Loader.scss";

const Loader = ({ message, variant = "section", className = "" }) => {
  const Element = variant === "inline" ? "span" : "div";
  const classes = ["loader", `loader--${variant}`, className]
    .filter(Boolean)
    .join(" ");

  return (
    <Element
      className={classes}
      role="status"
      aria-live="polite"
      aria-label={message ? undefined : "Loading"}
    >
      <span className="loader__spinner" aria-hidden="true" />
      {message && <span className="loader__message">{message}</span>}
    </Element>
  );
};

export default Loader;
