export const BookingStatus = {
    CONFIRMED: 'CONFIRMED',
    PENDING: 'PENDING',
    CANCELLED: 'CANCELLED',
    CHECKED_IN: 'CHECKED_IN',
    CHECKED_OUT: 'CHECKED_OUT',
} as const;

export type BookingStatus = typeof BookingStatus[keyof typeof BookingStatus];

export const BookingSource = {
    MANUAL: 'MANUAL',
    WEBSITE: 'WEBSITE',
    BOOKING_COM: 'BOOKING_COM',
    AIRBNB: 'AIRBNB',
    EXPEDIA: 'EXPEDIA',
} as const;

export type BookingSource = typeof BookingSource[keyof typeof BookingSource];

export const ChannelType = {
    AIRBNB: 'AIRBNB',
    BOOKING: 'BOOKING',
    VRBO: 'VRBO',
} as const;

export type ChannelType = typeof ChannelType[keyof typeof ChannelType];
