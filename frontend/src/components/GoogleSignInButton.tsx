import { useEffect, useRef } from "react";
import { GOOGLE_CLIENT_ID, isGoogleConfigured, loadGoogleScript } from "../utils/googleAuth";

interface GoogleSignInButtonProps {
  onCredential: (credential: string) => void;
  onError: (message: string) => void;
}

function GoogleSignInButton({ onCredential, onError }: GoogleSignInButtonProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const onCredentialRef = useRef(onCredential);
  const onErrorRef = useRef(onError);

  useEffect(() => {
    onCredentialRef.current = onCredential;
    onErrorRef.current = onError;
  });

  useEffect(() => {
    if (!isGoogleConfigured) {
      return;
    }

    let cancelled = false;

    loadGoogleScript()
      .then(() => {
        if (cancelled || !containerRef.current || !window.google) return;

        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response) => onCredentialRef.current(response.credential),
        });

        window.google.accounts.id.renderButton(containerRef.current, {
          type: "standard",
          theme: "outline",
          size: "large",
          text: "continue_with",
          shape: "pill",
          width: 300,
        });
      })
      .catch(() => {
        if (!cancelled) {
          onErrorRef.current("Google sign-in could not be loaded. Check your connection.");
        }
      });

    return () => {
      cancelled = true;
    };
  }, []);

  if (!isGoogleConfigured) {
    return null;
  }

  return <div ref={containerRef} className="google-button-slot" />;
}

export default GoogleSignInButton;
