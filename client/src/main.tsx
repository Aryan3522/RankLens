import { createRoot } from "react-dom/client";
import App from "./App";
import "./index.css";
import { setBaseUrl } from "@/api";

// Configure API base URL for production
let apiUrl = import.meta.env.VITE_API_URL;

// Safety fallback: If VITE_API_URL is missing but we are on a known hosting platform, 
// infer that the API is on the same domain or a subdomain
if (!apiUrl && window.location.hostname !== "localhost") {
  const host = window.location.hostname;
  if (host.includes("vercel.app") || host.includes("railway.app")) {
    // Most users deploy frontend and backend on the same project or similar subdomains
    console.log("VITE_API_URL missing, inferring API from current host:", host);
    apiUrl = window.location.origin; // Assume same domain if not specified
  }
}

if (apiUrl) {
  // Production safety check: Ensure https is used if we are on an https page
  if (window.location.protocol === "https:" && apiUrl.startsWith("http://")) {
    console.warn("VITE_API_URL uses insecure http but page is https. Fetch will likely fail.");
    // Auto-fix if it's a common mistake
    if (apiUrl.includes("vercel.app") || apiUrl.includes("railway.app") || apiUrl.includes("render.com")) {
      apiUrl = apiUrl.replace("http://", "https://");
    }
  }
  
  // Ensure no trailing slash
  apiUrl = apiUrl.replace(/\/$/, "");
  
  console.log("API Base URL set to:", apiUrl);
  setBaseUrl(apiUrl);
}

createRoot(document.getElementById("root")!).render(<App />);
