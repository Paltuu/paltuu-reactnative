let messagingModule: any;
let isExpoGo = false;

try {
  messagingModule = require('@react-native-firebase/messaging').default;
} catch (error) {
  isExpoGo = true;
  if (__DEV__) {
    console.warn('[Firebase Messaging] Native module not found. Running in Mock (Expo Go) mode.');
  }
}

// Fallback Mock for Expo Go
const mockMessaging = () => {
  const unsubscribe = () => () => {};
  return {
    requestPermission: async () => 1, // 1 = Authorized (AuthorizationStatus.AUTHORIZED)
    isDeviceRegisteredForRemoteMessages: true,
    registerDeviceForRemoteMessages: async () => {},
    getToken: async () => 'mock-expo-go-fcm-token',
    subscribeToTopic: async () => {},
    onTokenRefresh: unsubscribe,
    onMessage: unsubscribe,
    onNotificationOpenedApp: unsubscribe,
    getInitialNotification: async () => null,
  };
};

mockMessaging.AuthorizationStatus = {
  NOT_DETERMINED: -1,
  DENIED: 0,
  AUTHORIZED: 1,
  PROVISIONAL: 2,
};

const messaging = isExpoGo ? mockMessaging : messagingModule;
export default messaging;
