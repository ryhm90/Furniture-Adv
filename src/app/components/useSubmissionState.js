import { useRef, useState } from "react";

export default function useSubmissionState() {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const lockRef = useRef(false);

  const runWithSubmission = async (callback) => {
    if (lockRef.current) {
      return false;
    }

    lockRef.current = true;
    setIsSubmitting(true);

    try {
      await callback();
      return true;
    } finally {
      lockRef.current = false;
      setIsSubmitting(false);
    }
  };

  return /** @type {[boolean, (callback: () => Promise<any>) => Promise<boolean>]} */ ([
    isSubmitting,
    runWithSubmission,
  ]);
}
