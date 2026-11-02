import React, { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { initSocketClient, getSocket } from '../services/socket';

const SocketContext = createContext(null);

export const SocketProvider = ({ children }) => {
  const { token, selectedTenant } = useAuth();
  const [socket, setSocket] = useState(null);
  const [connectionStatus, setConnectionStatus] = useState('disconnected'); // 'connected' | 'reconnecting' | 'disconnected'
  const [onlineUsers, setOnlineUsers] = useState([]);

  useEffect(() => {
    if (!token) {
      setSocket(null);
      setConnectionStatus('disconnected');
      setOnlineUsers([]);
      return;
    }

    const s = initSocketClient(token);
    setSocket(s);

    s.on('connect', () => {
      setConnectionStatus('connected');
      if (selectedTenant) {
        s.emit('tenant:join', { tenantId: selectedTenant.id });
      }
    });

    s.on('disconnect', (reason) => {
      setConnectionStatus('disconnected');
    });

    s.on('reconnect_attempt', () => {
      setConnectionStatus('reconnecting');
    });

    s.on('reconnect', () => {
      setConnectionStatus('connected');
      if (selectedTenant) {
        s.emit('tenant:join', { tenantId: selectedTenant.id });
      }
    });

    s.on('presence:update', (data) => {
      if (selectedTenant && data.tenantId === selectedTenant.id) {
        setOnlineUsers(data.onlineUsers || []);
      }
    });

    return () => {
      s.disconnect();
    };
  }, [token]);

  // When selected tenant changes, join the corresponding room
  useEffect(() => {
    if (socket && socket.connected && selectedTenant) {
      socket.emit('tenant:join', { tenantId: selectedTenant.id });
    }
  }, [selectedTenant, socket]);

  // Manual disconnection / reconnection toggle for Network Recovery testing
  const simulateNetworkDisconnect = () => {
    if (socket && socket.connected) {
      socket.disconnect();
      setConnectionStatus('disconnected');
    }
  };

  const simulateNetworkReconnect = () => {
    if (socket && !socket.connected) {
      setConnectionStatus('reconnecting');
      socket.connect();
    }
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        connectionStatus,
        onlineUsers,
        simulateNetworkDisconnect,
        simulateNetworkReconnect
      }}
    >
      {children}
    </SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);
