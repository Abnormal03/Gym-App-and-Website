import { useEffect, useState } from 'react';
import { Route, Routes } from 'react-router-dom';
import { pingServer } from './api/client';
import { MEMBER_NAV, NUTRITION_NAV, STAFF_NAV, coachNav } from './config/navigation';
import ProtectedRoute from './routes/ProtectedRoute';
import AppShell from './components/layout/AppShell';
import AdminLayout from './components/layout/AdminLayout';
import PublicLayout from './components/layout/PublicLayout';

import Landing from './pages/public/Landing';
import { GymsGate, NotFound, Unauthorized } from './pages/public/Misc';
import PaymentResult from './pages/public/PaymentResult';
import Login from './pages/auth/Login';
import Register from './pages/auth/Register';
import ForcedPasswordChange from './pages/auth/ForcedPasswordChange';

import MemberDashboard from './pages/member/Dashboard';
import { GymDetail, GymList } from './pages/member/Gyms';
import BookingFlow from './pages/member/BookingFlow';
import { BookingDetail, BookingList } from './pages/member/Bookings';
import MemberSessions from './pages/member/Sessions';
import Messages from './pages/member/Messages';
import Progress from './pages/member/Progress';
import Assistant from './pages/member/Assistant';
import MemberProfile from './pages/member/Profile';

import AdminDashboard from './pages/admin/Dashboard';
import AdminGyms from './pages/admin/Gyms';
import AdminPackages from './pages/admin/Packages';
import AdminBookings from './pages/admin/Bookings';
import AdminMembers from './pages/admin/Members';
import AdminProviders from './pages/admin/Providers';
import AdminStaff from './pages/admin/Staff';
import AdminPayouts from './pages/admin/Payouts';
import AdminLeaderboard from './pages/admin/Leaderboard';
import AdminProfile from './pages/admin/Profile';

import ProviderDashboard from './pages/provider/Dashboard';
import ProviderProfile from './pages/provider/Profile';
import Availability from './pages/provider/Availability';
import ProviderPackages from './pages/provider/Packages';
import ProviderSessions from './pages/provider/Sessions';
import Clients from './pages/provider/Clients';
import Earnings from './pages/provider/Earnings';
import Reviews from './pages/provider/Reviews';
import Account from './pages/provider/Account';

import NutritionDashboard from './pages/nutrition/Dashboard';
import Plan from './pages/nutrition/Plan';
import StaffDashboard from './pages/staff/Dashboard';
import StaffCheckin from './pages/staff/Checkin';

/** Trainer and physiotherapist share the same pages under their own URL prefix and role guard. */
function coachRoutes(base, role, label) {
  return (
    <Route key={base} element={<ProtectedRoute roles={[role]} />}>
      <Route path={base} element={<AppShell nav={coachNav(`/${base}`, { sessionsLabel: role === 'TRAINER' ? 'Training sessions' : 'Treatment sessions' })} portal={label} />}>
        <Route index element={<ProviderDashboard base={`/${base}`} />} />
        <Route path="sessions" element={<ProviderSessions base={`/${base}`} />} />
        <Route path="availability" element={<Availability />} />
        <Route path="packages" element={<ProviderPackages />} />
        <Route path="clients" element={<Clients base={`/${base}`} />} />
        <Route path="messages" element={<Messages subtitle="Chat with your clients." />} />
        <Route path="earnings" element={<Earnings />} />
        <Route path="reviews" element={<Reviews />} />
        <Route path="profile" element={<ProviderProfile />} />
        <Route path="account" element={<Account />} />
        <Route path="*" element={<NotFound />} />
      </Route>
    </Route>
  );
}



export default function App() {
  return (
    <>
      <Routes>
        <Route element={<PublicLayout />}>
          <Route index element={<Landing />} />
          <Route path="gyms" element={<GymsGate />} />
          <Route path="gyms/:id" element={<GymsGate />} />
          <Route path="unauthorized" element={<Unauthorized />} />
        </Route>
        <Route path="login" element={<Login />} />
        <Route path="register" element={<Register />} />
        <Route path="change-password" element={<ForcedPasswordChange />} />
        {/* Chapa redirects here after payment (backend FRONTEND_URL must point at this app) */}
        <Route path="payment-success" element={<PaymentResult />} />
        <Route path="payment-failed" element={<PaymentResult />} />
        <Route path="payment-pending" element={<PaymentResult />} />

        <Route element={<ProtectedRoute roles={['MEMBER']} />}>
          <Route path="app" element={<AppShell nav={MEMBER_NAV} portal="Member" />}>
            <Route index element={<MemberDashboard />} />
            <Route path="gyms" element={<GymList />} />
            <Route path="gyms/:id" element={<GymDetail />} />
            <Route path="gyms/:id/book" element={<BookingFlow />} />
            <Route path="bookings" element={<BookingList />} />
            <Route path="bookings/:id" element={<BookingDetail />} />
            <Route path="sessions" element={<MemberSessions />} />
            <Route path="messages" element={<Messages />} />
            <Route path="progress" element={<Progress />} />
            <Route path="assistant" element={<Assistant />} />
            <Route path="profile" element={<MemberProfile />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['GYM_ADMIN']} />}>
          <Route path="admin" element={<AdminLayout />}>
            <Route index element={<AdminDashboard />} />
            <Route path="gyms" element={<AdminGyms />} />
            <Route path="packages" element={<AdminPackages />} />
            <Route path="bookings" element={<AdminBookings />} />
            <Route path="members" element={<AdminMembers />} />
            <Route path="providers" element={<AdminProviders />} />
            <Route path="staff" element={<AdminStaff />} />
            <Route path="payouts" element={<AdminPayouts />} />
            <Route path="leaderboard" element={<AdminLeaderboard />} />
            <Route path="profile" element={<AdminProfile />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>

        {coachRoutes('trainer', 'TRAINER', 'Trainer portal')}
        {coachRoutes('physio', 'PHYSIOTHERAPIST', 'Physiotherapist portal')}

        <Route element={<ProtectedRoute roles={['NUTRITION_CONSULTANT']} />}>
          <Route path="nutrition" element={<AppShell nav={NUTRITION_NAV} portal="Nutrition consultant" />}>
            <Route index element={<NutritionDashboard />} />
            <Route path="plan" element={<Plan />} />
            <Route path="clients" element={<Clients base="/nutrition" groupByGym />} />
            <Route path="messages" element={<Messages subtitle="Chat with your clients. Access ends when their plan period does." />} />
            <Route path="earnings" element={<Earnings />} />
            <Route path="profile" element={<ProviderProfile />} />
            <Route path="account" element={<Account />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>

        <Route element={<ProtectedRoute roles={['GYM_STAFF']} />}>
          <Route path="staff" element={<AppShell nav={STAFF_NAV} portal="Gym staff" />}>
            <Route index element={<StaffDashboard />} />
            <Route path="checkin" element={<StaffCheckin />} />
            <Route path="account" element={<Account />} />
            <Route path="*" element={<NotFound />} />
          </Route>
        </Route>

        <Route path="*" element={<NotFound />} />
      </Routes>
    </>
  );
}

