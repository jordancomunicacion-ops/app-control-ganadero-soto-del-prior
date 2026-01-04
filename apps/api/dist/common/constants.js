"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ChannelType = exports.BookingSource = exports.BookingStatus = void 0;
exports.BookingStatus = {
    CONFIRMED: 'CONFIRMED',
    PENDING: 'PENDING',
    CANCELLED: 'CANCELLED',
    CHECKED_IN: 'CHECKED_IN',
    CHECKED_OUT: 'CHECKED_OUT',
};
exports.BookingSource = {
    MANUAL: 'MANUAL',
    WEBSITE: 'WEBSITE',
    BOOKING_COM: 'BOOKING_COM',
    AIRBNB: 'AIRBNB',
    EXPEDIA: 'EXPEDIA',
};
exports.ChannelType = {
    AIRBNB: 'AIRBNB',
    BOOKING: 'BOOKING',
    VRBO: 'VRBO',
};
//# sourceMappingURL=constants.js.map