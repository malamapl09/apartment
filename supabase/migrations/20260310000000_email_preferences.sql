CREATE TABLE email_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  new_charges boolean DEFAULT true,
  maintenance_updates boolean DEFAULT true,
  visitor_checkins boolean DEFAULT true,
  new_announcements boolean DEFAULT true,
  overdue_reminders boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id)
);

ALTER TABLE email_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences"
  ON email_preferences FOR SELECT USING (user_id = auth.uid());
CREATE POLICY "Users can update own preferences"
  ON email_preferences FOR UPDATE USING (user_id = auth.uid());
CREATE POLICY "Users can insert own preferences"
  ON email_preferences FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE TRIGGER set_email_preferences_updated_at
  BEFORE UPDATE ON email_preferences FOR EACH ROW EXECUTE FUNCTION set_updated_at();
