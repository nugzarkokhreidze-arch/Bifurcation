/**
 * Helper to generate a highly colorful, energetic SVG on-the-fly or return the custom avatar URL if uploaded.
 */
export function getPlayerAvatar(nickname: string, customAvatar?: string): string {
  if (customAvatar && (customAvatar.startsWith("http") || customAvatar.startsWith("data:"))) {
    return customAvatar;
  }
  
  const cleanName = nickname ? nickname.trim() : "B";
  const initials = cleanName.substring(0, Math.min(2, cleanName.length)).toUpperCase();
  
  // Distinct energetic bright gradients
  const gradients = [
    { start: "#FF007F", mid: "#FF5E62", end: "#FF9966" }, // Sunset Neon Gold glow
    { start: "#7F00FF", mid: "#E100FF", end: "#FF007F" }, // Violet Fuchsia energy
    { start: "#00F2FE", mid: "#4FACFE", end: "#0000FF" }, // Cosmic Electric Cyan-Blue
    { start: "#38EF7D", mid: "#11998E", end: "#005C53" }, // High-energy Emerald Aurora
    { start: "#F27121", mid: "#E94057", end: "#8A2387" }, // Warm Playful Sherbet
    { start: "#FF3366", mid: "#FF0055", end: "#990022" }, // Bold Ruby Spark
    { start: "#00C6FF", mid: "#0072FF", end: "#042D8E" }  // Electric Depth Blue
  ];
  
  let hash = 0;
  for (let i = 0; i < cleanName.length; i++) {
    hash = cleanName.charCodeAt(i) + ((hash << 5) - hash);
  }
  const index = Math.abs(hash) % gradients.length;
  const grad = gradients[index];
  
  // Custom SVG path details based on hash for a playful unique pattern
  const rx = (Math.abs(hash >> 1) % 30) + 10;
  const ry = (Math.abs(hash >> 2) % 30) + 40;
  
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="100%" height="100%">
    <defs>
      <linearGradient id="avatar-grad-${index}" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${grad.start}" />
        <stop offset="50%" stop-color="${grad.mid}" />
        <stop offset="100%" stop-color="${grad.end}" />
      </linearGradient>
    </defs>
    <rect width="100" height="100" rx="24" fill="url(#avatar-grad-${index})" />
    <circle cx="${rx}" cy="${ry}" r="25" fill="#ffffff" opacity="0.12" />
    <path d="M0,75 Q30,55 70,85 T100,60 L100,100 L0,100 Z" fill="#ffffff" opacity="0.08" />
    <text x="50%" y="54%" dominant-baseline="middle" text-anchor="middle" font-family="'Space Grotesk', 'Inter', system-ui, sans-serif" font-weight="900" font-size="36" fill="#ffffff" letter-spacing="0.5">
      ${initials}
    </text>
  </svg>`;
  
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}
