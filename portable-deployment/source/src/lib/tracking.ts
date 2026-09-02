declare global {
  interface Window {
    umami?: {
      track: (
        eventName: string,
        data?: Record<string, string | number>,
      ) => void;
    };
  }
}

const umamiUrl = import.meta.env.VITE_UMAMI_URL;
const websiteId = import.meta.env.VITE_UMAMI_WEBSITE_ID;

if (typeof document !== "undefined" && umamiUrl && websiteId) {
  const existing = document.querySelector(
    'script[data-website-id="' + websiteId + '"]',
  );
  if (!existing) {
    const script = document.createElement("script");
    script.defer = true;
    script.src = `${umamiUrl.replace(/\/$/, "")}/script.js`;
    script.dataset.websiteId = websiteId;
    document.head.appendChild(script);
  }
}

export function trackEvent(
  eventName: string,
  data?: Record<string, string | number>,
): void {
  if (typeof window !== "undefined" && window.umami) {
    window.umami.track(eventName, data);
  }
}
