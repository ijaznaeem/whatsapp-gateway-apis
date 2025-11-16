import { CommonModule } from '@angular/common';
import { Component, OnDestroy, OnInit, signal } from '@angular/core';
import { FormBuilder, FormGroup, FormsModule, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatExpansionModule } from '@angular/material/expansion';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatTabsModule } from '@angular/material/tabs';
import { Device, SendMessageRequest, SystemInfo, WhatsappApiService } from './services/whatsapp-api.service';

@Component({
  selector: 'app-root',
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatSnackBarModule,
    MatIconModule,
    MatTabsModule,
    MatProgressSpinnerModule,
    MatProgressBarModule,
    MatChipsModule,
    MatSelectModule,
    MatDialogModule,
    MatExpansionModule
  ],
  templateUrl: './app.html',
  styleUrl: './app.scss'
})
export class App implements OnInit, OnDestroy {
  title = 'WhatsApp Multi-Device API';

  // Signals for reactive state management
  devices = signal<Device[]>([]);
  isLoading = signal(false);
  systemInfo = signal<SystemInfo | null>(null);
  systemLoading = signal(false);

  // Forms
  deviceForm: FormGroup;
  messageForm: FormGroup;

  private statusCheckInterval?: number;
  private systemCheckInterval?: number;

  constructor(
    private whatsappService: WhatsappApiService,
    private snackBar: MatSnackBar,
    private fb: FormBuilder,
    private dialog: MatDialog
  ) {
    this.deviceForm = this.fb.group({
      deviceId: ['', [Validators.required, Validators.pattern(/^[a-zA-Z0-9_-]+$/)]]
    });

    this.messageForm = this.fb.group({
      deviceId: ['', Validators.required],
      phoneNumber: ['', [Validators.required, Validators.pattern(/^\+?[1-9]\d{1,14}$/)]],
      message: ['', [Validators.required, Validators.minLength(1)]]
    });
  }

  ngOnInit(): void {
    this.loadDevices();
    this.loadSystemInfo();

    // Check for status updates every 3 seconds
    this.statusCheckInterval = window.setInterval(() => {
      this.loadDevices();
    }, 3000);

    // Check for system info updates every 5 seconds
    this.systemCheckInterval = window.setInterval(() => {
      this.loadSystemInfo();
    }, 5000);
  }

  ngOnDestroy(): void {
    if (this.statusCheckInterval) {
      clearInterval(this.statusCheckInterval);
    }
    if (this.systemCheckInterval) {
      clearInterval(this.systemCheckInterval);
    }
  }

  /**
   * Load all devices and their current status
   */
  loadDevices(): void {
    this.whatsappService.getAllDevices().subscribe({
      next: (devicesStatus) => {
        const devicesList: Device[] = Object.entries(devicesStatus).map(([id, status]) => ({
          id,
          status: status.status,
          qrCode: status.qrCode,
          lastUpdate: status.lastUpdate
        }));
        this.devices.set(devicesList);
      },
      error: (error) => {
        // If no devices, just set empty array
        if (error.status === 404) {
          this.devices.set([]);
        }
      }
    });
  }

  /**
   * Load system resource information
   */
  loadSystemInfo(): void {
    // Only show loading on initial load, not during refresh
    if (!this.systemInfo()) {
      this.systemLoading.set(true);
    }

    this.whatsappService.getSystemInfo().subscribe({
      next: (systemInfo) => {
        this.systemInfo.set(systemInfo);
        this.systemLoading.set(false);
      },
      error: (error) => {
        console.error('Failed to load system info:', error);
        this.systemLoading.set(false);
        // Don't show error notifications for system info as it's background data
      }
    });
  }

