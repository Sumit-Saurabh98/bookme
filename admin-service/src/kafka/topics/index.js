
export const KAFKA_TOPICS = {
     // Notification topics (user-service -> notification-service)
     OTP_EMAIL: 'notification.otp-email',
     WELCOME_EMAIL: 'notification.welcome-email',
     BOOKING_EMAIL: 'notification.booking-email',
     PAYMENT_EMAIL: 'notification.payment-email',

     // Admin topics (admin-service -> inventory/search)
     TRAIN_CREATED: 'admin.train-created',
     STATION_CREATED: 'admin.station-created',
     ROUTE_CREATED: 'admin.route-created',
     SCHEDULE_CREATED: 'admin.schedule-created',
     TRAIN_UPDATED: 'admin.train-updated',
     TRAIN_DELETED: 'admin.train-deleted',
     STATION_UPDATED: 'admin.station-updated',
     STATION_DELETED: 'admin.station-deleted',
     ROUTE_UPDATED: 'admin.route-updated',
     ROUTE_DELETED: 'admin.route-deleted',
     COACH_CREATED: 'admin.coach-created',
     COACH_UPDATED: 'admin.coach-updated',
     COACH_DELETED: 'admin.coach-deleted',
     SEAT_CREATED: 'admin.seat-created',
     SEAT_UPDATED: 'admin.seat-updated',
     SEAT_DELETED: 'admin.seat-deleted',
     SCHEDULE_CANCELLED: 'admin.schedule-cancelled',
     SCHEDULE_ACTIVATED: 'admin.schedule-activated',

     // Inventory topics (inventory-service -> search-service)
     SEAT_AVAILABILITY_UPDATED: 'inventory.seat-availability-updated',

     // Booking topics (booking-service -> notification-service)
     BOOKING_CONFIRMED: 'booking.confirmed',
     BOOKING_CANCELLED: 'booking.cancelled',
     BOOKING_FAILED: 'booking.failed',

     // Payment topics (payment-service -> booking-service)
     PAYMENT_SUCCESS: 'payment.success',
     PAYMENT_FAILED: 'payment.failed',
};
