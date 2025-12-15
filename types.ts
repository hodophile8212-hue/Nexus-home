export enum DeviceType {
  LIGHT = 'LIGHT',
  THERMOSTAT = 'THERMOSTAT',
  LOCK = 'LOCK',
  CAMERA = 'CAMERA',
  SPEAKER = 'SPEAKER'
}

export enum RoomType {
  LIVING_ROOM = 'LIVING_ROOM',
  KITCHEN = 'KITCHEN',
  BEDROOM = 'BEDROOM',
  BATHROOM = 'BATHROOM',
  OFFICE = 'OFFICE',
  OUTDOOR = 'OUTDOOR'
}

export interface Device {
  id: string;
  name: string;
  type: DeviceType;
  roomId: string;
  isOn: boolean;
  value?: number | string; // e.g., temperature, brightness, volume
  meta?: {
    unit?: string;
    min?: number;
    max?: number;
    batteryLevel?: number;
    color?: string;
  };
}

export interface Room {
  id: string;
  name: string;
  type: RoomType;
  image: string;
}

export interface AppState {
  rooms: Room[];
  devices: Device[];
}

export interface GeminiSessionConfig {
  voiceName: string;
}