  /**
   * Start a new device session
   */
  startDevice(): void {
    if (this.deviceForm.invalid) {
      this.showSnackBar('Please enter a valid device ID', 'error');
      return;
    }

    const deviceId = this.deviceForm.get('deviceId')?.value;

    // Check if device already exists
    if (this.devices().some(d => d.id === deviceId)) {
      this.showSnackBar('Device already exists', 'warning');
      return;
    }

    this.isLoading.set(true);

    this.whatsappService.startDevice(deviceId).subscribe({
      next: (response) => {
        this.showSnackBar(`Device ${deviceId} started successfully`, 'success');
        this.deviceForm.reset();
        this.loadDevices(); // Refresh device list
      },
      error: (error) => {
        this.showSnackBar(`Failed to start device: ${error.error?.details || error.message}`, 'error');
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Send a message
   */
  sendMessage(): void {
    if (this.messageForm.invalid) {
      this.showSnackBar('Please fill in all required fields correctly', 'error');
      return;
    }

    const formValue = this.messageForm.value;
    const request: SendMessageRequest = {
      to: formValue.phoneNumber + '@s.whatsapp.net',
      message: formValue.message
    };

    this.isLoading.set(true);

    this.whatsappService.sendMessage(formValue.deviceId, request).subscribe({
      next: (response) => {
        this.showSnackBar(`Message sent successfully to ${formValue.phoneNumber}`, 'success');
        this.messageForm.patchValue({ message: '' }); // Clear only the message field
      },
      error: (error) => {
        this.showSnackBar(`Failed to send message: ${error.error?.details || error.message}`, 'error');
      },
      complete: () => {
        this.isLoading.set(false);
      }
    });
  }

  /**
   * Remove a device from the list
   */
  removeDevice(deviceId: string): void {
    this.whatsappService.removeDevice(deviceId).subscribe({
      next: () => {
        this.showSnackBar(`Device ${deviceId} removed`, 'info');
        this.loadDevices(); // Refresh device list
      },
      error: (error) => {
        this.showSnackBar(`Failed to remove device: ${error.error?.details || error.message}`, 'error');
      }
    });
  }

  /**
   * Show snack bar notification
   */
  private showSnackBar(message: string, type: 'success' | 'error' | 'warning' | 'info'): void {
    this.snackBar.open(message, 'Close', {
      duration: 5000,
      panelClass: [`snackbar-${type}`]
    });
  }

  /**
   * Get device status color
   */
  getDeviceStatusColor(status: Device['status']): string {
    switch (status) {
      case 'connected': return 'primary';
      case 'waiting_for_scan': return 'accent';
      case 'starting': return 'accent';
      case 'reconnecting': return 'accent';
      case 'disconnected': return 'warn';
      default: return '';
    }
  }

  /**
   * Get device status icon
   */
  getDeviceStatusIcon(status: Device['status']): string {
    switch (status) {
      case 'connected': return 'check_circle';
      case 'waiting_for_scan': return 'qr_code';
      case 'starting': return 'hourglass_empty';
      case 'reconnecting': return 'refresh';
      case 'disconnected': return 'error';
      default: return 'help';
    }
  }

  /**
   * Get available device IDs for message form
   */
  getAvailableDevices(): Device[] {
    return this.devices().filter(d => d.status === 'connected');
  }

  /**
   * Check if device has QR code to display
   */
  hasQRCode(device: Device): boolean {
    return device.status === 'waiting_for_scan' && !!device.qrCode;
  }

  /**
   * Format bytes to human readable format
   */
  formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }

  /**
   * Format uptime to human readable format
   */
  formatUptime(seconds: number): string {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    let result = '';
    if (days > 0) result += `${days}d `;
    if (hours > 0) result += `${hours}h `;
    result += `${minutes}m`;

    return result.trim();
  }

  /**
   * Format percentage with color coding
   */
  getPercentageColor(percentage: number): string {
    if (percentage < 50) return 'primary';
    if (percentage < 80) return 'accent';
    return 'warn';
  }

  /**
   * Parse float from string
   */
  parseFloat(value: string): number {
    return parseFloat(value);
  }
}
