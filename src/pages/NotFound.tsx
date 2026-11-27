import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { DesignEmptyState } from "@/components/ds/DesignEmptyState";
import { DesignButton } from "@/components/ds/DesignButton";

const NotFound = () => {
  const location = useLocation();

  useEffect(() => {
    console.error("404 Error: User attempted to access non-existent route:", location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted">
      <DesignEmptyState
        title="Page not found"
        body="This page doesn't exist or has moved."
        action={
          <DesignButton variant="filled" url="/">
            Go to the home page
          </DesignButton>
        }
      />
    </div>
  );
};

export default NotFound;
