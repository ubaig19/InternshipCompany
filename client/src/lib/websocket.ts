let socket: WebSocket | null = null;

export function getWebSocketUrl(token: string): string {
  const protocol = window.location.protocol === "https:" ? "wss:" : "ws:";
  return `${protocol}//${window.location.host}/ws?token=${token}`;
}

// Fetch a WebSocket token from the server
export async function getWebSocketToken(): Promise<string> {
  try {
    const response = await fetch('/api/auth/ws-token', {
      credentials: 'include',
    });
    
    if (!response.ok) {
      throw new Error('Failed to get WebSocket token');
    }
    
    const data = await response.json();
    return data.token;
  } catch (error) {
    console.error('Error getting WebSocket token:', error);
    throw error;
  }
}

export async function connectWebSocket(): Promise<WebSocket> {
  // If socket is already connected or connecting, return it
  if (socket && (socket.readyState === WebSocket.OPEN || socket.readyState === WebSocket.CONNECTING)) {
    return socket;
  }
  
  try {
    // Get a fresh token for WebSocket connection
    const token = await getWebSocketToken();
    socket = new WebSocket(getWebSocketUrl(token));
    
    // Handle connection error
    socket.onerror = (error) => {
      console.error('WebSocket Error:', error);
    };
    
    return socket;
  } catch (error) {
    console.error('Failed to connect WebSocket:', error);
    throw error;
  }
}

export function closeWebSocket() {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.close();
  }
  socket = null;
}

export function sendMessage(data: any): boolean {
  if (socket && socket.readyState === WebSocket.OPEN) {
    socket.send(JSON.stringify(data));
    return true;
  }
  return false;
}

export function getSocketInstance(): WebSocket | null {
  return socket;
}
