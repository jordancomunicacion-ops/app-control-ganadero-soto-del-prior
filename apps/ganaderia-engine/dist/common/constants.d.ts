export declare const BookingStatus: {
    readonly CONFIRMED: "CONFIRMED";
    readonly PENDING: "PENDING";
    readonly CANCELLED: "CANCELLED";
    readonly CHECKED_IN: "CHECKED_IN";
    readonly CHECKED_OUT: "CHECKED_OUT";
};
export type BookingStatus = typeof BookingStatus[keyof typeof BookingStatus];
export declare const BookingSource: {
    readonly MANUAL: "MANUAL";
    readonly WEBSITE: "WEBSITE";
    readonly BOOKING_COM: "BOOKING_COM";
    readonly AIRBNB: "AIRBNB";
    readonly EXPEDIA: "EXPEDIA";
};
export type BookingSource = typeof BookingSource[keyof typeof BookingSource];
export declare const ChannelType: {
    readonly AIRBNB: "AIRBNB";
    readonly BOOKING: "BOOKING";
    readonly VRBO: "VRBO";
};
export type ChannelType = typeof ChannelType[keyof typeof ChannelType];
