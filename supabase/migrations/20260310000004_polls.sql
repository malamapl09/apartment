-- Polls & Voting feature
CREATE TABLE polls (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  building_id uuid NOT NULL REFERENCES buildings(id),
  title text NOT NULL,
  description text,
  poll_type text NOT NULL DEFAULT 'single_choice' CHECK (poll_type IN ('single_choice', 'multiple_choice', 'yes_no')),
  target text DEFAULT 'all' CHECK (target IN ('all', 'owners', 'residents')),
  created_by uuid REFERENCES profiles(id),
  starts_at timestamptz NOT NULL DEFAULT now(),
  ends_at timestamptz NOT NULL,
  is_anonymous boolean DEFAULT false,
  status text NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'active', 'closed')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE poll_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  label text NOT NULL,
  sort_order integer DEFAULT 0
);

CREATE TABLE poll_votes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  poll_id uuid NOT NULL REFERENCES polls(id) ON DELETE CASCADE,
  option_id uuid NOT NULL REFERENCES poll_options(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES profiles(id),
  apartment_id uuid REFERENCES apartments(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE(poll_id, user_id, option_id)
);

CREATE INDEX idx_polls_building ON polls(building_id, status);
CREATE INDEX idx_poll_options_poll ON poll_options(poll_id, sort_order);
CREATE INDEX idx_poll_votes_poll ON poll_votes(poll_id);
CREATE INDEX idx_poll_votes_user ON poll_votes(user_id);

CREATE TRIGGER set_polls_updated_at
  BEFORE UPDATE ON polls FOR EACH ROW EXECUTE FUNCTION set_updated_at();

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_options ENABLE ROW LEVEL SECURITY;
ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

-- Polls: members see active/closed, admins see all
CREATE POLICY "Building members can view active polls"
  ON polls FOR SELECT
  USING (building_id = public.get_my_building_id() AND status IN ('active', 'closed'));

CREATE POLICY "Admins can manage polls"
  ON polls FOR ALL
  USING (building_id = public.get_my_building_id() AND public.get_my_role() IN ('admin', 'super_admin'));

-- Poll options: visible if poll is visible
CREATE POLICY "Building members can view poll options"
  ON poll_options FOR SELECT
  USING (EXISTS (SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id AND polls.building_id = public.get_my_building_id()));

CREATE POLICY "Admins can manage poll options"
  ON poll_options FOR ALL
  USING (EXISTS (SELECT 1 FROM polls WHERE polls.id = poll_options.poll_id AND polls.building_id = public.get_my_building_id()) AND public.get_my_role() IN ('admin', 'super_admin'));

-- Votes: users can insert their own, can view on non-anonymous polls
CREATE POLICY "Users can vote"
  ON poll_votes FOR INSERT
  WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM polls WHERE polls.id = poll_votes.poll_id AND polls.building_id = public.get_my_building_id() AND polls.status = 'active'));

CREATE POLICY "Users can view votes"
  ON poll_votes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM polls WHERE polls.id = poll_votes.poll_id
        AND polls.building_id = public.get_my_building_id()
        AND (polls.is_anonymous = false OR poll_votes.user_id = auth.uid())
    )
  );
