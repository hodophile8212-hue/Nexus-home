import { AppState, DeviceType, RoomType } from './types';

export const INITIAL_STATE: AppState = {
  rooms: [
    { id: 'living-room', name: 'Living Room', type: RoomType.LIVING_ROOM, image: 'https://picsum.photos/800/600?random=1' },
    { id: 'kitchen', name: 'Kitchen', type: RoomType.KITCHEN, image: 'https://picsum.photos/800/600?random=2' },
    { id: 'master-bedroom', name: 'Master Bedroom', type: RoomType.BEDROOM, image: 'https://picsum.photos/800/600?random=3' },
    { id: 'office', name: 'Home Office', type: RoomType.OFFICE, image: 'https://picsum.photos/800/600?random=4' },
  ],
  devices: [
    { id: 'd1', name: 'Main Lights', type: DeviceType.LIGHT, roomId: 'living-room', isOn: true, value: 80, meta: { color: '#ffffff' } },
    { id: 'd2', name: 'Thermostat', type: DeviceType.THERMOSTAT, roomId: 'living-room', isOn: true, value: 72, meta: { unit: '°F', min: 60, max: 85 } },
    { id: 'd3', name: 'Front Door', type: DeviceType.LOCK, roomId: 'living-room', isOn: true, meta: { batteryLevel: 85 } }, // isOn=locked
    { id: 'd4', name: 'Kitchen Spots', type: DeviceType.LIGHT, roomId: 'kitchen', isOn: false, value: 100 },
    { id: 'd5', name: 'Smart Fridge', type: DeviceType.CAMERA, roomId: 'kitchen', isOn: true },
    { id: 'd6', name: 'Desk Lamp', type: DeviceType.LIGHT, roomId: 'office', isOn: true, value: 50, meta: { color: '#fcd34d' } },
    { id: 'd7', name: 'Speaker', type: DeviceType.SPEAKER, roomId: 'office', isOn: false, value: 30 },
    { id: 'd8', name: 'Bedside Lamp', type: DeviceType.LIGHT, roomId: 'master-bedroom', isOn: false, value: 20 },
  ]
};

export const GEMINI_MODEL_ID = 'gemini-2.5-flash-native-audio-preview-09-2025';
export const ENERGY_DATA = [
  { name: 'Mon', kwh: 12 },
  { name: 'Tue', kwh: 14 },
  { name: 'Wed', kwh: 11 },
  { name: 'Thu', kwh: 15 },
  { name: 'Fri', kwh: 18 },
  { name: 'Sat', kwh: 22 },
  { name: 'Sun', kwh: 19 },
];