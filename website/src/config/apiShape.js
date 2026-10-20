// Places where Endpoints_Full.md and the Postman collection disagree.
// Each choice lives here so a wrong guess is a one-line change.

// Checkout body: Endpoints_Full.md says `packageId`; Postman/spec say `gymPackageId`.
export const CHECKOUT_PACKAGE_KEY = 'packageId';

// Gym search: Endpoints_Full.md says `name`; Postman says `q`.
export const GYM_SEARCH_NAME_KEY = 'name';

// Payment initialisation: Endpoints_Full.md says `bookingId`; Postman says `orderId`.
export const PAYMENT_INIT_KEY = 'bookingId';
