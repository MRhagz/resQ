-- 1. Beneficiaries: Allow anyone to register (Insert) and read
CREATE POLICY "Allow public insert to beneficiaries" ON public.beneficiaries FOR INSERT TO public, anon, authenticated WITH CHECK (true);
CREATE POLICY "Allow public read beneficiaries" ON public.beneficiaries FOR SELECT TO public, anon, authenticated USING (true);

-- 2. Staff Profiles: Allow users to insert their own profile upon signup, and read profiles
CREATE POLICY "Allow users to insert their profile" ON public.staff_profiles FOR INSERT TO authenticated WITH CHECK (auth.uid() = id);
CREATE POLICY "Allow read staff profiles" ON public.staff_profiles FOR SELECT TO authenticated USING (true);

-- 3. Disaster Events: Allow authenticated staff to create, read, and update disasters
CREATE POLICY "Allow staff to insert disasters" ON public.disaster_events FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow staff to read disasters" ON public.disaster_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow ONLY admins to update disasters" 
ON public.disaster_events 
FOR UPDATE 
TO authenticated 
USING (
  EXISTS (
    SELECT 1 FROM public.staff_profiles
    WHERE staff_profiles.id = auth.uid() AND staff_profiles.role = 'super_admin'
  )
);

-- 4. Claims: Allow authenticated staff to log claims and read them
CREATE POLICY "Allow staff to insert claims" ON public.claims FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow staff to read claims" ON public.claims FOR SELECT TO authenticated USING (true);
