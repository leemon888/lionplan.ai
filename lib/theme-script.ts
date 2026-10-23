export const THEME_KEY = "lionplan-theme";

/** Inline script for <head>: applies the saved theme before first paint, so there's no flash. */
export const themeScript = `(function(){try{var p=localStorage.getItem("${THEME_KEY}")||"system";var d=p==="dark"||(p==="system"&&matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.setAttribute("data-theme",d?"dark":"light")}catch(e){}})();`;

