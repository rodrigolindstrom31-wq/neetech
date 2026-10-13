// Ejecutá con Node.js 20+: node scripts/hash-password.mjs
// Genera un hash PBKDF2 compatible con functions/_lib/auth.js.
import { webcrypto } from "node:crypto";
import { createInterface } from "node:readline/promises";
import { stdin as input, stdout as output } from "node:process";
const rl = createInterface({ input, output });
const password = await rl.question("Contraseña nueva para el administrador: ");
rl.close();
if (password.length < 12) {
  console.error("Usá una contraseña de al menos 12 caracteres.");
  process.exit(1);
}
const enc = new TextEncoder();
const salt = webcrypto.getRandomValues(new Uint8Array(16));
const key = await webcrypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, ["deriveBits"]);
const bits = new Uint8Array(await webcrypto.subtle.deriveBits({ name:"PBKDF2", hash:"SHA-256", salt, iterations:310000 }, key, 256));
const b64url = bytes => Buffer.from(bytes).toString("base64url");
console.log("\nCopiá esta línea para el comando SQL de creación del administrador:\n");
console.log(`pbkdf2$310000$${b64url(salt)}$${b64url(bits)}`);
