// Pastel color palette with 20 colors where adjacent colors have high contrast
// Uses HSL with muted saturation and lightness for more subtle pastels
// Colors are arranged to maximize contrast between neighbors by alternating warm/cool
// and ensuring large hue differences
export function getSongColor(index: number): string {
  const colors = [
    // Alternating warm and cool for maximum contrast
    'hsl(340, 50%, 70%)', // Warm Pink
    'hsl(200, 50%, 70%)', // Cool Sky Blue
    'hsl(30, 50%, 70%)',  // Warm Peach
    'hsl(230, 50%, 70%)', // Cool Periwinkle
    'hsl(50, 50%, 70%)',  // Warm Yellow
    'hsl(260, 50%, 70%)', // Cool Lavender
    'hsl(15, 50%, 70%)',  // Warm Coral
    'hsl(180, 50%, 70%)', // Cool Cyan
    'hsl(70, 50%, 70%)',  // Warm Lime
    'hsl(290, 50%, 70%)', // Cool Magenta
    'hsl(120, 50%, 70%)', // Warm Green
    'hsl(240, 50%, 70%)', // Cool Indigo
    'hsl(25, 50%, 70%)',  // Warm Orange
    'hsl(210, 50%, 70%)', // Cool Blue
    'hsl(90, 50%, 70%)',  // Warm Chartreuse
    'hsl(270, 50%, 70%)', // Cool Violet
    'hsl(160, 50%, 70%)', // Warm Mint
    'hsl(300, 50%, 70%)', // Cool Magenta Pink
    'hsl(0, 50%, 70%)',   // Warm Red
    'hsl(190, 50%, 70%)', // Cool Teal
  ]
  
  // Handle negative index for blank slide (use gray)
  if (index < 0) {
    return 'hsl(0, 0%, 25%)'
  }
  
  return colors[index % colors.length]
}

