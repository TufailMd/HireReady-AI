import { Link, useRouteError } from "react-router";

const RouteError = () => {
  const error = useRouteError();

  if (import.meta.env.DEV) {
    console.error("Route rendering failed:", error);
  }

  return (
    <main className="route-error">
      <section>
        <h1>Something went wrong</h1>
        <p>We couldn't display this page. Please try again or return to login.</p>
        <Link to="/login">Go to login</Link>
      </section>
    </main>
  );
};

export default RouteError;
