import { useNavigate } from "react-router-dom";
import { DesignButton } from "@/components/ds/DesignButton";
import { ArrowLeft } from "lucide-react";

const FloatingBackButton = () => {
  const navigate = useNavigate();

  return (
    <div className="fixed top-4 left-4 z-50">
      <DesignButton
        size="small"
        theme="primary"
        variant="outlined"
        className="rounded-full w-9 h-9 min-h-0 p-0 hover:bg-btn-primary hover:text-primary-foreground hover:border-transparent"
        onClick={() => navigate(-1)}
        aria-label="Go back"
        icon={<ArrowLeft className="w-4 h-4" />}
      >
        {null}
      </DesignButton>
    </div>
  );
};

export default FloatingBackButton;
