import { io } from 'socket.io-client';

let socket;

export const initSocket = () => {
  if (!socket) {
    socket = io(process.env.REACT_APP_API_URL || 'http://localhost:5000', {
      withCredentials: true,
    });

    socket.on('connect', () => {
      console.log('Socket connected');
    });

    socket.on('disconnect', () => {
      console.log('Socket disconnected');
    });

    socket.on('error', (error) => {
      console.error('Socket error:', error);
    });
  }
  return socket;
};

export const getSocket = () => {
  if (!socket) {
    return initSocket();
  }
  return socket;
};

export const disconnectSocket = () => {
  if (socket) {
    socket.disconnect();
    socket = null;
  }
}; 