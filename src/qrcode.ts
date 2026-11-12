// Promisified wrapper around qrcode-terminal's callback API. `small: true` keeps
// the code compact enough for most terminals. Loaded on demand: most runs never
// draw a QR code.
export async function renderQr(text: string): Promise<string> {
  const { default: qrcode } = await import('qrcode-terminal');
  return new Promise((resolve) => {
    qrcode.generate(text, { small: true }, (output: string) => resolve(output));
  });
}
