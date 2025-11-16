import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

export interface DeviceStatus {
  status: 'starting' | 'waiting_for_scan' | 'connected' | 'disconnected' | 'reconnecting';
  qrCode?: string;
  lastUpdate: string;
}

export interface Device {
  id: string;
  status: 'starting' | 'waiting_for_scan' | 'connected' | 'disconnected' | 'reconnecting';
  qrCode?: string;
  lastUpdate?: string;
}

export interface SendMessageRequest {
  to: string;
  message: string;
}

export interface SystemInfo {
  timestamp: string;
  uptime: number;
  hostname: string;
  platform: string;
  arch: string;
  cpu: {
    manufacturer: string;
    brand: string;
    cores: number;
    physicalCores: number;
    speed: number;
    currentLoad: number;
    avgLoad: number;
    cpus: Array<{
      load: number;
      loadUser: number;
      loadSystem: number;
    }>;
  };
  memory: {
    total: number;
    free: number;
    used: number;
    active: number;
    available: number;
    usagePercent: string;
  };
  network: Array<{
    iface: string;
    operstate: string;
    rx_bytes: number;
    tx_bytes: number;
    rx_sec: number;
    tx_sec: number;
  }>;
  processes: {
    all: number;
    running: number;
    blocked: number;
    sleeping: number;
    list: Array<{
      pid: number;
      name: string;
      cpu: number;
      mem: number;
    }>;
  };
  loadAverage: number[];
  freemem: number;
  totalmem: number;
}

export interface ApiResponse {
  status: string;
  device?: string;
  to?: string;
  error?: string;
  details?: string;
}

@Injectable({
  providedIn: 'root'
})
export class WhatsappApiService {
  private baseUrl = this.getBaseUrl();

  constructor(private http: HttpClient) { }

  private getBaseUrl(): string {
    // Use current domain in production, localhost in development
    if (typeof window !== 'undefined' && window.location.hostname !== 'localhost') {
      return `${window.location.protocol}//${window.location.host}/api`;
    }
    return 'http://localhost:3000/api';
  }

  /**
   * Get all devices status
   */
  getAllDevices(): Observable<{[key: string]: DeviceStatus}> {
    return this.http.get<{[key: string]: DeviceStatus}>(`${this.baseUrl}/devices`);
  }

  /**
   * Get specific device status
   */
  getDeviceStatus(deviceId: string): Observable<DeviceStatus> {
    return this.http.get<DeviceStatus>(`${this.baseUrl}/devices/${deviceId}/status`);
  }

  /**
   * Start a WhatsApp device session
   */
  startDevice(deviceId: string): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/devices/${deviceId}/start`, {});
  }

  /**
   * Remove a device
   */
  removeDevice(deviceId: string): Observable<ApiResponse> {
    return this.http.delete<ApiResponse>(`${this.baseUrl}/devices/${deviceId}`);
  }

  /**
   * Send a text message
   */
  sendMessage(deviceId: string, request: SendMessageRequest): Observable<ApiResponse> {
    return this.http.post<ApiResponse>(`${this.baseUrl}/devices/${deviceId}/send`, request);
  }

  /**
   * Get system resource information
   */
  getSystemInfo(): Observable<SystemInfo> {
    return this.http.get<SystemInfo>(`${this.baseUrl}/system`);
  }
}
