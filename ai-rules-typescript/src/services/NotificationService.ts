/**
 * Real-time notification service using WebSockets
 */

import WebSocket, { WebSocketServer } from 'ws';
import { createServer } from 'http';
import { INotificationService } from '@/types/services.js';
import { 
  NotificationAlert, 
  NotificationSummary, 
  RuleUpdateNotification 
} from '@/types/services.js';
import config from '@/config/environment.js';
import { createLogger } from '@/utils/logger.js';

const logger = createLogger('NotificationService');

interface ConnectedClient {
  id: string;
  ws: WebSocket;
  subscriptions: Set<string>;
  connectedAt: Date;
  lastActivity: Date;
}

export class NotificationService implements INotificationService {
  private wss: WebSocketServer;
  private server: any;
  private clients = new Map<string, ConnectedClient>();
  private messageHistory: Array<{
    timestamp: Date;
    type: string;
    data: any;
  }> = [];
  private readonly maxHistorySize = 1000;
  private heartbeatInterval: NodeJS.Timer;

  constructor() {
    this.server = createServer();
    this.wss = new WebSocketServer({ 
      server: this.server,
      maxPayload: 64 * 1024, // 64KB max message size
    });

    this.setupWebSocketHandlers();
    this.startHeartbeat();

    logger.info('NotificationService initialized', {
      port: config.server.notificationPort,
      maxClients: config.security.maxWebSocketClients,
      maxPayload: '64KB',
    });
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.server.listen(config.server.notificationPort, () => {
          logger.info(`Notification service started on port ${config.server.notificationPort}`);
          resolve();
        });

        this.server.on('error', (error: Error) => {
          logger.error('Notification server error', error);
          reject(error);
        });
      } catch (error) {
        logger.error('Failed to start notification service', error as Error);
        reject(error);
      }
    });
  }

  private setupWebSocketHandlers(): void {
    this.wss.on('connection', (ws: WebSocket, req) => {
      const clientId = this.generateClientId();
      const clientIp = req.socket.remoteAddress;

      // Rate limiting check
      if (this.clients.size >= config.security.maxWebSocketClients) {
        logger.warn('Max WebSocket clients reached, rejecting connection', {
          clientIp,
          currentClients: this.clients.size,
          maxClients: config.security.maxWebSocketClients,
        });
        ws.close(1013, 'Server overloaded');
        return;
      }

      const client: ConnectedClient = {
        id: clientId,
        ws,
        subscriptions: new Set(['general']), // Default subscription
        connectedAt: new Date(),
        lastActivity: new Date(),
      };

      this.clients.set(clientId, client);

      logger.info('WebSocket client connected', {
        clientId,
        clientIp,
        totalClients: this.clients.size,
      });

      // Send welcome message with recent history
      this.sendToClient(clientId, {
        type: 'welcome',
        data: {
          clientId,
          connectedAt: client.connectedAt.toISOString(),
          availableSubscriptions: [
            'general',
            'rule-updates',
            'trend-analysis',
            'emergency-alerts',
            'system-status',
          ],
          recentHistory: this.messageHistory.slice(-10),
        },
      });

      // Handle incoming messages
      ws.on('message', (data: string) => {
        try {
          this.handleClientMessage(clientId, JSON.parse(data));
        } catch (error) {
          logger.warn('Invalid message from client', error as Error, { clientId });
          this.sendToClient(clientId, {
            type: 'error',
            data: { message: 'Invalid JSON message' },
          });
        }
      });

      // Handle client disconnect
      ws.on('close', (code, reason) => {
        this.clients.delete(clientId);
        logger.info('WebSocket client disconnected', {
          clientId,
          code,
          reason: reason.toString(),
          totalClients: this.clients.size,
        });
      });

      // Handle connection errors
      ws.on('error', (error) => {
        logger.error('WebSocket client error', error, { clientId });
        this.clients.delete(clientId);
      });

      // Send ping to establish connection
      ws.ping();
    });

    this.wss.on('error', (error) => {
      logger.error('WebSocket server error', error);
    });
  }

  private handleClientMessage(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    client.lastActivity = new Date();

    logger.debug('Received client message', {
      clientId,
      messageType: message.type,
    });

    switch (message.type) {
      case 'subscribe':
        this.handleSubscription(clientId, message.data);
        break;

      case 'unsubscribe':
        this.handleUnsubscription(clientId, message.data);
        break;

      case 'ping':
        this.sendToClient(clientId, { type: 'pong', data: { timestamp: new Date().toISOString() } });
        break;

      case 'get-status':
        this.sendSystemStatus(clientId);
        break;

      default:
        logger.warn('Unknown message type from client', { clientId, messageType: message.type });
        this.sendToClient(clientId, {
          type: 'error',
          data: { message: `Unknown message type: ${message.type}` },
        });
    }
  }

  private handleSubscription(clientId: string, data: { channels: string[] }): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    const validChannels = [
      'general',
      'rule-updates',
      'trend-analysis',
      'emergency-alerts',
      'system-status',
    ];

    data.channels?.forEach(channel => {
      if (validChannels.includes(channel)) {
        client.subscriptions.add(channel);
      }
    });

    this.sendToClient(clientId, {
      type: 'subscription-updated',
      data: {
        subscriptions: Array.from(client.subscriptions),
      },
    });

    logger.debug('Client subscriptions updated', {
      clientId,
      subscriptions: Array.from(client.subscriptions),
    });
  }

  private handleUnsubscription(clientId: string, data: { channels: string[] }): void {
    const client = this.clients.get(clientId);
    if (!client) return;

    data.channels?.forEach(channel => {
      client.subscriptions.delete(channel);
    });

    // Ensure at least 'general' subscription remains
    if (client.subscriptions.size === 0) {
      client.subscriptions.add('general');
    }

    this.sendToClient(clientId, {
      type: 'subscription-updated',
      data: {
        subscriptions: Array.from(client.subscriptions),
      },
    });

    logger.debug('Client unsubscribed from channels', {
      clientId,
      subscriptions: Array.from(client.subscriptions),
    });
  }

  private sendSystemStatus(clientId: string): void {
    const systemStatus = {
      timestamp: new Date().toISOString(),
      connectedClients: this.clients.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      environment: config.isDevelopment ? 'development' : 'production',
    };

    this.sendToClient(clientId, {
      type: 'system-status',
      data: systemStatus,
    });
  }

  private sendToClient(clientId: string, message: any): void {
    const client = this.clients.get(clientId);
    if (!client || client.ws.readyState !== WebSocket.OPEN) {
      return;
    }

    try {
      client.ws.send(JSON.stringify(message));
    } catch (error) {
      logger.error('Failed to send message to client', error as Error, { clientId });
      this.clients.delete(clientId);
    }
  }

  private broadcast(message: any, channel = 'general'): void {
    const messageWithTimestamp = {
      ...message,
      timestamp: new Date().toISOString(),
      channel,
    };

    // Add to message history
    this.addToHistory(messageWithTimestamp);

    let sentCount = 0;
    for (const [clientId, client] of this.clients) {
      if (client.subscriptions.has(channel) && client.ws.readyState === WebSocket.OPEN) {
        try {
          client.ws.send(JSON.stringify(messageWithTimestamp));
          sentCount++;
        } catch (error) {
          logger.error('Failed to broadcast to client', error as Error, { clientId });
          this.clients.delete(clientId);
        }
      }
    }

    logger.debug('Message broadcasted', {
      channel,
      messageType: message.type,
      recipientCount: sentCount,
      totalClients: this.clients.size,
    });
  }

  private addToHistory(message: any): void {
    this.messageHistory.push({
      timestamp: new Date(),
      type: message.type,
      data: message.data,
    });

    // Trim history if it exceeds max size
    if (this.messageHistory.length > this.maxHistorySize) {
      this.messageHistory = this.messageHistory.slice(-this.maxHistorySize);
    }
  }

  private generateClientId(): string {
    return `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private startHeartbeat(): void {
    this.heartbeatInterval = setInterval(() => {
      const now = new Date();
      const staleTimeout = 5 * 60 * 1000; // 5 minutes

      for (const [clientId, client] of this.clients) {
        if (client.ws.readyState === WebSocket.OPEN) {
          // Send ping to active connections
          try {
            client.ws.ping();
          } catch (error) {
            logger.warn('Failed to ping client', error as Error, { clientId });
            this.clients.delete(clientId);
          }
        } else {
          // Remove inactive connections
          this.clients.delete(clientId);
          continue;
        }

        // Remove stale connections
        if (now.getTime() - client.lastActivity.getTime() > staleTimeout) {
          logger.info('Removing stale client connection', {
            clientId,
            lastActivity: client.lastActivity.toISOString(),
            connectedDuration: now.getTime() - client.connectedAt.getTime(),
          });
          client.ws.close(1001, 'Stale connection');
          this.clients.delete(clientId);
        }
      }
    }, 30000); // Every 30 seconds
  }

  // INotificationService implementation
  async sendAlert(alert: NotificationAlert): Promise<void> {
    logger.info('Sending alert notification', {
      type: alert.type,
      severity: alert.severity,
      technologies: alert.technologies,
    });

    this.broadcast({
      type: 'alert',
      data: alert,
    }, 'emergency-alerts');

    // Also send to general channel if severity is high or critical
    if (alert.severity === 'high' || alert.severity === 'critical') {
      this.broadcast({
        type: 'alert',
        data: alert,
      }, 'general');
    }
  }

  async sendSummary(summary: NotificationSummary): Promise<void> {
    logger.info('Sending summary notification', {
      type: summary.type,
      totalProcessed: summary.totalProcessed,
      successful: summary.successful,
      failed: summary.failed,
    });

    this.broadcast({
      type: 'summary',
      data: summary,
    }, 'general');
  }

  getConnectedClients(): number {
    return this.clients.size;
  }

  async broadcastUpdate(update: RuleUpdateNotification): Promise<void> {
    logger.info('Broadcasting rule update notification', {
      ruleType: update.ruleType,
      technology: update.technology,
      version: update.version,
      updateType: update.updateType,
    });

    this.broadcast({
      type: 'rule-update',
      data: update,
    }, 'rule-updates');

    // Also broadcast to general for major updates
    if (update.updateType === 'major') {
      this.broadcast({
        type: 'rule-update',
        data: update,
      }, 'general');
    }
  }

  // Additional utility methods
  async broadcastSystemStatus(): Promise<void> {
    const systemStatus = {
      timestamp: new Date().toISOString(),
      connectedClients: this.clients.size,
      uptime: process.uptime(),
      memoryUsage: process.memoryUsage(),
      nodeVersion: process.version,
      environment: config.isDevelopment ? 'development' : 'production',
      queueStats: await this.getQueueStats(),
    };

    this.broadcast({
      type: 'system-status',
      data: systemStatus,
    }, 'system-status');
  }

  private async getQueueStats(): Promise<any> {
    try {
      const { QueueService } = await import('./QueueService.js');
      const queueService = new QueueService();
      return await queueService.getQueueStats();
    } catch (error) {
      logger.debug('Could not get queue stats for system status');
      return null;
    }
  }

  getClientStats(): {
    totalClients: number;
    clientsBySubscription: Record<string, number>;
    averageConnectionTime: number;
  } {
    const clientsBySubscription: Record<string, number> = {};
    let totalConnectionTime = 0;
    const now = new Date();

    for (const client of this.clients.values()) {
      // Count subscriptions
      for (const subscription of client.subscriptions) {
        clientsBySubscription[subscription] = (clientsBySubscription[subscription] || 0) + 1;
      }

      // Calculate connection time
      totalConnectionTime += now.getTime() - client.connectedAt.getTime();
    }

    return {
      totalClients: this.clients.size,
      clientsBySubscription,
      averageConnectionTime: this.clients.size > 0 ? totalConnectionTime / this.clients.size : 0,
    };
  }

  async shutdown(): Promise<void> {
    logger.info('Shutting down notification service');

    // Clear heartbeat interval
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    // Close all client connections
    for (const [clientId, client] of this.clients) {
      try {
        client.ws.close(1001, 'Server shutting down');
      } catch (error) {
        logger.warn('Error closing client connection during shutdown', error as Error, { clientId });
      }
    }

    // Close WebSocket server
    return new Promise((resolve) => {
      this.wss.close(() => {
        this.server.close(() => {
          logger.info('Notification service shutdown complete');
          resolve();
        });
      });
    });
  }
}