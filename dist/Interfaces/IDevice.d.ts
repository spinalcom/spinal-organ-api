export interface IDevice {
    address?: string;
    deviceId: number;
    maxApdu?: number;
    segmentation?: number;
    vendorId?: number;
}
export interface IApiDevice {
    site?: string;
    name: string;
    deviceId: number;
}
