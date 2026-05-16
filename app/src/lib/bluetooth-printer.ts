/**
 * Web Bluetooth thermal-printer client.
 *
 * Most cheap ESC/POS thermal printers expose a single writable characteristic
 * over Bluetooth Low Energy. The exact UUIDs vary by manufacturer, so we
 * include the most common pairs and fall back to scanning the device's
 * services when the well-known ones don't exist.
 *
 * Browser support: Chrome / Edge desktop, Chrome Android. NOT iOS Safari —
 * `isPrinterSupported()` lets the UI hide the print button gracefully.
 *
 * No tests here — this is a thin glue layer over Web Bluetooth that can only
 * be exercised against real hardware. The pure ESC/POS encoder it depends on
 * is fully tested in `escpos.test.ts`.
 */

// Common service UUIDs across cheap thermal printers (Goojprt PT-210, MTP-3,
// ZJ-5805, NETUM, MUNBYN, etc.). Sources: vendor PDFs + community projects.
const KNOWN_SERVICE_UUIDS = [
  0x18f0,
  0xff00,
  '49535343-fe7d-4ae5-8fa9-9fafd205e455', // Microchip transparent UART
  '000018f0-0000-1000-8000-00805f9b34fb',
] as const

// Conservative MTU. Most BLE printers stall above ~180 bytes/write — we cap
// at 100 to be safe across firmware versions.
const CHUNK_SIZE = 100

const LS_DEVICE_ID   = 'stoki:bt_printer_id'
const LS_DEVICE_NAME = 'stoki:bt_printer_name'

interface BluetoothNavigator {
  bluetooth?: {
    requestDevice: (options: unknown) => Promise<BluetoothDeviceLike>
    getDevices?: () => Promise<BluetoothDeviceLike[]>
  }
}
interface BluetoothDeviceLike {
  id?: string
  name?: string
  gatt?: { connect(): Promise<BluetoothGattLike>; connected: boolean; disconnect(): void }
}
interface BluetoothGattLike {
  getPrimaryServices(): Promise<BluetoothServiceLike[]>
  getPrimaryService(uuid: string | number): Promise<BluetoothServiceLike>
  disconnect(): void
}
interface BluetoothServiceLike {
  getCharacteristics(): Promise<BluetoothCharacteristicLike[]>
}
interface BluetoothCharacteristicLike {
  properties: { write: boolean; writeWithoutResponse: boolean }
  writeValue(value: ArrayBuffer): Promise<void>
  writeValueWithoutResponse?(value: ArrayBuffer): Promise<void>
}

export function isPrinterSupported(): boolean {
  if (typeof navigator === 'undefined') return false
  return !!(navigator as unknown as BluetoothNavigator).bluetooth
}

/** Name of the last successfully used printer, or null if none saved. */
export function getSavedPrinterName(): string | null {
  try { return localStorage.getItem(LS_DEVICE_NAME) } catch { return null }
}

/** Clear the saved printer (e.g. when pairing a different one). */
export function clearSavedPrinter(): void {
  try {
    localStorage.removeItem(LS_DEVICE_ID)
    localStorage.removeItem(LS_DEVICE_NAME)
  } catch { /* localStorage unavailable */ }
}

function savePrinter(device: BluetoothDeviceLike): void {
  try {
    if (device.id)   localStorage.setItem(LS_DEVICE_ID,   device.id)
    if (device.name) localStorage.setItem(LS_DEVICE_NAME, device.name)
  } catch { /* localStorage unavailable */ }
}

/**
 * Try to retrieve the previously paired device using navigator.bluetooth.getDevices()
 * (Chromium 85+ only). Returns null when unsupported or no saved device is found.
 * Degrades silently — callers always fall back to requestDevice().
 */
