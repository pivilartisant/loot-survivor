import { useController } from "app/context/ControllerContext";
import { useCallback, useEffect } from "react";

const useControls = () => {
  const { controls, conditions } = useController();

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      const { key } = event;
      const control = controls[key];
      if (control && conditions[key]) {
        event.preventDefault();
        control.callback();
      }
    },
    [controls, conditions]
  );

  useEffect(() => {
    window.addEventListener("keydown", handleKeyDown);
    return () => {
      window.removeEventListener("keydown", handleKeyDown);
    };
  }, [handleKeyDown]);

  return null;
};

export default useControls;
