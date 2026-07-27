export const formatOrderStatus = (status: string | undefined): string => {
  if (!status) return 'Unknown';
  
  // Handle specific known enums exactly
  switch (status.toUpperCase()) {
    case 'CONFIRMED':
      return 'Confirmed';
    case 'PACKED':
      return 'Packed';
    case 'SHIPPED':
      return 'Shipped';
    case 'DELIVERED':
      return 'Delivered';
    case 'CANCELLED':
      return 'Cancelled';
    default:
      // Fallback for any unknown status: replace underscores with spaces and capitalize words
      return status
        .toLowerCase()
        .split('_')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');
  }
};
