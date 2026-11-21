/* ============================================================
 * IMPRESSÃO DIRETA BLUETOOTH ESC/POS (58mm / 80mm)
 * Compatível com mini impressoras térmicas BLE (MPT-II, KP-1025,
 * RPP02N, GOJPRT, Elgin, Bematech, Epson) via Web Bluetooth API
 * no Android (Chrome / APK WebView) e Desktop.
 * ============================================================ */

interface BtCharacteristic {
  properties?: {
    write?: boolean;
    writeWithoutResponse?: boolean;
  };
  writeValueWithoutResponse?: (data: BufferSource) => Promise<void>;
  writeValue: (data: BufferSource) => Promise<void>;
}

interface BtService {
  getCharacteristics: () => Promise<BtCharacteristic[]>;
}

interface BtServer {
  connected: boolean;
  connect: () => Promise<BtServer>;
  disconnect: () => void;
  getPrimaryServices: () => Promise<BtService[]>;
}

interface BtDevice {
  name?: string;
  gatt?: BtServer;
  addEventListener?: (ev: string, fn: () => void) => void;
}

interface NavigatorBluetooth {
  requestDevice: (opts: Record<string, unknown>) => Promise<BtDevice>;
}

const KNOWN_PRINTER_SERVICES = [
  '000018f0-0000-1000-8000-00805f9b34fb', // Padrão térmico BLE (MPT-II / RPP02N / KP-1025)
  '0000ffe0-0000-1000-8000-00805f9b34fb', // HM-10 / genéricas BLE
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Microchip / ISSC
  'e7810a71-73ae-499d-8c15-faa9aef0c3f2', // Star / Epson / Elgin BLE
  '0000ff00-0000-1000-8000-00805f9b34fb', // GOJPRT / Peripage
  '0000ae30-0000-1000-8000-00805f9b34fb', // Mini thermal BLE
];

let activeDevice: BtDevice | null = null;
let activeChar: BtCharacteristic | null = null;
const btListeners = new Set<() => void>();

function notifyBtChange(): void {
  btListeners.forEach((fn) => {
    try {
      fn();
    } catch {
      // ignore
    }
  });
}

export function subscribeBluetoothPrinter(listener: () => void): () => void {
  btListeners.add(listener);
  return () => {
    btListeners.delete(listener);
  };
}

export function isWebBluetoothSupported(): boolean {
  return (
    typeof navigator !== 'undefined' &&
    Boolean((navigator as unknown as { bluetooth?: NavigatorBluetooth }).bluetooth)
  );
}

export function getConnectedBluetoothPrinter(): { connected: boolean; name: string } {
  const connected = Boolean(activeDevice?.gatt?.connected && activeChar);
  return {
    connected,
    name: connected ? activeDevice?.name || 'Impressora Bluetooth' : '',
  };
}

export async function connectBluetoothPrinter(): Promise<{
  ok: boolean;
  name?: string;
  error?: string;
}> {
  if (!isWebBluetoothSupported()) {
    return {
      ok: false,
      error:
        'Bluetooth direto não está disponível neste navegador. Use Chrome no Android/Desktop ou o app Android (APK).',
    };
  }
  try {
    const bt = (navigator as unknown as { bluetooth: NavigatorBluetooth }).bluetooth;
    const device = await bt.requestDevice({
      acceptAllDevices: true,
      optionalServices: KNOWN_PRINTER_SERVICES,
    });
    if (!device.gatt) {
      return { ok: false, error: 'Dispositivo Bluetooth sem suporte GATT.' };
    }
    const server = await device.gatt.connect();
    const services = await server.getPrimaryServices();

    let foundChar: BtCharacteristic | null = null;
    for (const svc of services) {
      try {
        const chars = await svc.getCharacteristics();
        for (const ch of chars) {
          if (ch.properties?.writeWithoutResponse || ch.properties?.write) {
            foundChar = ch;
            break;
          }
        }
        if (foundChar) break;
      } catch {
        // try next service
      }
    }

    if (!foundChar) {
      server.disconnect();
      return {
        ok: false,
        error:
          'Conectou ao aparelho, mas não encontrou canal de impressão ESC/POS. Confira se é uma impressora térmica BLE.',
      };
    }

    activeDevice = device;
    activeChar = foundChar;
    device.addEventListener?.('gattserverdisconnected', () => {
      activeChar = null;
      notifyBtChange();
    });
    notifyBtChange();
    return { ok: true, name: device.name || 'Impressora Térmica' };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err || 'Cancelado');
    if (msg.toLowerCase().includes('cancel')) {
      return { ok: false, error: 'Pareamento cancelado.' };
    }
    return { ok: false, error: msg };
  }
}

