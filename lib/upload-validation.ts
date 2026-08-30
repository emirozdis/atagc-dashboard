import "server-only";

const signatures: Record<string, (bytes: Uint8Array) => boolean> = {
  "application/pdf": (bytes) => String.fromCharCode(...bytes.slice(0, 4)) === "%PDF",
  "image/jpeg": (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/jpg": (bytes) => bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff,
  "image/png": (bytes) => bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47,
  "image/webp": (bytes) => String.fromCharCode(...bytes.slice(0, 4)) === "RIFF" && String.fromCharCode(...bytes.slice(8, 12)) === "WEBP",
  "application/msword": (bytes) => bytes[0] === 0xd0 && bytes[1] === 0xcf && bytes[2] === 0x11 && bytes[3] === 0xe0,
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document": (bytes) => bytes[0] === 0x50 && bytes[1] === 0x4b && bytes[2] === 0x03 && bytes[3] === 0x04,
};

export async function assertFileSignature(file: File) {
  const check = signatures[file.type];
  if (!check) throw new Error("Unsupported file type.");
  const bytes = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (!check(bytes)) throw new Error("The uploaded file does not match its declared type.");
}