async function tryGetSavedDevice(bt: NonNullable<BluetoothNavigator['bluetooth']>): Promise<BluetoothDeviceLike | null> {
  if (typeof bt.getDevices !== 'function') return null
  try {
    const savedId = localStorage.getItem(LS_DEVICE_ID)
    const devices = await bt.getDevices()
    if (savedId) {
      const match = devices.find((d) => d.id === savedId)
      if (match) return match
    }
    // No ID stored or ID not found — if there's exactly one previously granted
    // device it's almost certainly the right printer.
    if (devices.length === 1) return devices[0]
  } catch { /* getDevices() failed for any reason */ }
  return null
}

/**
 * Pick a printer and write the bytes to it.
 *
 * On first use (or when the saved device isn't visible), the browser shows a
 * chooser dialog. On subsequent calls in Chromium the previously paired device
 * is used automatically via navigator.bluetooth.getDevices() — no dialog.
 * The connection is closed when done.
 */
export async function printBytes(bytes: Uint8Array): Promise<void> {
  if (!isPrinterSupported()) {
    throw new Error('This browser does not support Bluetooth printing. Try Chrome on Android or desktop.')
  }
  const bt = (navigator as unknown as BluetoothNavigator).bluetooth!

  let device = await tryGetSavedDevice(bt)

  if (!device) {
    device = await bt.requestDevice({
      // `acceptAllDevices` lets the user pick anything paired — most thermal
      // printers don't advertise a recognisable name pattern, and filtering by
      // service UUIDs alone hides devices that only advertise their name.
      acceptAllDevices: true,
      optionalServices: [...KNOWN_SERVICE_UUIDS],
    })
  }

  if (!device.gatt) throw new Error('Selected device has no GATT support')

  const server = await device.gatt.connect()
  try {
    const characteristic = await findWritableCharacteristic(server)
    if (!characteristic) {
      throw new Error('Could not find a writable characteristic on this printer. Make sure it is a supported ESC/POS device.')
    }
    await writeChunked(characteristic, bytes)
    savePrinter(device)
  } finally {
    if (device.gatt.connected) device.gatt.disconnect()
  }
}

async function findWritableCharacteristic(
  server: BluetoothGattLike,
): Promise<BluetoothCharacteristicLike | null> {
  // Try the well-known service UUIDs first — fastest path.
  for (const uuid of KNOWN_SERVICE_UUIDS) {
    try {
      const service = await server.getPrimaryService(uuid)
      const writable = await firstWritable(service)
      if (writable) return writable
    } catch { /* service not present on this printer */ }
  }
  // Fall back to enumerating every primary service and probing each one.
  try {
    const services = await server.getPrimaryServices()
    for (const service of services) {
      const writable = await firstWritable(service)
      if (writable) return writable
    }
  } catch { /* no luck */ }
  return null
}

async function firstWritable(service: BluetoothServiceLike): Promise<BluetoothCharacteristicLike | null> {
  const chars = await service.getCharacteristics()
  return chars.find((c) => c.properties.write || c.properties.writeWithoutResponse) ?? null
}

async function writeChunked(
  characteristic: BluetoothCharacteristicLike,
  bytes: Uint8Array,
): Promise<void> {
  // Prefer writeWithoutResponse when supported — much faster for printers
  // that buffer internally. Fall back to writeValue for older firmware.
  const useNoResponse =
    characteristic.properties.writeWithoutResponse &&
    typeof characteristic.writeValueWithoutResponse === 'function'

  for (let i = 0; i < bytes.length; i += CHUNK_SIZE) {
    // slice() returns a fresh Uint8Array backed by a real ArrayBuffer (not the
    // SharedArrayBuffer-friendly union type subarray() inherits) — required
    // by the Web Bluetooth typings.
    const chunk = bytes.slice(i, Math.min(i + CHUNK_SIZE, bytes.length))
    if (useNoResponse) {
      await characteristic.writeValueWithoutResponse!(chunk.buffer as ArrayBuffer)
    } else {
      await characteristic.writeValue(chunk.buffer as ArrayBuffer)
    }
  }
}
