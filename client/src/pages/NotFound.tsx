import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { Ghost } from "lucide-react";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error(
      "404 Error: User attempted to access non-existent route:",
      location.pathname
    );
  }, [location.pathname]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-primary/10 via-background to-accent/10">
      <div className="gradient-card border border-border/50 shadow-card rounded-2xl px-8 py-12 max-w-md w-full text-center">
        <div className="flex flex-col items-center gap-4">
          <Ghost className="w-16 h-16 text-primary mb-2" />
          <h1 className="text-6xl font-extrabold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent mb-2">
            404
          </h1>
          <p className="text-2xl font-semibold text-foreground mb-2">
            Page Not Found
          </p>
          <p className="text-muted-foreground mb-6">
            Oops! The page you are looking for does not exist.
            <br />
            <span className="text-xs">({location.pathname})</span>
          </p>
          <a
            href="/"
            className="inline-block px-6 py-2 rounded-lg bg-primary text-primary-foreground font-medium shadow-button transition-smooth hover:bg-accent hover:text-accent-foreground"
          >
            Return to Home
          </a>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