export function disconnectBluetoothPrinter(): void {
  try {
    if (activeDevice?.gatt?.connected) {
      activeDevice.gatt.disconnect();
    }
  } catch {
    // ignore
  }
  activeDevice = null;
  activeChar = null;
  notifyBtChange();
}

function toAscii(str: string): string {
  return String(str || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^\x20-\x7E\n]/g, ' ');
}

function encodeAscii(str: string): number[] {
  const clean = toAscii(str);
  const out: number[] = [];
  for (let i = 0; i < clean.length; i++) {
    out.push(clean.charCodeAt(i) & 0xff);
  }
  return out;
}

function padRow(left: string, right: string, cols: number): string {
  const l = toAscii(left);
  const r = toAscii(right);
  const space = cols - l.length - r.length;
  if (space >= 1) {
    return l + ' '.repeat(space) + r;
  }
  const maxL = Math.max(4, cols - r.length - 1);
  return l.slice(0, maxL) + ' ' + r;
}

export interface EscPosLine {
  text: string;
  align?: 'left' | 'center' | 'right';
  bold?: boolean;
  doubleSize?: boolean;
  hr?: boolean;
  pair?: [string, string];
}

export function buildEscPosBytes(lines: EscPosLine[], width: '58mm' | '80mm' = '80mm'): Uint8Array {
  const cols = width === '58mm' ? 32 : 48;
  const buf: number[] = [
    0x1b, 0x40, // ESC @ — Reset impressora
  ];

  for (const line of lines) {
    const alignCode = line.align === 'center' ? 1 : line.align === 'right' ? 2 : 0;
    buf.push(0x1b, 0x61, alignCode); // ESC a n
    buf.push(0x1b, 0x45, line.bold ? 1 : 0); // ESC E n
    buf.push(0x1d, 0x21, line.doubleSize ? 0x11 : 0x00); // GS ! n (2x2 ou normal)

    if (line.hr) {
      buf.push(...encodeAscii('-'.repeat(cols) + '\n'));
    } else if (line.pair) {
      buf.push(...encodeAscii(padRow(line.pair[0], line.pair[1], cols) + '\n'));
    } else {
      buf.push(...encodeAscii(line.text + '\n'));
    }
  }

  // Normaliza fonte + avança 4 linhas + corte parcial (ignorado por impressoras sem guilhotina)
  buf.push(0x1d, 0x21, 0x00, 0x1b, 0x45, 0x00, 0x1b, 0x64, 0x04, 0x1d, 0x56, 0x41, 0x03);
  return new Uint8Array(buf);
}

export async function writeEscPosBluetooth(bytes: Uint8Array): Promise<boolean> {
  if (!activeDevice?.gatt?.connected || !activeChar) return false;
  const CHUNK_SIZE = 100;
  try {
    for (let offset = 0; offset < bytes.length; offset += CHUNK_SIZE) {
      const slice = bytes.slice(offset, offset + CHUNK_SIZE);
      if (activeChar.properties?.writeWithoutResponse && activeChar.writeValueWithoutResponse) {
        await activeChar.writeValueWithoutResponse(slice);
      } else {
        await activeChar.writeValue(slice);
      }
      await new Promise((r) => setTimeout(r, 25));
    }
    return true;
  } catch {
    return false;
  }
}

export async function printBluetoothTestPage(
  barName: string,
  width: '58mm' | '80mm' = '80mm'
): Promise<{ ok: boolean; error?: string }> {
  const status = getConnectedBluetoothPrinter();
  if (!status.connected) {
    return { ok: false, error: 'Nenhuma impressora Bluetooth conectada.' };
  }
  const bytes = buildEscPosBytes(
    [
      { text: barName.toUpperCase(), align: 'center', bold: true, doubleSize: true },
      { text: 'TESTE DE IMPRESSORA BLUETOOTH', align: 'center', bold: true },
      { text: new Date().toLocaleString('pt-BR'), align: 'center' },
      { text: '', hr: true },
      { text: '', pair: ['Largura configurada:', width] },
      { text: '', pair: ['Impressora:', status.name.slice(0, 18)] },
      { text: '', hr: true },
      { text: 'Comandas e recibos prontos!', align: 'center', bold: true },
    ],
    width
  );
  const ok = await writeEscPosBluetooth(bytes);
  return ok
    ? { ok: true }
    : { ok: false, error: 'Falha ao enviar dados para a impressora Bluetooth.' };
}
