export function parseUa(ua: string) {
  const browser =
    /EdgA?\//.test(ua) ? "Edge"
    : /SamsungBrowser\//.test(ua) ? "Samsung Internet"
    : /OPR\/|Opera/.test(ua) ? "Opera"
    : /Firefox\/|FxiOS\//.test(ua) ? "Firefox"
    : /CriOS\/|Chrome\//.test(ua) ? "Chrome"
    : /Safari\//.test(ua) ? "Safari"
    : "Other";
  const os =
    /iPhone|iPod/.test(ua) ? "iOS"
    : /iPad/.test(ua) ? "iPadOS"
    : /Android/.test(ua) ? "Android"
    : /Windows/.test(ua) ? "Windows"
    : /Mac OS X|Macintosh/.test(ua) ? "macOS"
    : /CrOS/.test(ua) ? "ChromeOS"
    : /Linux/.test(ua) ? "Linux"
    : "Other";
  const device = /iPad|Tablet/.test(ua) || (/Android/.test(ua) && !/Mobile/.test(ua)) ? "Tablet" : /Mobile|iPhone|iPod|Android/.test(ua) ? "Phone" : "Desktop";
  return { browser, os, device };
}
