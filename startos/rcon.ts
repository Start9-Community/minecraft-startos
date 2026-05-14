import { Socket } from 'node:net'
import type { T } from '@start9labs/start-sdk'
import { serverProperties } from './fileModels/server.properties'
import { rconPort } from './utils'

type RconPacket = {
  requestId: number
  type: number
  payload: string
}

const authRequestId = 1
const authPacketType = 3
const commandPacketType = 2

const encodePacket = (requestId: number, type: number, payload: string) => {
  const payloadBuffer = Buffer.from(payload, 'utf8')
  const packetSize = 4 + 4 + payloadBuffer.length + 2
  const buffer = Buffer.alloc(packetSize + 4)

  buffer.writeInt32LE(packetSize, 0)
  buffer.writeInt32LE(requestId, 4)
  buffer.writeInt32LE(type, 8)
  payloadBuffer.copy(buffer, 12)
  buffer.writeInt16LE(0, 12 + payloadBuffer.length)

  return buffer
}

export class RconConnection {
  private readBuffer = Buffer.alloc(0)
  private nextRequestId = 2

  private constructor(
    private readonly socket: Socket,
    public readonly host: string,
    public readonly port: number,
  ) {}

  static async connect(host: string, port: number, timeoutMs: number) {
    const socket = new Socket()

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        socket.destroy()
        reject(new Error(`Timed out connecting to RCON at ${host}:${port}`))
      }, timeoutMs)

      socket.once('error', (error) => {
        clearTimeout(timeout)
        reject(
          new Error(`Failed to connect to RCON at ${host}:${port}: ${error.message}`),
        )
      })

      socket.connect(port, host, () => {
        clearTimeout(timeout)
        socket.removeAllListeners('error')
        resolve()
      })
    })

    socket.setNoDelay(true)
    return new RconConnection(socket, host, port)
  }

  private tryParsePacket(): RconPacket | null {
    if (this.readBuffer.length < 4) return null

    const packetSize = this.readBuffer.readInt32LE(0)
    const frameSize = packetSize + 4

    if (packetSize < 10) {
      throw new Error('Received malformed RCON packet')
    }

    if (this.readBuffer.length < frameSize) return null

    const frame = this.readBuffer.subarray(0, frameSize)
    this.readBuffer = this.readBuffer.subarray(frameSize)

    const requestId = frame.readInt32LE(4)
    const type = frame.readInt32LE(8)
    const payloadBytes = frame.subarray(12, frame.length - 2)
    const payload = payloadBytes.toString('utf8').replace(/\u0000+$/g, '')

    return { requestId, type, payload }
  }

  private async readPacket(timeoutMs: number): Promise<RconPacket> {
    const immediate = this.tryParsePacket()
    if (immediate) return immediate

    return await new Promise<RconPacket>((resolve, reject) => {
      const cleanup = () => {
        clearTimeout(timeout)
        this.socket.off('data', onData)
        this.socket.off('error', onError)
        this.socket.off('close', onClose)
      }

      const onData = (chunk: Buffer) => {
        try {
          this.readBuffer = Buffer.concat([this.readBuffer, chunk])
          const packet = this.tryParsePacket()
          if (!packet) return
          cleanup()
          resolve(packet)
        } catch (error) {
          cleanup()
          reject(
            error instanceof Error
              ? error
              : new Error('Failed to parse RCON packet'),
          )
        }
      }

      const onError = (error: Error) => {
        cleanup()
        reject(new Error(`RCON socket error: ${error.message}`))
      }

      const onClose = () => {
        cleanup()
        reject(new Error('RCON connection closed unexpectedly'))
      }

      const timeout = setTimeout(() => {
        cleanup()
        reject(new Error('Timed out waiting for RCON response'))
      }, timeoutMs)

      this.socket.on('data', onData)
      this.socket.once('error', onError)
      this.socket.once('close', onClose)
      onData(Buffer.alloc(0))
    })
  }

  private sendPacket(requestId: number, type: number, payload: string) {
    this.socket.write(encodePacket(requestId, type, payload))
  }

  private async waitForRequestId(
    requestId: number,
    timeoutMs: number,
  ): Promise<RconPacket> {
    const deadline = Date.now() + timeoutMs

    while (true) {
      const remaining = deadline - Date.now()
      if (remaining <= 0) {
        throw new Error('Timed out waiting for matching RCON response')
      }

      const packet = await this.readPacket(remaining)
      if (packet.requestId === -1 || packet.requestId === requestId) {
        return packet
      }
    }
  }

  async authenticate(password: string, timeoutMs: number) {
    this.sendPacket(authRequestId, authPacketType, password)
    const packet = await this.waitForRequestId(authRequestId, timeoutMs)

    if (packet.requestId === -1) {
      throw new Error('RCON authentication failed')
    }
  }

  async command(command: string, timeoutMs = 3_000): Promise<string> {
    const requestId = this.nextRequestId++
    this.sendPacket(requestId, commandPacketType, command)

    const firstPacket = await this.waitForRequestId(requestId, timeoutMs)
    if (firstPacket.requestId === -1) {
      throw new Error(`RCON command failed: ${command}`)
    }

    const responses: string[] = []
    const firstPayload = firstPacket.payload.trim()
    if (firstPayload) responses.push(firstPayload)

    const drainDeadline = Date.now() + 150
    while (true) {
      const remaining = drainDeadline - Date.now()
      if (remaining <= 0) break

      try {
        const packet = await this.readPacket(remaining)
        if (packet.requestId !== requestId) continue
        const payload = packet.payload.trim()
        if (payload) responses.push(payload)
      } catch {
        break
      }
    }

    return responses.join('\n').trim()
  }

  close() {
    this.socket.destroy()
  }
}

export type RconConnectionResult =
  | { connection: RconConnection; error: null }
  | { connection: null; error: string }

export const connectToRcon = async (
  effects: T.Effects,
  timeoutMs = 2_500,
): Promise<RconConnectionResult> => {
  const props = await serverProperties.read().once()
  if (!props?.['rcon.password']) {
    return {
      connection: null,
      error: 'RCON password is not configured yet.',
    }
  }

  const hostCandidates = ['127.0.0.1']
  const [containerIp, osIp] = await Promise.all([
    effects.getContainerIp({}).catch(() => null),
    effects.getOsIp().catch(() => null),
  ])

  for (const maybeHost of [containerIp, osIp]) {
    if (maybeHost && !hostCandidates.includes(maybeHost)) {
      hostCandidates.push(maybeHost)
    }
  }

  let lastError = 'Unknown connection error'
  for (const host of hostCandidates) {
    try {
      const connection = await RconConnection.connect(host, rconPort, timeoutMs)
      await connection.authenticate(props['rcon.password'], timeoutMs)
      return { connection, error: null }
    } catch (error) {
      lastError =
        error instanceof Error ? error.message : 'Unknown connection error'
    }
  }

  return {
    connection: null,
    error: `Could not connect to RCON. ${lastError}`,
  }
}
