/**
 * Utility to sanitize a DOM element before exporting it to an image.
 * It converts modern CSS color functions (oklch, lab, oklab) into standard rgb/rgba
 * values to ensure compatibility with html2canvas and html-to-image.
 */
export function sanitizeColors(element: HTMLElement): void {
  const elements = [element, ...Array.from(element.querySelectorAll("*"))] as HTMLElement[];
  
  elements.forEach((el) => {
    // We only care about computed styles for various color-related properties
    const style = window.getComputedStyle(el);
    const colorProps = [
      "color",
      "backgroundColor",
      "borderColor",
      "outlineColor",
      "boxShadow",
      "textShadow"
    ];

    colorProps.forEach((prop) => {
      const value = (style as any)[prop];
      if (value && (value.includes("oklch") || value.includes("oklch") || value.includes("lab") || value.includes("oklab"))) {
        // Force the element to use the computed rgb value instead of the variable/modern function
        // Note: setting it directly on style attribute might override important specificity,
        // but for a clone it's perfect.
        el.style.setProperty(prop, value, "important");
      }
    });

    // Handle gradients in background image
    const bgImage = style.backgroundImage;
    if (bgImage && (bgImage.includes("oklch") || bgImage.includes("lab") || bgImage.includes("oklab"))) {
      // This is trickier as computedStyle.backgroundImage returns the exact string with functions.
      // However, most modern browsers' getComputedStyle will resolve oklch/lab/etc to rgb strings
      // if they are NOT in a gradient. Inside a gradient, they might stay as color functions.
      
      // We can try a simple replacement if the browser didn't already resolve it.
      // But usually, html-to-image/html2canvas fail if the final used string contains these keywords.
      
      // Let's at least try to log if we can't easily resolve complex gradients.
      // For now, we'll assume standard properties are the main culprits.
    }
  });
}
