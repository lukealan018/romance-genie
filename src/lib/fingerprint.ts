/**
 * Generate a simple browser fingerprint for spam prevention.
 * This creates a hash based on browser characteristics.
 */
export async function generateFingerprint(): Promise<string> {
  const components = [
    navigator.userAgent,
    navigator.language,
    screen.width + 'x' + screen.height,
    screen.colorDepth,
    new Date().getTimezoneOffset(),
    navigator.hardwareConcurrency || 'unknown',
    navigator.platform,
  ];

  const fingerprint = components.join('|');
  
  // Create a hash of the fingerprint
  const encoder = new TextEncoder();
  const data = encoder.encode(fingerprint);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  
  return hashHex;
}

/**
 * Get or create a stored fingerprint for consistency across sessions.
 */
export async function getStoredFingerprint(): Promise<string> {
  const storageKey = 'rg_device_fp';
  
  // Check if we have a stored fingerprint
  let stored = localStorage.getItem(storageKey);
  
  if (!stored) {
    // Generate new fingerprint and store it
    stored = await generateFingerprint();
    localStorage.setItem(storageKey, stored);
  }
  
  return stored;
}
