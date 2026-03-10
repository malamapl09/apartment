-- Enable Supabase Realtime for the notifications table
-- This allows the client-side useRealtimeNotifications hook to receive
-- INSERT events via Postgres Changes.
ALTER PUBLICATION supabase_realtime ADD TABLE notifications;
