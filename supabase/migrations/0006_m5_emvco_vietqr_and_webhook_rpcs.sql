-- ============================================================================
-- CF_19 ENTERPRISE COFFEE SUPPLY CHAIN & 4-STORE POS/KDS SYSTEM
-- Migration: 0006_m5_emvco_vietqr_and_webhook_rpcs.sql
-- Scope: M5.1 Atomic PL/pgSQL Functions & RPCs for:
--        1. EMVCo CRC16-CCITT (Poly 0x1021, Init 0xFFFF) Checksum
--        2. EMVCo NAPAS247 Dynamic VietQR Payload Builder
--        3. RBAC-Protected Dynamic VietQR Generator for POS Orders
--        4. Idempotent Banking Webhook/IPN Consumer (payment_webhook_logs)
--           with Amount Verification, Void Guard, Atomic PAID Reconciliation,
--           Vietnamese Voice Announcement Payload & Immutable Audit Trail.
-- Author: Queen Neon (Gemini 4 Neon High - Principal DB Architect)
-- ============================================================================

-- ============================================================================
-- SECTION 1: PURE EMVCO TLV & CRC16-CCITT HELPER FUNCTIONS
-- ============================================================================

CREATE OR REPLACE FUNCTION public.fn_m5_crc16_ccitt_hex(
  p_input TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
STRICT
AS $$
DECLARE
  v_bytes BYTEA;
  v_len INTEGER;
  v_i INTEGER;
  v_bit INTEGER;
  v_byte INTEGER;
  v_crc INTEGER := 65535; -- 0xFFFF
BEGIN
  v_bytes := convert_to(p_input, 'UTF8');
  v_len := octet_length(v_bytes);

  FOR v_i IN 0 .. v_len - 1 LOOP
    v_byte := get_byte(v_bytes, v_i);
    v_crc := (v_crc # (v_byte << 8)) & 65535;

    FOR v_bit IN 0 .. 7 LOOP
      IF (v_crc & 32768) <> 0 THEN
        v_crc := (((v_crc << 1) # 4129) & 65535); -- 0x1021 = 4129
      ELSE
        v_crc := ((v_crc << 1) & 65535);
      END IF;
    END LOOP;
  END LOOP;

  RETURN UPPER(LPAD(to_hex(v_crc), 4, '0'));
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_m5_format_emv_tlv(
  p_tag TEXT,
  p_value TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_val TEXT;
  v_len INTEGER;
BEGIN
  IF p_tag IS NULL OR p_tag !~ '^[0-9]{2}$' THEN
    RAISE EXCEPTION 'EMVCO_INVALID_TAG: Tag must be exactly 2 numeric digits, got %', p_tag;
  END IF;

  v_val := COALESCE(p_value, '');
  v_len := CHAR_LENGTH(v_val);

  IF v_len > 99 THEN
    RAISE EXCEPTION 'EMVCO_TLV_OVERFLOW: Value length % exceeds maximum 99 for tag %', v_len, p_tag;
  END IF;

  RETURN p_tag || LPAD(v_len::TEXT, 2, '0') || v_val;
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_m5_normalize_emv_ascii(
  p_raw TEXT,
  p_max_len INTEGER,
  p_fallback TEXT
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_text TEXT;
BEGIN
  v_text := COALESCE(TRIM(p_raw), '');
  IF v_text = '' THEN
    RETURN LEFT(p_fallback, p_max_len);
  END IF;

  -- Transliterate common Vietnamese characters into uppercase ASCII
  v_text := TRANSLATE(
    v_text,
    'áàảãạăắằẳẵặâấầẩẫậđéèẻẽẹêếềểễệíìỉĩịóòỏõọôốồổỗộơớờởỡợúùủũụưứừửữựýỳỷỹỵÁÀẢÃẠĂẮẰẲẴẶÂẤẦẨẪẬĐÉÈẺẼẸÊẾỀỂỄỆÍÌỈĨỊÓÒỎÕỌÔỐỒỔỖỘƠỚỜỞỠỢÚÙỦŨỤƯỨỪỬỮỰÝỲỶỸỴ',
    'aaaaaaaaaaaaaaaaadeeeeeeeeeeeiiiiiooooooooooooooooouuuuuuuuuuuyyyyyAAAAAAAAAAAAAAAAADEEEEEEEEEEEIIIIIOOOOOOOOOOOOOOOOOUUUUUUUUUUUYYYYY'
  );
  v_text := UPPER(v_text);
  v_text := REGEXP_REPLACE(v_text, '[^A-Z0-9 ._-]', '', 'g');
  v_text := REGEXP_REPLACE(v_text, '\s+', ' ', 'g');
  v_text := TRIM(v_text);

  IF v_text = '' THEN
    v_text := p_fallback;
  END IF;

  RETURN TRIM(LEFT(v_text, p_max_len));
END;
$$;

CREATE OR REPLACE FUNCTION public.fn_m5_build_emvco_vietqr_payload(
  p_bank_bin TEXT,
  p_account_no TEXT,
  p_amount_vnd BIGINT,
  p_order_code TEXT,
  p_vietqr_ref_code TEXT,
  p_account_name TEXT DEFAULT 'CF19 TAY NGUYEN COFFEE',
  p_merchant_city TEXT DEFAULT 'BUON MA THUOT'
)
RETURNS TEXT
LANGUAGE plpgsql
IMMUTABLE
AS $$
DECLARE
  v_bank_bin TEXT;
  v_account_no TEXT;
  v_merchant_name TEXT;
  v_merchant_city TEXT;
  v_order_code TEXT;
  v_ref_code TEXT;
  v_beneficiary_tlv TEXT;
  v_merchant_account_info TEXT;
  v_additional_data TEXT;
  v_payload_without_crc TEXT;
  v_crc_hex TEXT;
BEGIN
  v_bank_bin := TRIM(COALESCE(p_bank_bin, ''));
  IF v_bank_bin !~ '^[0-9]{6}$' THEN
    RAISE EXCEPTION 'EMVCO_INVALID_BANK_BIN: NAPAS bank BIN must be exactly 6 digits';
  END IF;

  v_account_no := REGEXP_REPLACE(TRIM(COALESCE(p_account_no, '')), '\s+', '', 'g');
  IF CHAR_LENGTH(v_account_no) < 4 OR CHAR_LENGTH(v_account_no) > 32 THEN
    RAISE EXCEPTION 'EMVCO_INVALID_ACCOUNT_NO: Account number length must be between 4 and 32';
  END IF;

  IF p_amount_vnd IS NULL OR p_amount_vnd <= 0 THEN
    RAISE EXCEPTION 'EMVCO_INVALID_AMOUNT: Dynamic VietQR amount_vnd must be greater than 0';
  END IF;

  v_merchant_name := public.fn_m5_normalize_emv_ascii(p_account_name, 25, 'CF19 TAY NGUYEN COFFEE');
  v_merchant_city := public.fn_m5_normalize_emv_ascii(p_merchant_city, 15, 'BUON MA THUOT');
  v_order_code := public.fn_m5_normalize_emv_ascii(p_order_code, 25, 'ORDER');
  v_ref_code := public.fn_m5_normalize_emv_ascii(p_vietqr_ref_code, 50, 'VQR-ORDER');

  -- Tag 38: Merchant Account Information (NAPAS247)
  -- Sub-tag 00: NAPAS GUID = A000000727
  -- Sub-tag 01: Beneficiary org = TLV(00, bankBin) + TLV(01, accountNumber)
  -- Sub-tag 02: Service code = QRIBFTTA (24/7 Fast Transfer to Account)
  v_beneficiary_tlv :=
    public.fn_m5_format_emv_tlv('00', v_bank_bin) ||
    public.fn_m5_format_emv_tlv('01', v_account_no);

  v_merchant_account_info :=
    public.fn_m5_format_emv_tlv('00', 'A000000727') ||
    public.fn_m5_format_emv_tlv('01', v_beneficiary_tlv) ||
    public.fn_m5_format_emv_tlv('02', 'QRIBFTTA');

  -- Tag 62: Additional Data Field Template (Sub-tag 01 = Bill Number, Sub-tag 08 = Reference)
  v_additional_data :=
    public.fn_m5_format_emv_tlv('01', v_order_code) ||
    public.fn_m5_format_emv_tlv('08', v_ref_code);

  v_payload_without_crc :=
    public.fn_m5_format_emv_tlv('00', '01') ||
    public.fn_m5_format_emv_tlv('01', '12') ||
    public.fn_m5_format_emv_tlv('38', v_merchant_account_info) ||
    public.fn_m5_format_emv_tlv('52', '5814') ||
    public.fn_m5_format_emv_tlv('53', '704') ||
    public.fn_m5_format_emv_tlv('54', p_amount_vnd::TEXT) ||
    public.fn_m5_format_emv_tlv('58', 'VN') ||
    public.fn_m5_format_emv_tlv('59', v_merchant_name) ||
    public.fn_m5_format_emv_tlv('60', v_merchant_city) ||
    public.fn_m5_format_emv_tlv('62', v_additional_data) ||
    '6304';

  v_crc_hex := public.fn_m5_crc16_ccitt_hex(v_payload_without_crc);
  RETURN v_payload_without_crc || v_crc_hex;
END;
$$;

-- ============================================================================
-- SECTION 2: RPC 1 - GENERATE DYNAMIC VIETQR PAYLOAD FOR A POS ORDER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_m5_generate_order_vietqr(
  p_store_id UUID,
  p_order_id UUID,
  p_bank_bin TEXT,
  p_account_no TEXT,
  p_account_name TEXT,
  p_actor_id UUID
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_order RECORD;
  v_ref_code TEXT;
  v_payload TEXT;
  v_crc_hex TEXT;
  v_merchant_name TEXT;
  v_merchant_city TEXT := 'BUON MA THUOT';
BEGIN
  -- Enforce store-level RBAC (blocks WAREHOUSE_MANAGER, BARISTA_KDS, cross-store actors)
  PERFORM public._m4_assert_store_pos_actor(p_actor_id, p_store_id, FALSE);

  SELECT
    o.id,
    o.store_id,
    o.order_code,
    o.vietqr_ref_code,
    o.total_amount_vnd,
    o.payment_method,
    o.payment_status
  INTO v_order
  FROM public.pos_orders o
  WHERE o.id = p_order_id
  FOR UPDATE;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: POS order % not found', p_order_id;
  END IF;

  IF v_order.store_id <> p_store_id THEN
    RAISE EXCEPTION 'FORBIDDEN_CROSS_TENANT_ACCESS: Order % does not belong to store %',
      p_order_id, p_store_id;
  END IF;

  IF v_order.payment_status = 'VOIDED' THEN
    RAISE EXCEPTION 'ORDER_ALREADY_VOIDED: Cannot generate VietQR for voided order %',
      v_order.order_code;
  END IF;

  IF v_order.total_amount_vnd <= 0 THEN
    RAISE EXCEPTION 'EMVCO_INVALID_AMOUNT: Order % total_amount_vnd must be greater than 0',
      v_order.order_code;
  END IF;

  v_ref_code := v_order.vietqr_ref_code;
  IF v_ref_code IS NULL OR TRIM(v_ref_code) = '' THEN
    v_ref_code := 'VQR-' || UPPER(REGEXP_REPLACE(v_order.order_code, '[^A-Za-z0-9_-]', '', 'g'));

    UPDATE public.pos_orders
    SET
      vietqr_ref_code = v_ref_code,
      updated_at = NOW()
    WHERE id = v_order.id;
  END IF;

  v_merchant_name := public.fn_m5_normalize_emv_ascii(p_account_name, 25, 'CF19 TAY NGUYEN COFFEE');
  v_payload := public.fn_m5_build_emvco_vietqr_payload(
    p_bank_bin,
    p_account_no,
    v_order.total_amount_vnd,
    v_order.order_code,
    v_ref_code,
    v_merchant_name,
    v_merchant_city
  );
  v_crc_hex := RIGHT(v_payload, 4);

  RETURN jsonb_build_object(
    'order_id', v_order.id,
    'store_id', v_order.store_id,
    'order_code', v_order.order_code,
    'vietqr_ref_code', v_ref_code,
    'amount_vnd', v_order.total_amount_vnd,
    'payment_status', v_order.payment_status,
    'bank_bin', TRIM(p_bank_bin),
    'account_number', REGEXP_REPLACE(TRIM(p_account_no), '\s+', '', 'g'),
    'account_name', v_merchant_name,
    'merchant_city', v_merchant_city,
    'emvco_payload', v_payload,
    'crc16_hex', v_crc_hex,
    'is_dynamic', TRUE,
    'generated_at', NOW()
  );
END;
$$;

-- ============================================================================
-- SECTION 3: RPC 2 - IDEMPOTENT BANKING WEBHOOK / IPN CONSUMER
-- ============================================================================

CREATE OR REPLACE FUNCTION public.rpc_m5_process_vietqr_webhook(
  p_idempotency_key TEXT,
  p_bank_tx_id TEXT,
  p_amount_vnd BIGINT,
  p_transfer_content TEXT,
  p_order_id UUID DEFAULT NULL,
  p_vietqr_ref_code TEXT DEFAULT NULL,
  p_raw_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_idempotency_key TEXT;
  v_bank_tx_id TEXT;
  v_existing_log RECORD;
  v_existing_order RECORD;
  v_resolved_ref TEXT;
  v_order RECORD;
  v_new_log_id UUID;
  v_processed_at TIMESTAMPTZ;
  v_formatted_amount TEXT;
  v_message_vi TEXT;
  v_speaker_payload JSONB;
BEGIN
  v_idempotency_key := TRIM(COALESCE(p_idempotency_key, ''));
  v_bank_tx_id := TRIM(COALESCE(p_bank_tx_id, ''));

  IF v_idempotency_key = '' THEN
    RAISE EXCEPTION 'WEBHOOK_INVALID_PAYLOAD: idempotency_key is required';
  END IF;

  IF v_bank_tx_id = '' THEN
    RAISE EXCEPTION 'WEBHOOK_INVALID_PAYLOAD: bank_tx_id is required';
  END IF;

  IF p_amount_vnd IS NULL OR p_amount_vnd <= 0 THEN
    RAISE EXCEPTION 'WEBHOOK_INVALID_AMOUNT: amount_vnd must be greater than 0';
  END IF;

  -- Step 1: Strictly Idempotent Replay Check (idempotency_key OR bank_tx_id)
  SELECT
    l.id,
    l.idempotency_key,
    l.store_id,
    l.order_id,
    l.amount_vnd,
    l.bank_tx_id,
    l.processed_at
  INTO v_existing_log
  FROM public.payment_webhook_logs l
  WHERE l.idempotency_key = v_idempotency_key
     OR l.bank_tx_id = v_bank_tx_id
  LIMIT 1;

  IF v_existing_log.id IS NOT NULL THEN
    SELECT o.order_code, o.vietqr_ref_code, o.total_amount_vnd, o.payment_status
      INTO v_existing_order
    FROM public.pos_orders o
    WHERE o.id = v_existing_log.order_id;

    RETURN jsonb_build_object(
      'status', 'IDEMPOTENT_REPLAY',
      'already_processed', TRUE,
      'should_trigger_speaker', FALSE,
      'webhook_log_id', v_existing_log.id,
      'idempotency_key', v_existing_log.idempotency_key,
      'bank_tx_id', v_existing_log.bank_tx_id,
      'store_id', v_existing_log.store_id,
      'order_id', v_existing_log.order_id,
      'order_code', v_existing_order.order_code,
      'vietqr_ref_code', v_existing_order.vietqr_ref_code,
      'amount_vnd', v_existing_log.amount_vnd,
      'order_total_vnd', v_existing_order.total_amount_vnd,
      'payment_status', v_existing_order.payment_status,
      'processed_at', v_existing_log.processed_at,
      'speaker_announcement', NULL
    );
  END IF;

  -- Step 2: Resolve vietqr_ref_code (direct parameter or regex extraction from bank memo)
  v_resolved_ref := NULLIF(UPPER(TRIM(COALESCE(p_vietqr_ref_code, ''))), '');
  IF v_resolved_ref IS NULL AND p_transfer_content IS NOT NULL THEN
    v_resolved_ref := RTRIM(
      SUBSTRING(UPPER(p_transfer_content) FROM '(?:^|[^A-Z0-9_-])(VQR[-_][A-Z0-9_-]+)'),
      '-_'
    );
    IF v_resolved_ref = '' THEN
      v_resolved_ref := NULL;
    END IF;
  END IF;

  -- Step 3: Lock Target POS Order Atomically
  IF p_order_id IS NOT NULL THEN
    SELECT
      o.id,
      o.store_id,
      o.cashier_id,
      o.order_code,
      o.vietqr_ref_code,
      o.total_amount_vnd,
      o.payment_method,
      o.payment_status
    INTO v_order
    FROM public.pos_orders o
    WHERE o.id = p_order_id
    FOR UPDATE;
  ELSIF v_resolved_ref IS NOT NULL THEN
    SELECT
      o.id,
      o.store_id,
      o.cashier_id,
      o.order_code,
      o.vietqr_ref_code,
      o.total_amount_vnd,
      o.payment_method,
      o.payment_status
    INTO v_order
    FROM public.pos_orders o
    WHERE UPPER(o.vietqr_ref_code) = v_resolved_ref
    FOR UPDATE;
  END IF;

  IF v_order.id IS NULL THEN
    RAISE EXCEPTION 'ORDER_NOT_FOUND: Cannot match POS order for order_id=% or vietqr_ref_code=%',
      p_order_id, v_resolved_ref;
  END IF;

  -- Step 4: Enforce Domain Invariants (Void Guard, Duplicate Payment Guard, Exact/Overpaid Amount Guard)
  IF v_order.payment_status = 'VOIDED' THEN
    RAISE EXCEPTION 'ORDER_ALREADY_VOIDED: Cannot reconcile payment for voided order %',
      v_order.order_code;
  END IF;

  IF v_order.payment_status = 'PAID' THEN
    RAISE EXCEPTION 'ORDER_ALREADY_PAID: Order % is already settled', v_order.order_code;
  END IF;

  IF p_amount_vnd < v_order.total_amount_vnd THEN
    RAISE EXCEPTION 'WEBHOOK_AMOUNT_MISMATCH: Received % VND is less than required % VND for order %',
      p_amount_vnd, v_order.total_amount_vnd, v_order.order_code;
  END IF;

  -- Step 5: Atomic Insert into payment_webhook_logs + Update pos_orders + Immutable audit_logs
  INSERT INTO public.payment_webhook_logs (
    idempotency_key,
    store_id,
    order_id,
    amount_vnd,
    bank_tx_id,
    raw_payload,
    processed_at
  )
  VALUES (
    v_idempotency_key,
    v_order.store_id,
    v_order.id,
    p_amount_vnd,
    v_bank_tx_id,
    COALESCE(p_raw_payload, '{}'::jsonb) || jsonb_build_object(
      'transfer_content', p_transfer_content,
      'resolved_vietqr_ref_code', COALESCE(v_order.vietqr_ref_code, v_resolved_ref)
    ),
    NOW()
  )
  RETURNING id, processed_at
    INTO v_new_log_id, v_processed_at;

  UPDATE public.pos_orders
  SET
    payment_status = 'PAID',
    payment_method = 'VIETQR',
    vietqr_ref_code = COALESCE(vietqr_ref_code, v_resolved_ref),
    updated_at = NOW()
  WHERE id = v_order.id;

  v_formatted_amount := REPLACE(TRIM(TO_CHAR(p_amount_vnd, 'FM999,999,999,999,990')), ',', '.');
  v_message_vi := 'Ting ting! Đã nhận chuyển khoản ' || v_formatted_amount || ' đồng cho đơn hàng ' || v_order.order_code || '.';

  v_speaker_payload := jsonb_build_object(
    'order_id', v_order.id,
    'order_code', v_order.order_code,
    'store_id', v_order.store_id,
    'amount_vnd', p_amount_vnd,
    'formatted_amount_vnd', v_formatted_amount,
    'vietqr_ref_code', COALESCE(v_order.vietqr_ref_code, v_resolved_ref),
    'message_vi', v_message_vi,
    'lang', 'vi-VN',
    'chime_frequencies_hz', jsonb_build_array(523.25, 659.25, 783.99, 1046.5),
    'chime_duration_ms', 140,
    'generated_at', v_processed_at
  );

  INSERT INTO public.audit_logs (
    actor_id,
    store_id,
    action,
    target_table,
    target_id,
    reason,
    payload_json
  )
  VALUES (
    v_order.cashier_id,
    v_order.store_id,
    'VIETQR_WEBHOOK_RECONCILED',
    'pos_orders',
    v_order.id,
    'Reconciled POS order via idempotent banking webhook ' || v_bank_tx_id,
    jsonb_build_object(
      'source', 'VIETQR_BANK_WEBHOOK',
      'webhook_log_id', v_new_log_id,
      'idempotency_key', v_idempotency_key,
      'bank_tx_id', v_bank_tx_id,
      'order_code', v_order.order_code,
      'vietqr_ref_code', COALESCE(v_order.vietqr_ref_code, v_resolved_ref),
      'amount_vnd', p_amount_vnd,
      'order_total_vnd', v_order.total_amount_vnd
    )
  );

  RETURN jsonb_build_object(
    'status', 'RECONCILED_PAID',
    'already_processed', FALSE,
    'should_trigger_speaker', TRUE,
    'webhook_log_id', v_new_log_id,
    'idempotency_key', v_idempotency_key,
    'bank_tx_id', v_bank_tx_id,
    'store_id', v_order.store_id,
    'order_id', v_order.id,
    'order_code', v_order.order_code,
    'vietqr_ref_code', COALESCE(v_order.vietqr_ref_code, v_resolved_ref),
    'amount_vnd', p_amount_vnd,
    'order_total_vnd', v_order.total_amount_vnd,
    'payment_status', 'PAID',
    'processed_at', v_processed_at,
    'speaker_announcement', v_speaker_payload
  );
END;
$$;
