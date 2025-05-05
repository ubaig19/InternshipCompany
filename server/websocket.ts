import { Server as HttpServer } from 'http';
import { WebSocketServer, WebSocket } from 'ws';
import jwt from 'jsonwebtoken';
import { storage } from './storage';

// JWT secret
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret_for_dev_only';

// Store connected clients
interface ConnectedClient {
  userId: number;
  socket: WebSocket;
}

class WebSocketManager {
  private wss: WebSocketServer;
  private clients: ConnectedClient[] = [];

  constructor(server: HttpServer) {
    // Create WebSocket server on a specific path to avoid conflicts with Vite HMR
    this.wss = new WebSocketServer({ server, path: '/ws' });
    this.initialize();
  }

  private initialize() {
    this.wss.on('connection', (socket: WebSocket, request) => {
      // Parse the URL to get the token parameter
      const url = new URL(request.url || '', `http://${request.headers.host}`);
      const token = url.searchParams.get('token');

      if (!token) {
        socket.close(1008, 'Authentication required');
        return;
      }

      try {
        // Verify the token
        const decoded = jwt.verify(token, JWT_SECRET) as { userId: number };
        const userId = decoded.userId;

        // Add to connected clients
        this.clients.push({ userId, socket });
        console.log(`WebSocket client connected: User ID ${userId}`);

        // Handle incoming messages
        socket.on('message', async (message: string) => {
          try {
            const data = JSON.parse(message);
            
            if (data.type === 'message' && data.receiverId && data.content) {
              // Store the message in the database
              const newMessage = await storage.createMessage({
                senderId: userId,
                receiverId: data.receiverId,
                content: data.content
              });
              
              // Send to recipient if online
              this.sendToUser(data.receiverId, {
                type: 'message',
                message: newMessage
              });
              
              // Send confirmation back to sender
              this.sendToUser(userId, {
                type: 'message_sent',
                messageId: newMessage.id
              });
            }
          } catch (error) {
            console.error('Error processing WebSocket message:', error);
            this.sendToUser(userId, {
              type: 'error',
              message: 'Failed to process message'
            });
          }
        });

        // Handle disconnection
        socket.on('close', () => {
          this.clients = this.clients.filter(client => 
            !(client.userId === userId && client.socket === socket)
          );
          console.log(`WebSocket client disconnected: User ID ${userId}`);
        });

      } catch (error) {
        console.error('WebSocket authentication error:', error);
        socket.close(1008, 'Invalid authentication token');
      }
    });
  }

  // Send a message to a specific user
  public sendToUser(userId: number, data: any): boolean {
    const userClients = this.clients.filter(client => client.userId === userId);
    
    if (userClients.length === 0) {
      return false;
    }
    
    const message = JSON.stringify(data);
    let sent = false;
    
    userClients.forEach(client => {
      if (client.socket.readyState === WebSocket.OPEN) {
        client.socket.send(message);
        sent = true;
      }
    });
    
    return sent;
  }

  // Send notification about a new invitation
  public async sendInvitationNotification(invitationId: number): Promise<boolean> {
    try {
      const invitation = await storage.getInvitation(invitationId);
      if (!invitation) return false;
      
      const job = await storage.getJob(invitation.jobId);
      if (!job) return false;
      
      const company = await storage.getCompany(job.companyId);
      if (!company) return false;
      
      const candidateProfile = await storage.getCandidateProfile(invitation.candidateId);
      if (!candidateProfile) return false;
      
      return this.sendToUser(candidateProfile.userId, {
        type: 'new_invitation',
        invitation: {
          ...invitation,
          job: {
            ...job,
            company: company
          }
        }
      });
    } catch (error) {
      console.error('Error sending invitation notification:', error);
      return false;
    }
  }
}

export function setupWebSocket(server: HttpServer): WebSocketManager {
  return new WebSocketManager(server);
}
