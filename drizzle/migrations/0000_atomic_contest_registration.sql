CREATE UNIQUE INDEX IF NOT EXISTS contest_registrations_contest_user_uniq ON public.contest_registrations(contest_id, user_id);

-- Students must register via RPC (prevents self-marking as paid)
DROP POLICY IF EXISTS "Users can insert own registrations" ON public.contest_registrations;

CREATE OR REPLACE FUNCTION public.assign_balanced_exam(_contest_id uuid, _user_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _exam uuid; _pid uuid; _cur uuid;
BEGIN
  PERFORM 1 FROM contests WHERE id = _contest_id FOR UPDATE;
  SELECT id, assigned_exam_id INTO _pid, _cur FROM contest_participants
   WHERE contest_id = _contest_id AND user_id = _user_id;
  IF _pid IS NULL OR _cur IS NOT NULL THEN RETURN _cur; END IF;
  SELECT ce.exam_id INTO _exam
    FROM contest_exams ce JOIN exams e ON e.id = ce.exam_id
    LEFT JOIN contest_participants cp ON cp.contest_id = ce.contest_id AND cp.assigned_exam_id = ce.exam_id
   WHERE ce.contest_id = _contest_id
   GROUP BY ce.exam_id, ce.variant_code
   ORDER BY count(cp.id), ce.variant_code LIMIT 1;
  IF _exam IS NOT NULL THEN
    UPDATE contest_participants SET assigned_exam_id = _exam, assigned_at = now() WHERE id = _pid;
  END IF;
  RETURN _exam;
END $$;

CREATE OR REPLACE FUNCTION public.register_for_contest(_invite_code text)
RETURNS public.contest_registrations LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _uid uuid := auth.uid(); _code organization_contest_codes; _cnt int; _reg contest_registrations; _free boolean;
BEGIN
  IF _uid IS NULL THEN RAISE EXCEPTION 'Bạn cần đăng nhập để đăng ký'; END IF;
  SELECT * INTO _code FROM organization_contest_codes
   WHERE invite_code = upper(trim(_invite_code)) AND is_active = true FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Mã mời không hợp lệ hoặc đã hết hạn'; END IF;
  IF EXISTS (SELECT 1 FROM contest_registrations WHERE contest_id = _code.contest_id AND user_id = _uid) THEN
    RAISE EXCEPTION 'Bạn đã đăng ký cuộc thi này rồi';
  END IF;
  IF _code.max_registrations IS NOT NULL THEN
    SELECT count(*) INTO _cnt FROM contest_registrations
     WHERE invite_code_id = _code.id AND payment_status IN ('pending','paid','free');
    IF _cnt >= _code.max_registrations THEN RAISE EXCEPTION 'Mã mời đã đạt giới hạn đăng ký'; END IF;
  END IF;
  _free := COALESCE(_code.registration_fee, 0) = 0;
  INSERT INTO contest_registrations(contest_id, user_id, organization_id, invite_code_id, payment_status, payment_method, payment_amount, currency)
  VALUES (_code.contest_id, _uid, _code.organization_id, _code.id,
          CASE WHEN _free THEN 'free'::payment_status ELSE 'pending'::payment_status END,
          CASE WHEN _free THEN 'free'::payment_method ELSE 'bank_transfer'::payment_method END,
          COALESCE(_code.registration_fee,0), _code.currency)
  RETURNING * INTO _reg;
  IF _free THEN
    INSERT INTO contest_participants(contest_id, user_id) VALUES (_code.contest_id, _uid) ON CONFLICT (contest_id, user_id) DO NOTHING;
    PERFORM assign_balanced_exam(_code.contest_id, _uid);
  END IF;
  RETURN _reg;
END $$;

CREATE OR REPLACE FUNCTION public.submit_registration_proof(_registration_id uuid, _proof_url text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  UPDATE contest_registrations SET bank_transfer_proof = _proof_url
   WHERE id = _registration_id AND user_id = auth.uid() AND payment_status = 'pending';
  IF NOT FOUND THEN RAISE EXCEPTION 'Không thể cập nhật minh chứng'; END IF;
END $$;

CREATE OR REPLACE FUNCTION public.approve_registration(_registration_id uuid)
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _reg contest_registrations;
BEGIN
  SELECT * INTO _reg FROM contest_registrations WHERE id = _registration_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy đăng ký'; END IF;
  IF NOT (has_role(auth.uid(),'admin') OR (has_role(auth.uid(),'teacher') AND owns_contest(_reg.contest_id))) THEN
    RAISE EXCEPTION 'Không có quyền';
  END IF;
  UPDATE contest_registrations SET payment_status = 'paid', approved_by = auth.uid(), approved_at = now()
   WHERE id = _registration_id;
  INSERT INTO contest_participants(contest_id, user_id) VALUES (_reg.contest_id, _reg.user_id) ON CONFLICT (contest_id, user_id) DO NOTHING;
  RETURN assign_balanced_exam(_reg.contest_id, _reg.user_id);
END $$;

CREATE OR REPLACE FUNCTION public.reject_registration(_registration_id uuid)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE _reg contest_registrations;
BEGIN
  SELECT * INTO _reg FROM contest_registrations WHERE id = _registration_id FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Không tìm thấy đăng ký'; END IF;
  IF NOT (has_role(auth.uid(),'admin') OR (has_role(auth.uid(),'teacher') AND owns_contest(_reg.contest_id))) THEN
    RAISE EXCEPTION 'Không có quyền';
  END IF;
  UPDATE contest_registrations SET payment_status = 'failed' WHERE id = _registration_id;
  -- Revoke access unless the student already submitted
  DELETE FROM contest_participants cp
   WHERE cp.contest_id = _reg.contest_id AND cp.user_id = _reg.user_id
     AND NOT EXISTS (SELECT 1 FROM exam_results r WHERE r.user_id = cp.user_id AND r.exam_id = cp.assigned_exam_id);
END $$;

REVOKE EXECUTE ON FUNCTION public.assign_balanced_exam(uuid, uuid) FROM PUBLIC, anon, authenticated;
REVOKE EXECUTE ON FUNCTION public.register_for_contest(text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.submit_registration_proof(uuid, text) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.approve_registration(uuid) FROM PUBLIC, anon;
REVOKE EXECUTE ON FUNCTION public.reject_registration(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.register_for_contest(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.submit_registration_proof(uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.approve_registration(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reject_registration(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.soft_delete_questions(uuid[]) FROM anon;
REVOKE EXECUTE ON FUNCTION public.calculate_level_from_xp(integer) FROM anon;