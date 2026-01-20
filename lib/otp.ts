/**
 * Generates a Time-based One-Time Password (TOTP) using HMAC-SHA256.
 * Compatible with standard Web Crypto API (Browser & Node.js).
 * 
 * @param secret The shared secret key
 * @param period Validity period in milliseconds (default 5000ms = 5s)
 * @returns Hex string of the HMAC signature
 */
export async function generateTOTP(secret: string, period: number = 5000): Promise<string> {
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  
  // Import key for HMAC-SHA256
  const key = await crypto.subtle.importKey(
    "raw", 
    keyData, 
    { name: "HMAC", hash: "SHA-256" }, 
    false, 
    ["sign"]
  );

  // Calculate counter based on current time and period
  const counter = Math.floor(Date.now() / period);
  const data = encoder.encode(counter.toString());
  
  // Sign the counter with the key
  const signature = await crypto.subtle.sign("HMAC", key, data);
  
  // Convert buffer to hex string
  return Array.from(new Uint8Array(signature))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
}

/**
 * Verifies a TOTP token against a secret.
 * Checks current time window and adjacent windows to account for clock drift/network latency.
 * 
 * @param token The token received from client
 * @param secret The stored secret key
 * @param period Validity period in milliseconds
 * @param window Number of adjacent windows to check (default 1 = +/- 5s tolerance)
 */
export async function verifyTOTP(token: string, secret: string, period: number = 5000, window: number = 1): Promise<boolean> {
  const current = Math.floor(Date.now() / period);
  const encoder = new TextEncoder();
  const keyData = encoder.encode(secret);
  
  const key = await crypto.subtle.importKey(
    "raw", 
    keyData, 
    { name: "HMAC", hash: "SHA-256" }, 
    false, 
    ["sign"]
  );

  // Check [current-window ... current+window]
  for (let i = -window; i <= window; i++) {
      const counter = current + i;
      const data = encoder.encode(counter.toString());
      const signature = await crypto.subtle.sign("HMAC", key, data);
      const hex = Array.from(new Uint8Array(signature)).map(b => b.toString(16).padStart(2, '0')).join('');
      
      if (hex === token) return true;
  }
  
  return false;
}

// Change Log:
// - Created new utility for secure time-based token generation.