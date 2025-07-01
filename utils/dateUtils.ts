
export const formatDate = (dateString: string, options?: Intl.DateTimeFormatOptions): string => {
  const defaultOptions: Intl.DateTimeFormatOptions = {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  };
  try {
    return new Date(dateString).toLocaleDateString(undefined, { ...defaultOptions, ...options });
  } catch (e) {
    return "Invalid Date";
  }
};

export const formatTime = (dateString: string): string => {
  try {
    return new Date(dateString).toLocaleTimeString(undefined, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch (e) {
    return "Invalid Time";
  }
};

export const getISODateString = (date: Date): string => {
  return date.toISOString().split('T')[0]; // YYYY-MM-DD
};

export const getTomorrowDate = (): Date => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow;
};

export const isSameDay = (date1: Date, date2: Date): boolean => {
  return (
    date1.getFullYear() === date2.getFullYear() &&
    date1.getMonth() === date2.getMonth() &&
    date1.getDate() === date2.getDate()
  );
};
