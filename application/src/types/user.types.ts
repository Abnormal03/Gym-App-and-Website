export interface User {
    name: string,
    phone: number,
    email: string,
    photoUrl?: string,
    fcmToken?: string,
    createdSt: Date
}