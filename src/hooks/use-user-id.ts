import { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';

const USER_ID_KEY = 'userId';

export const useUserId = (): string => {
  const [userId, setUserId] = useState<string>(() => {
    // Try to get existing userId from localStorage
    const stored = localStorage.getItem(USER_ID_KEY);
    if (stored) {
      return stored;
    }
    
    // Generate new UUID if none exists
    const newId = uuidv4();
    localStorage.setItem(USER_ID_KEY, newId);
    return newId;
  });

  // Ensure userId is always in sync with localStorage
  useEffect(() => {
    const stored = localStorage.getItem(USER_ID_KEY);
    if (!stored) {
      localStorage.setItem(USER_ID_KEY, userId);
    } else if (stored !== userId) {
      setUserId(stored);
    }
  }, [userId]);

  return userId;
};
