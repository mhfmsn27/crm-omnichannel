--
-- PostgreSQL database dump
--


-- Dumped from database version 16.11 (Ubuntu 16.11-1.pgdg24.04+1)
-- Dumped by pg_dump version 16.11 (Ubuntu 16.11-1.pgdg24.04+1)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Name: public; Type: SCHEMA; Schema: -; Owner: omni_user
--

-- *not* creating schema, since initdb creates it


ALTER SCHEMA public OWNER TO omni_user;

--
-- Name: uuid-ossp; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS "uuid-ossp" WITH SCHEMA public;


--
-- Name: EXTENSION "uuid-ossp"; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION "uuid-ossp" IS 'generate universally unique identifiers (UUIDs)';


--
-- Name: vector; Type: EXTENSION; Schema: -; Owner: -
--

CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;


--
-- Name: EXTENSION vector; Type: COMMENT; Schema: -; Owner:
--

COMMENT ON EXTENSION vector IS 'vector data type and ivfflat and hnsw access methods';


SET default_tablespace = '';

SET default_table_access_method = heap;

--
-- Name: activity_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.activity_logs (
    id bigint NOT NULL,
    actor_id bigint,
    target_type character varying(50),
    target_id bigint,
    action character varying(50) NOT NULL,
    details text,
    ip_address character varying(45),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.activity_logs OWNER TO omni_user;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.activity_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.activity_logs_id_seq OWNER TO omni_user;

--
-- Name: activity_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.activity_logs_id_seq OWNED BY public.activity_logs.id;


--
-- Name: addons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.addons (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    price_monthly numeric(12,2) NOT NULL,
    feature_code character varying(50) NOT NULL,
    prerequisite_feature_code character varying(50),
    type character varying(20) NOT NULL,
    value integer DEFAULT 1,
    duration_days integer DEFAULT 30,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.addons OWNER TO omni_user;

--
-- Name: addons_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.addons_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.addons_id_seq OWNER TO omni_user;

--
-- Name: addons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.addons_id_seq OWNED BY public.addons.id;


--
-- Name: affiliate_commissions; Type: TABLE; Schema: public; Owner: omni_user
--

CREATE TABLE public.affiliate_commissions (
    id integer NOT NULL,
    partner_id integer NOT NULL,
    source_user_id integer,
    amount numeric(15,2) NOT NULL,
    order_ref character varying(50),
    description text,
    status character varying(20) DEFAULT 'available'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.affiliate_commissions OWNER TO omni_user;

--
-- Name: affiliate_commissions_id_seq; Type: SEQUENCE; Schema: public; Owner: omni_user
--

CREATE SEQUENCE public.affiliate_commissions_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.affiliate_commissions_id_seq OWNER TO omni_user;

--
-- Name: affiliate_commissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: omni_user
--

ALTER SEQUENCE public.affiliate_commissions_id_seq OWNED BY public.affiliate_commissions.id;


--
-- Name: affiliate_payouts; Type: TABLE; Schema: public; Owner: omni_user
--

CREATE TABLE public.affiliate_payouts (
    id integer NOT NULL,
    partner_id integer NOT NULL,
    amount numeric(15,2) NOT NULL,
    bank_details text,
    status character varying(20) DEFAULT 'pending'::character varying,
    proof_url text,
    requested_at timestamp with time zone DEFAULT now(),
    processed_at timestamp with time zone
);


ALTER TABLE public.affiliate_payouts OWNER TO omni_user;

--
-- Name: affiliate_payouts_id_seq; Type: SEQUENCE; Schema: public; Owner: omni_user
--

CREATE SEQUENCE public.affiliate_payouts_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.affiliate_payouts_id_seq OWNER TO omni_user;

--
-- Name: affiliate_payouts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: omni_user
--

ALTER SEQUENCE public.affiliate_payouts_id_seq OWNED BY public.affiliate_payouts.id;


--
-- Name: announcements; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.announcements (
    id integer NOT NULL,
    title character varying(200) NOT NULL,
    content text NOT NULL,
    type character varying(20) DEFAULT 'info'::character varying,
    image_url text,
    link_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    placement character varying(20) DEFAULT 'dashboard'::character varying
);


ALTER TABLE public.announcements OWNER TO omni_user;

--
-- Name: announcements_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.announcements_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.announcements_id_seq OWNER TO omni_user;

--
-- Name: announcements_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.announcements_id_seq OWNED BY public.announcements.id;


--
-- Name: broadcast_recipients; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.broadcast_recipients (
    id bigint NOT NULL,
    broadcast_id bigint,
    phone_number character varying(255) NOT NULL,
    name character varying(100),
    status character varying(20) DEFAULT 'queued'::character varying,
    used_session_id bigint,
    sent_at timestamp with time zone,
    error_log text,
    group_name character varying(255),
    custom_vars jsonb DEFAULT '{}'::jsonb
);


ALTER TABLE public.broadcast_recipients OWNER TO omni_user;

--
-- Name: broadcast_recipients_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.broadcast_recipients_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.broadcast_recipients_id_seq OWNER TO omni_user;

--
-- Name: broadcast_recipients_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.broadcast_recipients_id_seq OWNED BY public.broadcast_recipients.id;


--
-- Name: broadcasts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.broadcasts (
    id bigint NOT NULL,
    organization_id bigint,
    name character varying(100) NOT NULL,
    message_template text NOT NULL,
    media_url text,
    rotator_group_id bigint,
    device_id bigint,
    target_type character varying(20) DEFAULT 'all'::character varying,
    target_value text,
    status character varying(20) DEFAULT 'draft'::character varying,
    scheduled_at timestamp with time zone,
    delay_settings jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.broadcasts OWNER TO omni_user;

--
-- Name: broadcasts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.broadcasts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.broadcasts_id_seq OWNER TO omni_user;

--
-- Name: broadcasts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.broadcasts_id_seq OWNED BY public.broadcasts.id;


--
-- Name: chat_flows; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chat_flows (
    id bigint NOT NULL,
    organization_id bigint,
    name character varying(100) NOT NULL,
    trigger_keyword character varying(50) NOT NULL,
    nodes jsonb NOT NULL,
    edges jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.chat_flows OWNER TO omni_user;

--
-- Name: chat_flows_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chat_flows_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chat_flows_id_seq OWNER TO omni_user;

--
-- Name: chat_flows_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chat_flows_id_seq OWNED BY public.chat_flows.id;


--
-- Name: chatbot_logs; Type: TABLE; Schema: public; Owner: omni_user
--

CREATE TABLE public.chatbot_logs (
    id bigint NOT NULL,
    organization_id bigint,
    contact_id bigint,
    conversation_id bigint,
    message_content text,
    matched_rule_id bigint,
    match_type character varying(20),
    is_handled boolean DEFAULT true,
    is_fallback boolean DEFAULT false,
    confidence_score numeric(5,2) DEFAULT 1.00,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.chatbot_logs OWNER TO omni_user;

--
-- Name: chatbot_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: omni_user
--

CREATE SEQUENCE public.chatbot_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chatbot_logs_id_seq OWNER TO omni_user;

--
-- Name: chatbot_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: omni_user
--

ALTER SEQUENCE public.chatbot_logs_id_seq OWNED BY public.chatbot_logs.id;


--
-- Name: chatbot_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.chatbot_settings (
    id integer NOT NULL,
    organization_id bigint,
    name character varying(100) DEFAULT 'My Bot'::character varying NOT NULL,
    session_id character varying(100),
    is_active boolean DEFAULT false,
    system_prompt text DEFAULT 'You are a helpful assistant.'::text,
    escalation_keywords text,
    use_global_kb boolean DEFAULT true,
    auto_reply_config jsonb DEFAULT '{}'::jsonb,
    updated_at timestamp with time zone DEFAULT now(),
    cached_device_name character varying(255)
);


ALTER TABLE public.chatbot_settings OWNER TO omni_user;

--
-- Name: chatbot_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.chatbot_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.chatbot_settings_id_seq OWNER TO omni_user;

--
-- Name: chatbot_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.chatbot_settings_id_seq OWNED BY public.chatbot_settings.id;


--
-- Name: contact_labels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contact_labels (
    contact_id bigint NOT NULL,
    label_id bigint NOT NULL
);


ALTER TABLE public.contact_labels OWNER TO omni_user;

--
-- Name: contacts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.contacts (
    id bigint NOT NULL,
    organization_id bigint,
    name character varying(255),
    phone_number character varying(255) NOT NULL,
    email character varying(100),
    profile_pic_url text,
    source character varying(20) DEFAULT 'manual'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_subscribed boolean DEFAULT true,
    unsubscribed_at timestamp with time zone,
    last_inbound_at timestamp with time zone,
    web_visitor_id character varying(100),
    username character varying(255),
    telegram_id bigint,
    internal_note text,
    birth_date date,
    country text,
    province text,
    city text,
    postal_code text,
    po_box text,
    address text,
    address_line_2 text
);


ALTER TABLE public.contacts OWNER TO omni_user;

--
-- Name: contacts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.contacts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.contacts_id_seq OWNER TO omni_user;

--
-- Name: contacts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.contacts_id_seq OWNED BY public.contacts.id;


--
-- Name: conversation_ratings; Type: TABLE; Schema: public; Owner: omni_user
--

CREATE TABLE public.conversation_ratings (
    id bigint NOT NULL,
    conversation_id bigint,
    rating_token character varying(100),
    score integer NOT NULL,
    feedback text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.conversation_ratings OWNER TO omni_user;

--
-- Name: conversation_ratings_id_seq; Type: SEQUENCE; Schema: public; Owner: omni_user
--

CREATE SEQUENCE public.conversation_ratings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conversation_ratings_id_seq OWNER TO omni_user;

--
-- Name: conversation_ratings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: omni_user
--

ALTER SEQUENCE public.conversation_ratings_id_seq OWNED BY public.conversation_ratings.id;


--
-- Name: conversations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.conversations (
    id bigint NOT NULL,
    organization_id bigint,
    contact_id bigint,
    whatsapp_session_id bigint,
    last_message text,
    last_message_at timestamp with time zone DEFAULT now(),
    unread_count integer DEFAULT 0,
    status character varying(20) DEFAULT 'open'::character varying,
    is_chatbot_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    channel character varying(20) DEFAULT 'whatsapp'::character varying,
    messenger_page_id bigint,
    instagram_account_id bigint,
    telegram_bot_id bigint,
    assigned_to_agent_id bigint,
    closed_at timestamp with time zone,
    closed_by bigint,
    rating_score integer,
    rating_feedback text,
    rating_token character varying(100),
    webchat_config_id bigint,
    is_archived boolean DEFAULT false,
    is_pinned boolean DEFAULT false,
    first_response_at timestamp with time zone,
    pipeline_id integer,
    pipeline_stage_id integer,
    stage_changed_at timestamp with time zone,
    value numeric(12,2) DEFAULT 0
);


ALTER TABLE public.conversations OWNER TO omni_user;

--
-- Name: conversations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.conversations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.conversations_id_seq OWNER TO omni_user;

--
-- Name: conversations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.conversations_id_seq OWNED BY public.conversations.id;


--
-- Name: developer_api_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.developer_api_logs (
    id bigint NOT NULL,
    developer_app_id bigint,
    endpoint character varying(100),
    method character varying(10),
    status_code integer,
    payload jsonb,
    response jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.developer_api_logs OWNER TO omni_user;

--
-- Name: developer_api_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.developer_api_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.developer_api_logs_id_seq OWNER TO omni_user;

--
-- Name: developer_api_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.developer_api_logs_id_seq OWNED BY public.developer_api_logs.id;


--
-- Name: developer_app_channels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.developer_app_channels (
    id bigint NOT NULL,
    developer_app_id bigint,
    channel_type character varying(20) NOT NULL,
    session_id character varying(100) NOT NULL,
    label character varying(100),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.developer_app_channels OWNER TO omni_user;

--
-- Name: developer_app_channels_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.developer_app_channels_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.developer_app_channels_id_seq OWNER TO omni_user;

--
-- Name: developer_app_channels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.developer_app_channels_id_seq OWNED BY public.developer_app_channels.id;


--
-- Name: developer_apps; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.developer_apps (
    id bigint NOT NULL,
    organization_id bigint,
    name character varying(100) NOT NULL,
    api_key character varying(64) NOT NULL,
    webhook_url text,
    webhook_secret character varying(64) NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    scopes text[] DEFAULT ARRAY[]::text[],
    api_secret character varying(128)
);


ALTER TABLE public.developer_apps OWNER TO omni_user;

--
-- Name: developer_apps_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.developer_apps_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.developer_apps_id_seq OWNER TO omni_user;

--
-- Name: developer_apps_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.developer_apps_id_seq OWNED BY public.developer_apps.id;


--
-- Name: flow_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.flow_sessions (
    id bigint NOT NULL,
    flow_id bigint,
    contact_id bigint,
    whatsapp_session_id bigint,
    current_node_id character varying(100),
    variables jsonb DEFAULT '{}'::jsonb,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.flow_sessions OWNER TO omni_user;

--
-- Name: flow_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.flow_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.flow_sessions_id_seq OWNER TO omni_user;

--
-- Name: flow_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.flow_sessions_id_seq OWNED BY public.flow_sessions.id;


--
-- Name: followup_instances; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.followup_instances (
    id bigint NOT NULL,
    organization_id bigint,
    contact_id bigint,
    whatsapp_session_id bigint,
    sequence_id bigint,
    current_step_index integer DEFAULT 0,
    next_run_at timestamp with time zone,
    status character varying(20) DEFAULT 'active'::character varying,
    last_check_message_id bigint,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.followup_instances OWNER TO omni_user;

--
-- Name: followup_instances_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.followup_instances_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.followup_instances_id_seq OWNER TO omni_user;

--
-- Name: followup_instances_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.followup_instances_id_seq OWNED BY public.followup_instances.id;


--
-- Name: followup_sequences; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.followup_sequences (
    id bigint NOT NULL,
    organization_id bigint,
    name character varying(100) NOT NULL,
    steps jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.followup_sequences OWNER TO omni_user;

--
-- Name: followup_sequences_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.followup_sequences_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.followup_sequences_id_seq OWNER TO omni_user;

--
-- Name: followup_sequences_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.followup_sequences_id_seq OWNED BY public.followup_sequences.id;


--
-- Name: form_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.form_sessions (
    id bigint NOT NULL,
    form_id bigint,
    contact_id bigint,
    whatsapp_session_id bigint,
    current_step_index integer DEFAULT 0,
    answers jsonb DEFAULT '{}'::jsonb,
    status character varying(20) DEFAULT 'active'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.form_sessions OWNER TO omni_user;

--
-- Name: form_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.form_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.form_sessions_id_seq OWNER TO omni_user;

--
-- Name: form_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.form_sessions_id_seq OWNED BY public.form_sessions.id;


--
-- Name: form_submissions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.form_submissions (
    id bigint NOT NULL,
    form_id bigint,
    contact_id bigint,
    data jsonb NOT NULL,
    generated_pdf_url text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.form_submissions OWNER TO omni_user;

--
-- Name: form_submissions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.form_submissions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.form_submissions_id_seq OWNER TO omni_user;

--
-- Name: form_submissions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.form_submissions_id_seq OWNED BY public.form_submissions.id;


--
-- Name: forms; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.forms (
    id bigint NOT NULL,
    organization_id bigint,
    name character varying(100) NOT NULL,
    trigger_keyword character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    steps jsonb NOT NULL,
    pdf_config jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.forms OWNER TO omni_user;

--
-- Name: forms_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.forms_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.forms_id_seq OWNER TO omni_user;

--
-- Name: forms_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.forms_id_seq OWNED BY public.forms.id;


--
-- Name: instagram_accounts; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.instagram_accounts (
    id bigint NOT NULL,
    organization_id bigint,
    ig_id character varying(100) NOT NULL,
    username character varying(100) NOT NULL,
    profile_picture_url text,
    fb_page_id character varying(100),
    access_token text NOT NULL,
    is_active boolean DEFAULT true,
    ai_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.instagram_accounts OWNER TO omni_user;

--
-- Name: instagram_accounts_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.instagram_accounts_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.instagram_accounts_id_seq OWNER TO omni_user;

--
-- Name: instagram_accounts_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.instagram_accounts_id_seq OWNED BY public.instagram_accounts.id;


--
-- Name: integration_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.integration_settings (
    id bigint NOT NULL,
    organization_id bigint,
    provider character varying(50) NOT NULL,
    credentials jsonb NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.integration_settings OWNER TO omni_user;

--
-- Name: integration_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.integration_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.integration_settings_id_seq OWNER TO omni_user;

--
-- Name: integration_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.integration_settings_id_seq OWNED BY public.integration_settings.id;


--
-- Name: invoice_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_items (
    id bigint NOT NULL,
    invoice_id bigint,
    description character varying(255) NOT NULL,
    quantity integer DEFAULT 1,
    unit_price numeric(12,2) DEFAULT 0,
    amount numeric(12,2) DEFAULT 0
);


ALTER TABLE public.invoice_items OWNER TO omni_user;

--
-- Name: invoice_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoice_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoice_items_id_seq OWNER TO omni_user;

--
-- Name: invoice_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoice_items_id_seq OWNED BY public.invoice_items.id;


--
-- Name: invoice_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoice_settings (
    id bigint NOT NULL,
    organization_id bigint,
    prefix character varying(20) DEFAULT 'INV'::character varying,
    logo_url text,
    footer_note text DEFAULT 'Thank you for your business. Please transfer to BCA 1234567890.'::text,
    tax_percentage integer DEFAULT 0,
    due_days integer DEFAULT 7,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    org_name character varying(100),
    org_address text,
    org_email character varying(100),
    org_phone character varying(20)
);


ALTER TABLE public.invoice_settings OWNER TO omni_user;

--
-- Name: invoice_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoice_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoice_settings_id_seq OWNER TO omni_user;

--
-- Name: invoice_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoice_settings_id_seq OWNED BY public.invoice_settings.id;


--
-- Name: invoices; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.invoices (
    id bigint NOT NULL,
    organization_id bigint,
    contact_id bigint,
    invoice_number character varying(50) NOT NULL,
    status character varying(20) DEFAULT 'draft'::character varying,
    issue_date date DEFAULT CURRENT_DATE,
    due_date date,
    subtotal numeric(12,2) DEFAULT 0,
    tax_amount numeric(12,2) DEFAULT 0,
    discount_amount numeric(12,2) DEFAULT 0,
    total_amount numeric(12,2) DEFAULT 0,
    notes text,
    public_token character varying(100),
    batch_id character varying(100),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.invoices OWNER TO omni_user;

--
-- Name: invoices_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.invoices_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.invoices_id_seq OWNER TO omni_user;

--
-- Name: invoices_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.invoices_id_seq OWNED BY public.invoices.id;


--
-- Name: keyword_replies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.keyword_replies (
    id bigint NOT NULL,
    organization_id bigint,
    parent_id bigint,
    keyword character varying(100) NOT NULL,
    match_type character varying(20) DEFAULT 'exact'::character varying,
    response_content text NOT NULL,
    media_url text,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    hit_count integer DEFAULT 0
);


ALTER TABLE public.keyword_replies OWNER TO omni_user;

--
-- Name: keyword_replies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.keyword_replies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.keyword_replies_id_seq OWNER TO omni_user;

--
-- Name: keyword_replies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.keyword_replies_id_seq OWNED BY public.keyword_replies.id;


--
-- Name: knowledge_base_assets; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knowledge_base_assets (
    id bigint NOT NULL,
    organization_id bigint,
    session_id character varying(100) DEFAULT NULL::character varying,
    file_url text NOT NULL,
    mime_type character varying(50),
    description text,
    embedding public.vector(768),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.knowledge_base_assets OWNER TO omni_user;

--
-- Name: knowledge_base_assets_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.knowledge_base_assets_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.knowledge_base_assets_id_seq OWNER TO omni_user;

--
-- Name: knowledge_base_assets_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knowledge_base_assets_id_seq OWNED BY public.knowledge_base_assets.id;


--
-- Name: knowledge_base_qa; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.knowledge_base_qa (
    id bigint NOT NULL,
    organization_id bigint,
    session_id character varying(100) DEFAULT NULL::character varying,
    question text NOT NULL,
    answer text NOT NULL,
    embedding public.vector(768),
    created_at timestamp with time zone DEFAULT now(),
    source character varying(50) DEFAULT 'manual'::character varying,
    created_by_agent_id bigint
);


ALTER TABLE public.knowledge_base_qa OWNER TO omni_user;

--
-- Name: knowledge_base_qa_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.knowledge_base_qa_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.knowledge_base_qa_id_seq OWNER TO omni_user;

--
-- Name: knowledge_base_qa_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.knowledge_base_qa_id_seq OWNED BY public.knowledge_base_qa.id;


--
-- Name: labels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.labels (
    id bigint NOT NULL,
    organization_id bigint,
    name character varying(50) NOT NULL,
    color character varying(20) DEFAULT '#6366F1'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.labels OWNER TO omni_user;

--
-- Name: labels_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.labels_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.labels_id_seq OWNER TO omni_user;

--
-- Name: labels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.labels_id_seq OWNED BY public.labels.id;


--
-- Name: landing_page_sections; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.landing_page_sections (
    id integer NOT NULL,
    section_key character varying(50) NOT NULL,
    content jsonb NOT NULL,
    is_active boolean DEFAULT true,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.landing_page_sections OWNER TO omni_user;

--
-- Name: landing_page_sections_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.landing_page_sections_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.landing_page_sections_id_seq OWNER TO omni_user;

--
-- Name: landing_page_sections_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.landing_page_sections_id_seq OWNED BY public.landing_page_sections.id;


--
-- Name: link_clicks; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.link_clicks (
    id bigint NOT NULL,
    short_link_id bigint,
    clicked_at timestamp with time zone DEFAULT now(),
    ip_address character varying(45),
    user_agent text
);


ALTER TABLE public.link_clicks OWNER TO omni_user;

--
-- Name: link_clicks_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.link_clicks_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.link_clicks_id_seq OWNER TO omni_user;

--
-- Name: link_clicks_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.link_clicks_id_seq OWNED BY public.link_clicks.id;


--
-- Name: messages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messages (
    id bigint NOT NULL,
    conversation_id bigint,
    organization_id bigint,
    from_me boolean DEFAULT false,
    type character varying(20) DEFAULT 'text'::character varying,
    content text,
    media_url text,
    status character varying(20) DEFAULT 'sent'::character varying,
    wa_message_id character varying(255),
    created_at timestamp with time zone DEFAULT now(),
    sender_id bigint,
    sender_name_snapshot character varying(100)
);


ALTER TABLE public.messages OWNER TO omni_user;

--
-- Name: messages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messages_id_seq OWNER TO omni_user;

--
-- Name: messages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messages_id_seq OWNED BY public.messages.id;


--
-- Name: messenger_pages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.messenger_pages (
    id bigint NOT NULL,
    organization_id bigint,
    page_id character varying(100) NOT NULL,
    page_name character varying(255) NOT NULL,
    picture_url text,
    access_token text NOT NULL,
    is_active boolean DEFAULT true,
    ai_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.messenger_pages OWNER TO omni_user;

--
-- Name: messenger_pages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.messenger_pages_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.messenger_pages_id_seq OWNER TO omni_user;

--
-- Name: messenger_pages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.messenger_pages_id_seq OWNED BY public.messenger_pages.id;


--
-- Name: meta_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.meta_templates (
    id bigint NOT NULL,
    organization_id bigint,
    waba_id character varying(100) NOT NULL,
    name character varying(255) NOT NULL,
    language character varying(10) NOT NULL,
    status character varying(50) NOT NULL,
    category character varying(50),
    components jsonb NOT NULL,
    raw_data jsonb,
    synced_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.meta_templates OWNER TO omni_user;

--
-- Name: meta_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.meta_templates_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.meta_templates_id_seq OWNER TO omni_user;

--
-- Name: meta_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.meta_templates_id_seq OWNED BY public.meta_templates.id;


--
-- Name: migrations; Type: TABLE; Schema: public; Owner: omni_user
--

CREATE TABLE public.migrations (
    id integer NOT NULL,
    name character varying(255) NOT NULL,
    executed_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.migrations OWNER TO omni_user;

--
-- Name: migrations_id_seq; Type: SEQUENCE; Schema: public; Owner: omni_user
--

CREATE SEQUENCE public.migrations_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.migrations_id_seq OWNER TO omni_user;

--
-- Name: migrations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: omni_user
--

ALTER SEQUENCE public.migrations_id_seq OWNED BY public.migrations.id;


--
-- Name: notification_templates; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.notification_templates (
    id integer NOT NULL,
    type character varying(50) NOT NULL,
    label character varying(100) NOT NULL,
    content text NOT NULL,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.notification_templates OWNER TO omni_user;

--
-- Name: notification_templates_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.notification_templates_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.notification_templates_id_seq OWNER TO omni_user;

--
-- Name: notification_templates_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.notification_templates_id_seq OWNED BY public.notification_templates.id;


--
-- Name: number_check_batches; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.number_check_batches (
    id bigint NOT NULL,
    organization_id bigint,
    session_id bigint,
    name character varying(100) NOT NULL,
    status character varying(20) DEFAULT 'pending'::character varying,
    total_numbers integer DEFAULT 0,
    valid_count integer DEFAULT 0,
    invalid_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.number_check_batches OWNER TO omni_user;

--
-- Name: number_check_batches_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.number_check_batches_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.number_check_batches_id_seq OWNER TO omni_user;

--
-- Name: number_check_batches_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.number_check_batches_id_seq OWNED BY public.number_check_batches.id;


--
-- Name: number_check_items; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.number_check_items (
    id bigint NOT NULL,
    batch_id bigint,
    input_number character varying(50),
    formatted_number character varying(50),
    is_registered boolean,
    status character varying(20) DEFAULT 'pending'::character varying,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.number_check_items OWNER TO omni_user;

--
-- Name: number_check_items_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.number_check_items_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.number_check_items_id_seq OWNER TO omni_user;

--
-- Name: number_check_items_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.number_check_items_id_seq OWNED BY public.number_check_items.id;


--
-- Name: ongkir_logs; Type: TABLE; Schema: public; Owner: omni_user
--

CREATE TABLE public.ongkir_logs (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    conversation_id integer,
    origin character varying(255),
    destination character varying(255),
    weight integer,
    courier character varying(50),
    cost integer,
    api_response jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ongkir_logs OWNER TO omni_user;

--
-- Name: ongkir_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: omni_user
--

CREATE SEQUENCE public.ongkir_logs_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ongkir_logs_id_seq OWNER TO omni_user;

--
-- Name: ongkir_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: omni_user
--

ALTER SEQUENCE public.ongkir_logs_id_seq OWNED BY public.ongkir_logs.id;


--
-- Name: ongkir_settings; Type: TABLE; Schema: public; Owner: omni_user
--

CREATE TABLE public.ongkir_settings (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    rajaongkir_api_key text NOT NULL,
    rajaongkir_account_type character varying(20) DEFAULT 'starter'::character varying,
    default_origin_city_id integer,
    default_origin_city_name character varying(255),
    default_origin_province character varying(255),
    enabled_couriers text[],
    is_active boolean DEFAULT false,
    last_verified_at timestamp with time zone,
    api_status character varying(20) DEFAULT 'unverified'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.ongkir_settings OWNER TO omni_user;

--
-- Name: ongkir_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: omni_user
--

CREATE SEQUENCE public.ongkir_settings_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.ongkir_settings_id_seq OWNER TO omni_user;

--
-- Name: ongkir_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: omni_user
--

ALTER SEQUENCE public.ongkir_settings_id_seq OWNED BY public.ongkir_settings.id;


--
-- Name: organizations; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.organizations (
    id bigint NOT NULL,
    name character varying(100) NOT NULL,
    plan_id integer,
    subscription_status character varying(20) DEFAULT 'trial'::character varying,
    webhook_url text,
    is_active boolean DEFAULT true,
    gemini_api_key text,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    has_used_trial boolean DEFAULT false,
    logo_url text
);


ALTER TABLE public.organizations OWNER TO omni_user;

--
-- Name: organizations_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.organizations_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.organizations_id_seq OWNER TO omni_user;

--
-- Name: organizations_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.organizations_id_seq OWNED BY public.organizations.id;


--
-- Name: payment_channels; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.payment_channels (
    id integer NOT NULL,
    type character varying(20) NOT NULL,
    provider_name character varying(255) NOT NULL,
    account_number character varying(100),
    account_holder character varying(100),
    instructions text,
    is_active boolean DEFAULT true,
    deleted_at timestamp with time zone
);


ALTER TABLE public.payment_channels OWNER TO omni_user;

--
-- Name: payment_channels_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.payment_channels_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.payment_channels_id_seq OWNER TO omni_user;

--
-- Name: payment_channels_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.payment_channels_id_seq OWNED BY public.payment_channels.id;


--
-- Name: pipeline_stage_history; Type: TABLE; Schema: public; Owner: omni_user
--

CREATE TABLE public.pipeline_stage_history (
    id integer NOT NULL,
    conversation_id integer NOT NULL,
    pipeline_id integer NOT NULL,
    from_stage_id integer,
    to_stage_id integer NOT NULL,
    changed_by integer,
    duration_seconds integer,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.pipeline_stage_history OWNER TO omni_user;

--
-- Name: pipeline_stage_history_id_seq; Type: SEQUENCE; Schema: public; Owner: omni_user
--

CREATE SEQUENCE public.pipeline_stage_history_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pipeline_stage_history_id_seq OWNER TO omni_user;

--
-- Name: pipeline_stage_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: omni_user
--

ALTER SEQUENCE public.pipeline_stage_history_id_seq OWNED BY public.pipeline_stage_history.id;


--
-- Name: pipeline_stages; Type: TABLE; Schema: public; Owner: omni_user
--

CREATE TABLE public.pipeline_stages (
    id integer NOT NULL,
    pipeline_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    color character varying(20),
    "position" integer NOT NULL,
    is_closed_stage boolean DEFAULT false,
    automation_actions jsonb DEFAULT '{}'::jsonb,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.pipeline_stages OWNER TO omni_user;

--
-- Name: pipeline_stages_id_seq; Type: SEQUENCE; Schema: public; Owner: omni_user
--

CREATE SEQUENCE public.pipeline_stages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pipeline_stages_id_seq OWNER TO omni_user;

--
-- Name: pipeline_stages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: omni_user
--

ALTER SEQUENCE public.pipeline_stages_id_seq OWNED BY public.pipeline_stages.id;


--
-- Name: pipelines; Type: TABLE; Schema: public; Owner: omni_user
--

CREATE TABLE public.pipelines (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    icon character varying(50),
    color character varying(20),
    is_default boolean DEFAULT false,
    is_active boolean DEFAULT true,
    created_by integer,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.pipelines OWNER TO omni_user;

--
-- Name: pipelines_id_seq; Type: SEQUENCE; Schema: public; Owner: omni_user
--

CREATE SEQUENCE public.pipelines_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.pipelines_id_seq OWNER TO omni_user;

--
-- Name: pipelines_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: omni_user
--

ALTER SEQUENCE public.pipelines_id_seq OWNED BY public.pipelines.id;


--
-- Name: plan_features; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plan_features (
    id integer NOT NULL,
    plan_id integer,
    feature_code character varying(50) NOT NULL,
    is_enabled boolean DEFAULT true,
    limit_value integer,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.plan_features OWNER TO omni_user;

--
-- Name: plan_features_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.plan_features_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.plan_features_id_seq OWNER TO omni_user;

--
-- Name: plan_features_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.plan_features_id_seq OWNED BY public.plan_features.id;


--
-- Name: plans; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.plans (
    id integer NOT NULL,
    name character varying(100) NOT NULL,
    description text,
    price_monthly numeric(12,2) DEFAULT 0,
    price_monthly_promo numeric(12,2) DEFAULT NULL::numeric,
    price_yearly numeric(12,2) DEFAULT 0,
    price_yearly_promo numeric(12,2) DEFAULT NULL::numeric,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    trial_days integer DEFAULT 0,
    is_trial_allowed boolean DEFAULT false
);


ALTER TABLE public.plans OWNER TO omni_user;

--
-- Name: plans_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.plans_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.plans_id_seq OWNER TO omni_user;

--
-- Name: plans_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.plans_id_seq OWNED BY public.plans.id;


--
-- Name: promo_codes; Type: TABLE; Schema: public; Owner: omni_user
--

CREATE TABLE public.promo_codes (
    id integer NOT NULL,
    code character varying(50) NOT NULL,
    type character varying(20) NOT NULL,
    value numeric(15,2) NOT NULL,
    max_uses integer,
    used_count integer DEFAULT 0,
    expires_at timestamp with time zone,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    CONSTRAINT promo_codes_type_check CHECK (((type)::text = ANY ((ARRAY['percent'::character varying, 'fixed'::character varying])::text[])))
);


ALTER TABLE public.promo_codes OWNER TO omni_user;

--
-- Name: promo_codes_id_seq; Type: SEQUENCE; Schema: public; Owner: omni_user
--

CREATE SEQUENCE public.promo_codes_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.promo_codes_id_seq OWNER TO omni_user;

--
-- Name: promo_codes_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: omni_user
--

ALTER SEQUENCE public.promo_codes_id_seq OWNED BY public.promo_codes.id;


--
-- Name: public_pages; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.public_pages (
    id integer NOT NULL,
    slug character varying(100) NOT NULL,
    title character varying(200) NOT NULL,
    content text,
    meta_description character varying(255),
    is_published boolean DEFAULT false,
    page_type character varying(20) DEFAULT 'static'::character varying,
    target_menu character varying(50),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.public_pages OWNER TO omni_user;

--
-- Name: public_pages_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.public_pages_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.public_pages_id_seq OWNER TO omni_user;

--
-- Name: public_pages_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.public_pages_id_seq OWNED BY public.public_pages.id;


--
-- Name: queues; Type: TABLE; Schema: public; Owner: omni_user
--

CREATE TABLE public.queues (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    contact_id integer NOT NULL,
    division character varying(255) NOT NULL,
    queue_number integer NOT NULL,
    status character varying(50) DEFAULT 'waiting'::character varying,
    created_at timestamp without time zone DEFAULT now(),
    assigned_at timestamp without time zone,
    completed_at timestamp without time zone
);


ALTER TABLE public.queues OWNER TO omni_user;

--
-- Name: queues_id_seq; Type: SEQUENCE; Schema: public; Owner: omni_user
--

CREATE SEQUENCE public.queues_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.queues_id_seq OWNER TO omni_user;

--
-- Name: queues_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: omni_user
--

ALTER SEQUENCE public.queues_id_seq OWNED BY public.queues.id;


--
-- Name: quick_replies; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.quick_replies (
    id bigint NOT NULL,
    organization_id bigint,
    shortcut character varying(50) NOT NULL,
    content text NOT NULL,
    media_url text,
    created_at timestamp with time zone DEFAULT now(),
    type character varying(20) DEFAULT 'quick_reply'::character varying,
    user_id bigint
);


ALTER TABLE public.quick_replies OWNER TO omni_user;

--
-- Name: quick_replies_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.quick_replies_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.quick_replies_id_seq OWNER TO omni_user;

--
-- Name: quick_replies_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.quick_replies_id_seq OWNED BY public.quick_replies.id;


--
-- Name: rotator_group_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rotator_group_sessions (
    id bigint NOT NULL,
    rotator_group_id bigint,
    whatsapp_session_id bigint,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.rotator_group_sessions OWNER TO omni_user;

--
-- Name: rotator_group_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rotator_group_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rotator_group_sessions_id_seq OWNER TO omni_user;

--
-- Name: rotator_group_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rotator_group_sessions_id_seq OWNED BY public.rotator_group_sessions.id;


--
-- Name: rotator_groups; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.rotator_groups (
    id bigint NOT NULL,
    organization_id bigint,
    name character varying(100) NOT NULL,
    description text,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.rotator_groups OWNER TO omni_user;

--
-- Name: rotator_groups_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.rotator_groups_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.rotator_groups_id_seq OWNER TO omni_user;

--
-- Name: rotator_groups_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.rotator_groups_id_seq OWNED BY public.rotator_groups.id;


--
-- Name: scraper_history; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.scraper_history (
    id bigint NOT NULL,
    organization_id bigint,
    keyword character varying(255) NOT NULL,
    location character varying(255) NOT NULL,
    provider_used character varying(50),
    total_results integer DEFAULT 0,
    results_data jsonb,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.scraper_history OWNER TO omni_user;

--
-- Name: scraper_history_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.scraper_history_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.scraper_history_id_seq OWNER TO omni_user;

--
-- Name: scraper_history_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.scraper_history_id_seq OWNED BY public.scraper_history.id;


--
-- Name: short_links; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.short_links (
    id bigint NOT NULL,
    organization_id bigint,
    broadcast_id bigint,
    contact_id bigint,
    original_url text NOT NULL,
    slug character varying(20) NOT NULL,
    type character varying(20) DEFAULT 'tracking'::character varying,
    clicks_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.short_links OWNER TO omni_user;

--
-- Name: short_links_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.short_links_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.short_links_id_seq OWNER TO omni_user;

--
-- Name: short_links_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.short_links_id_seq OWNED BY public.short_links.id;


--
-- Name: subscription_addons; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscription_addons (
    id bigint NOT NULL,
    subscription_id bigint,
    addon_id integer,
    quantity integer DEFAULT 1,
    price_at_purchase numeric(12,2),
    status character varying(20) DEFAULT 'active'::character varying,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.subscription_addons OWNER TO omni_user;

--
-- Name: subscription_addons_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscription_addons_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscription_addons_id_seq OWNER TO omni_user;

--
-- Name: subscription_addons_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscription_addons_id_seq OWNED BY public.subscription_addons.id;


--
-- Name: subscriptions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.subscriptions (
    id bigint NOT NULL,
    organization_id bigint,
    plan_id integer,
    status character varying(20) DEFAULT 'active'::character varying,
    expires_at timestamp with time zone,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    is_trial boolean DEFAULT false,
    trial_ends_at timestamp with time zone
);


ALTER TABLE public.subscriptions OWNER TO omni_user;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.subscriptions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.subscriptions_id_seq OWNER TO omni_user;

--
-- Name: subscriptions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.subscriptions_id_seq OWNED BY public.subscriptions.id;


--
-- Name: system_feature_flags; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_feature_flags (
    key character varying(50) NOT NULL,
    name character varying(100) NOT NULL,
    category character varying(50) NOT NULL,
    is_active boolean DEFAULT true,
    maintenance_message text,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.system_feature_flags OWNER TO omni_user;

--
-- Name: system_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.system_settings (
    key character varying(50) NOT NULL,
    value text,
    type character varying(20) DEFAULT 'text'::character varying,
    group_name character varying(50) DEFAULT 'general'::character varying,
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.system_settings OWNER TO omni_user;

--
-- Name: telegram_bots; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.telegram_bots (
    id bigint NOT NULL,
    organization_id bigint,
    bot_token text NOT NULL,
    bot_id bigint NOT NULL,
    username character varying(100),
    first_name character varying(255),
    photo_url text,
    is_active boolean DEFAULT true,
    ai_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.telegram_bots OWNER TO omni_user;

--
-- Name: telegram_bots_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.telegram_bots_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.telegram_bots_id_seq OWNER TO omni_user;

--
-- Name: telegram_bots_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.telegram_bots_id_seq OWNED BY public.telegram_bots.id;


--
-- Name: tiktok_shops; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.tiktok_shops (
    id bigint NOT NULL,
    organization_id bigint,
    shop_id character varying(100) NOT NULL,
    shop_name character varying(255) NOT NULL,
    access_token text NOT NULL,
    refresh_token text,
    is_active boolean DEFAULT true,
    ai_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.tiktok_shops OWNER TO omni_user;

--
-- Name: tiktok_shops_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.tiktok_shops_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.tiktok_shops_id_seq OWNER TO omni_user;

--
-- Name: tiktok_shops_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.tiktok_shops_id_seq OWNED BY public.tiktok_shops.id;


--
-- Name: transactions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.transactions (
    id bigint NOT NULL,
    organization_id bigint,
    invoice_number character varying(50) NOT NULL,
    plan_id integer,
    addon_id integer,
    payment_channel_id integer,
    amount numeric(12,2) NOT NULL,
    subtotal numeric(12,2) DEFAULT 0,
    tax numeric(12,2) DEFAULT 0,
    admin_fee numeric(12,2) DEFAULT 0,
    unique_code integer DEFAULT 0,
    status character varying(20) DEFAULT 'pending'::character varying,
    payment_method character varying(255),
    payment_proof_url text,
    checkout_url text,
    payment_code character varying(50),
    expired_at timestamp with time zone,
    approved_at timestamp with time zone,
    approved_by bigint,
    admin_note text,
    cycle character varying(20) DEFAULT 'monthly'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.transactions OWNER TO omni_user;

--
-- Name: transactions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.transactions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.transactions_id_seq OWNER TO omni_user;

--
-- Name: transactions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.transactions_id_seq OWNED BY public.transactions.id;


--
-- Name: unsubscribe_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.unsubscribe_logs (
    id bigint NOT NULL,
    organization_id bigint,
    contact_id bigint,
    method character varying(20) NOT NULL,
    details text,
    unsubscribed_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.unsubscribe_logs OWNER TO omni_user;

--
-- Name: unsubscribe_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.unsubscribe_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.unsubscribe_logs_id_seq OWNER TO omni_user;

--
-- Name: unsubscribe_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.unsubscribe_logs_id_seq OWNED BY public.unsubscribe_logs.id;


--
-- Name: upselling_campaigns; Type: TABLE; Schema: public; Owner: omni_user
--

CREATE TABLE public.upselling_campaigns (
    id integer NOT NULL,
    organization_id integer NOT NULL,
    name text NOT NULL,
    frequency character varying(50) NOT NULL,
    "time" time without time zone NOT NULL,
    day_of_month integer,
    month_of_year integer,
    start_date timestamp without time zone NOT NULL,
    end_date timestamp without time zone,
    device_id integer,
    rotator_group_id integer,
    target_type character varying(50),
    target_value text,
    message_template text,
    delay_seconds integer DEFAULT 60,
    status character varying(50) DEFAULT 'active'::character varying,
    last_run_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT now(),
    updated_at timestamp without time zone DEFAULT now()
);


ALTER TABLE public.upselling_campaigns OWNER TO omni_user;

--
-- Name: upselling_campaigns_id_seq; Type: SEQUENCE; Schema: public; Owner: omni_user
--

CREATE SEQUENCE public.upselling_campaigns_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.upselling_campaigns_id_seq OWNER TO omni_user;

--
-- Name: upselling_campaigns_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: omni_user
--

ALTER SEQUENCE public.upselling_campaigns_id_seq OWNED BY public.upselling_campaigns.id;


--
-- Name: user_fcm_tokens; Type: TABLE; Schema: public; Owner: omni_user
--

CREATE TABLE public.user_fcm_tokens (
    id integer NOT NULL,
    user_id bigint,
    fcm_token text NOT NULL,
    device_id text,
    platform character varying(20),
    updated_at timestamp with time zone DEFAULT now(),
    last_used_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.user_fcm_tokens OWNER TO omni_user;

--
-- Name: user_fcm_tokens_id_seq; Type: SEQUENCE; Schema: public; Owner: omni_user
--

CREATE SEQUENCE public.user_fcm_tokens_id_seq
    AS integer
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.user_fcm_tokens_id_seq OWNER TO omni_user;

--
-- Name: user_fcm_tokens_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: omni_user
--

ALTER SEQUENCE public.user_fcm_tokens_id_seq OWNED BY public.user_fcm_tokens.id;


--
-- Name: users; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.users (
    id bigint NOT NULL,
    organization_id bigint,
    name character varying(100) NOT NULL,
    email character varying(100) NOT NULL,
    password_hash text,
    role character varying(20) NOT NULL,
    phone character varying(20),
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    permissions jsonb DEFAULT '[]'::jsonb,
    role_level integer DEFAULT 1,
    assigned_devices jsonb DEFAULT '[]'::jsonb,
    closing_message text DEFAULT 'Terima kasih telah menghubungi kami. Semoga harimu menyenangkan!'::text,
    google_id character varying(255),
    facebook_id character varying(255),
    reset_password_token character varying(255),
    reset_password_expires timestamp with time zone,
    division character varying(50),
    referral_code character varying(20),
    referrer_id integer,
    affiliate_clicks integer DEFAULT 0,
    is_online boolean DEFAULT false,
    profile_pic_url text
);


ALTER TABLE public.users OWNER TO omni_user;

--
-- Name: users_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.users_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.users_id_seq OWNER TO omni_user;

--
-- Name: users_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.users_id_seq OWNED BY public.users.id;


--
-- Name: warmer_circle_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warmer_circle_sessions (
    id bigint NOT NULL,
    warmer_circle_id bigint,
    session_id bigint,
    messages_sent_today integer DEFAULT 0,
    last_active_at timestamp with time zone,
    last_reset_at timestamp with time zone DEFAULT now(),
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.warmer_circle_sessions OWNER TO omni_user;

--
-- Name: warmer_circle_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.warmer_circle_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.warmer_circle_sessions_id_seq OWNER TO omni_user;

--
-- Name: warmer_circle_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.warmer_circle_sessions_id_seq OWNED BY public.warmer_circle_sessions.id;


--
-- Name: warmer_circles; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warmer_circles (
    id bigint NOT NULL,
    organization_id bigint,
    name character varying(100) NOT NULL,
    interval_min integer DEFAULT 60,
    interval_max integer DEFAULT 300,
    daily_limit_per_device integer DEFAULT 50,
    dictionary_mode character varying(20) DEFAULT 'system'::character varying,
    custom_dictionary jsonb DEFAULT '[]'::jsonb,
    is_active boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.warmer_circles OWNER TO omni_user;

--
-- Name: warmer_circles_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.warmer_circles_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.warmer_circles_id_seq OWNER TO omni_user;

--
-- Name: warmer_circles_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.warmer_circles_id_seq OWNED BY public.warmer_circles.id;


--
-- Name: warmer_logs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warmer_logs (
    id bigint NOT NULL,
    warmer_setting_id bigint,
    sender_session_id bigint,
    message_content text,
    sent_at timestamp with time zone DEFAULT now(),
    warmer_circle_id bigint
);


ALTER TABLE public.warmer_logs OWNER TO omni_user;

--
-- Name: warmer_logs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.warmer_logs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.warmer_logs_id_seq OWNER TO omni_user;

--
-- Name: warmer_logs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.warmer_logs_id_seq OWNED BY public.warmer_logs.id;


--
-- Name: warmer_settings; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.warmer_settings (
    id bigint NOT NULL,
    organization_id bigint,
    session_id_1 bigint,
    session_id_2 bigint,
    interval_min integer DEFAULT 60,
    interval_max integer DEFAULT 300,
    daily_limit integer DEFAULT 50,
    is_active boolean DEFAULT false,
    created_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.warmer_settings OWNER TO omni_user;

--
-- Name: warmer_settings_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.warmer_settings_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.warmer_settings_id_seq OWNER TO omni_user;

--
-- Name: warmer_settings_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.warmer_settings_id_seq OWNED BY public.warmer_settings.id;


--
-- Name: webchat_configs; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.webchat_configs (
    id bigint NOT NULL,
    organization_id bigint,
    name character varying(100) DEFAULT 'Web Widget'::character varying NOT NULL,
    widget_uid uuid DEFAULT public.uuid_generate_v4(),
    primary_color character varying(20) DEFAULT '#6366F1'::character varying,
    logo_url text,
    "position" character varying(20) DEFAULT 'bottom-right'::character varying,
    launcher_icon character varying(50) DEFAULT 'message-circle'::character varying,
    launcher_logo_url text,
    launcher_width integer DEFAULT 60,
    launcher_height integer DEFAULT 60,
    welcome_message text DEFAULT 'Halo! Ada yang bisa kami bantu?'::text,
    offline_message text DEFAULT 'Kami sedang offline, silakan tinggalkan pesan.'::text,
    require_email boolean DEFAULT false,
    require_name boolean DEFAULT true,
    require_phone boolean DEFAULT false,
    show_agent_face boolean DEFAULT true,
    is_active boolean DEFAULT true,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);


ALTER TABLE public.webchat_configs OWNER TO omni_user;

--
-- Name: webchat_configs_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.webchat_configs_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.webchat_configs_id_seq OWNER TO omni_user;

--
-- Name: webchat_configs_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.webchat_configs_id_seq OWNED BY public.webchat_configs.id;


--
-- Name: whatsapp_sessions; Type: TABLE; Schema: public; Owner: postgres
--

CREATE TABLE public.whatsapp_sessions (
    id bigint NOT NULL,
    organization_id bigint,
    session_id character varying(100) NOT NULL,
    name character varying(100),
    whatsapp_number character varying(20),
    status character varying(20) DEFAULT 'created'::character varying,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now(),
    connected_at timestamp with time zone,
    device_info jsonb DEFAULT '{}'::jsonb,
    type character varying(20) DEFAULT 'unofficial'::character varying,
    waba_id character varying(100),
    phone_number_id character varying(100),
    access_token text,
    quality_rating character varying(20),
    messaging_limit character varying(50),
    daily_sent_count integer DEFAULT 0,
    health_score integer DEFAULT 100,
    last_sent_at timestamp with time zone,
    consecutive_errors integer DEFAULT 0
);


ALTER TABLE public.whatsapp_sessions OWNER TO omni_user;

--
-- Name: whatsapp_sessions_id_seq; Type: SEQUENCE; Schema: public; Owner: postgres
--

CREATE SEQUENCE public.whatsapp_sessions_id_seq
    START WITH 1
    INCREMENT BY 1
    NO MINVALUE
    NO MAXVALUE
    CACHE 1;


ALTER SEQUENCE public.whatsapp_sessions_id_seq OWNER TO omni_user;

--
-- Name: whatsapp_sessions_id_seq; Type: SEQUENCE OWNED BY; Schema: public; Owner: postgres
--

ALTER SEQUENCE public.whatsapp_sessions_id_seq OWNED BY public.whatsapp_sessions.id;


--
-- Name: activity_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs ALTER COLUMN id SET DEFAULT nextval('public.activity_logs_id_seq'::regclass);


--
-- Name: addons id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addons ALTER COLUMN id SET DEFAULT nextval('public.addons_id_seq'::regclass);


--
-- Name: affiliate_commissions id; Type: DEFAULT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.affiliate_commissions ALTER COLUMN id SET DEFAULT nextval('public.affiliate_commissions_id_seq'::regclass);


--
-- Name: affiliate_payouts id; Type: DEFAULT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.affiliate_payouts ALTER COLUMN id SET DEFAULT nextval('public.affiliate_payouts_id_seq'::regclass);


--
-- Name: announcements id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements ALTER COLUMN id SET DEFAULT nextval('public.announcements_id_seq'::regclass);


--
-- Name: broadcast_recipients id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_recipients ALTER COLUMN id SET DEFAULT nextval('public.broadcast_recipients_id_seq'::regclass);


--
-- Name: broadcasts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcasts ALTER COLUMN id SET DEFAULT nextval('public.broadcasts_id_seq'::regclass);


--
-- Name: chat_flows id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_flows ALTER COLUMN id SET DEFAULT nextval('public.chat_flows_id_seq'::regclass);


--
-- Name: chatbot_logs id; Type: DEFAULT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.chatbot_logs ALTER COLUMN id SET DEFAULT nextval('public.chatbot_logs_id_seq'::regclass);


--
-- Name: chatbot_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chatbot_settings ALTER COLUMN id SET DEFAULT nextval('public.chatbot_settings_id_seq'::regclass);


--
-- Name: contacts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts ALTER COLUMN id SET DEFAULT nextval('public.contacts_id_seq'::regclass);


--
-- Name: conversation_ratings id; Type: DEFAULT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.conversation_ratings ALTER COLUMN id SET DEFAULT nextval('public.conversation_ratings_id_seq'::regclass);


--
-- Name: conversations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations ALTER COLUMN id SET DEFAULT nextval('public.conversations_id_seq'::regclass);


--
-- Name: developer_api_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_api_logs ALTER COLUMN id SET DEFAULT nextval('public.developer_api_logs_id_seq'::regclass);


--
-- Name: developer_app_channels id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_app_channels ALTER COLUMN id SET DEFAULT nextval('public.developer_app_channels_id_seq'::regclass);


--
-- Name: developer_apps id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_apps ALTER COLUMN id SET DEFAULT nextval('public.developer_apps_id_seq'::regclass);


--
-- Name: flow_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flow_sessions ALTER COLUMN id SET DEFAULT nextval('public.flow_sessions_id_seq'::regclass);


--
-- Name: followup_instances id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.followup_instances ALTER COLUMN id SET DEFAULT nextval('public.followup_instances_id_seq'::regclass);


--
-- Name: followup_sequences id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.followup_sequences ALTER COLUMN id SET DEFAULT nextval('public.followup_sequences_id_seq'::regclass);


--
-- Name: form_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_sessions ALTER COLUMN id SET DEFAULT nextval('public.form_sessions_id_seq'::regclass);


--
-- Name: form_submissions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_submissions ALTER COLUMN id SET DEFAULT nextval('public.form_submissions_id_seq'::regclass);


--
-- Name: forms id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forms ALTER COLUMN id SET DEFAULT nextval('public.forms_id_seq'::regclass);


--
-- Name: instagram_accounts id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instagram_accounts ALTER COLUMN id SET DEFAULT nextval('public.instagram_accounts_id_seq'::regclass);


--
-- Name: integration_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_settings ALTER COLUMN id SET DEFAULT nextval('public.integration_settings_id_seq'::regclass);


--
-- Name: invoice_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items ALTER COLUMN id SET DEFAULT nextval('public.invoice_items_id_seq'::regclass);


--
-- Name: invoice_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_settings ALTER COLUMN id SET DEFAULT nextval('public.invoice_settings_id_seq'::regclass);


--
-- Name: invoices id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices ALTER COLUMN id SET DEFAULT nextval('public.invoices_id_seq'::regclass);


--
-- Name: keyword_replies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.keyword_replies ALTER COLUMN id SET DEFAULT nextval('public.keyword_replies_id_seq'::regclass);


--
-- Name: knowledge_base_assets id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_base_assets ALTER COLUMN id SET DEFAULT nextval('public.knowledge_base_assets_id_seq'::regclass);


--
-- Name: knowledge_base_qa id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_base_qa ALTER COLUMN id SET DEFAULT nextval('public.knowledge_base_qa_id_seq'::regclass);


--
-- Name: labels id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.labels ALTER COLUMN id SET DEFAULT nextval('public.labels_id_seq'::regclass);


--
-- Name: landing_page_sections id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.landing_page_sections ALTER COLUMN id SET DEFAULT nextval('public.landing_page_sections_id_seq'::regclass);


--
-- Name: link_clicks id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.link_clicks ALTER COLUMN id SET DEFAULT nextval('public.link_clicks_id_seq'::regclass);


--
-- Name: messages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages ALTER COLUMN id SET DEFAULT nextval('public.messages_id_seq'::regclass);


--
-- Name: messenger_pages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messenger_pages ALTER COLUMN id SET DEFAULT nextval('public.messenger_pages_id_seq'::regclass);


--
-- Name: meta_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meta_templates ALTER COLUMN id SET DEFAULT nextval('public.meta_templates_id_seq'::regclass);


--
-- Name: migrations id; Type: DEFAULT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.migrations ALTER COLUMN id SET DEFAULT nextval('public.migrations_id_seq'::regclass);


--
-- Name: notification_templates id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_templates ALTER COLUMN id SET DEFAULT nextval('public.notification_templates_id_seq'::regclass);


--
-- Name: number_check_batches id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.number_check_batches ALTER COLUMN id SET DEFAULT nextval('public.number_check_batches_id_seq'::regclass);


--
-- Name: number_check_items id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.number_check_items ALTER COLUMN id SET DEFAULT nextval('public.number_check_items_id_seq'::regclass);


--
-- Name: ongkir_logs id; Type: DEFAULT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.ongkir_logs ALTER COLUMN id SET DEFAULT nextval('public.ongkir_logs_id_seq'::regclass);


--
-- Name: ongkir_settings id; Type: DEFAULT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.ongkir_settings ALTER COLUMN id SET DEFAULT nextval('public.ongkir_settings_id_seq'::regclass);


--
-- Name: organizations id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations ALTER COLUMN id SET DEFAULT nextval('public.organizations_id_seq'::regclass);


--
-- Name: payment_channels id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_channels ALTER COLUMN id SET DEFAULT nextval('public.payment_channels_id_seq'::regclass);


--
-- Name: pipeline_stage_history id; Type: DEFAULT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.pipeline_stage_history ALTER COLUMN id SET DEFAULT nextval('public.pipeline_stage_history_id_seq'::regclass);


--
-- Name: pipeline_stages id; Type: DEFAULT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.pipeline_stages ALTER COLUMN id SET DEFAULT nextval('public.pipeline_stages_id_seq'::regclass);


--
-- Name: pipelines id; Type: DEFAULT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.pipelines ALTER COLUMN id SET DEFAULT nextval('public.pipelines_id_seq'::regclass);


--
-- Name: plan_features id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_features ALTER COLUMN id SET DEFAULT nextval('public.plan_features_id_seq'::regclass);


--
-- Name: plans id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans ALTER COLUMN id SET DEFAULT nextval('public.plans_id_seq'::regclass);


--
-- Name: promo_codes id; Type: DEFAULT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.promo_codes ALTER COLUMN id SET DEFAULT nextval('public.promo_codes_id_seq'::regclass);


--
-- Name: public_pages id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.public_pages ALTER COLUMN id SET DEFAULT nextval('public.public_pages_id_seq'::regclass);


--
-- Name: queues id; Type: DEFAULT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.queues ALTER COLUMN id SET DEFAULT nextval('public.queues_id_seq'::regclass);


--
-- Name: quick_replies id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quick_replies ALTER COLUMN id SET DEFAULT nextval('public.quick_replies_id_seq'::regclass);


--
-- Name: rotator_group_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rotator_group_sessions ALTER COLUMN id SET DEFAULT nextval('public.rotator_group_sessions_id_seq'::regclass);


--
-- Name: rotator_groups id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rotator_groups ALTER COLUMN id SET DEFAULT nextval('public.rotator_groups_id_seq'::regclass);


--
-- Name: scraper_history id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scraper_history ALTER COLUMN id SET DEFAULT nextval('public.scraper_history_id_seq'::regclass);


--
-- Name: short_links id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.short_links ALTER COLUMN id SET DEFAULT nextval('public.short_links_id_seq'::regclass);


--
-- Name: subscription_addons id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_addons ALTER COLUMN id SET DEFAULT nextval('public.subscription_addons_id_seq'::regclass);


--
-- Name: subscriptions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions ALTER COLUMN id SET DEFAULT nextval('public.subscriptions_id_seq'::regclass);


--
-- Name: telegram_bots id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_bots ALTER COLUMN id SET DEFAULT nextval('public.telegram_bots_id_seq'::regclass);


--
-- Name: tiktok_shops id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiktok_shops ALTER COLUMN id SET DEFAULT nextval('public.tiktok_shops_id_seq'::regclass);


--
-- Name: transactions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions ALTER COLUMN id SET DEFAULT nextval('public.transactions_id_seq'::regclass);


--
-- Name: unsubscribe_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unsubscribe_logs ALTER COLUMN id SET DEFAULT nextval('public.unsubscribe_logs_id_seq'::regclass);


--
-- Name: upselling_campaigns id; Type: DEFAULT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.upselling_campaigns ALTER COLUMN id SET DEFAULT nextval('public.upselling_campaigns_id_seq'::regclass);


--
-- Name: user_fcm_tokens id; Type: DEFAULT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.user_fcm_tokens ALTER COLUMN id SET DEFAULT nextval('public.user_fcm_tokens_id_seq'::regclass);


--
-- Name: users id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users ALTER COLUMN id SET DEFAULT nextval('public.users_id_seq'::regclass);


--
-- Name: warmer_circle_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warmer_circle_sessions ALTER COLUMN id SET DEFAULT nextval('public.warmer_circle_sessions_id_seq'::regclass);


--
-- Name: warmer_circles id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warmer_circles ALTER COLUMN id SET DEFAULT nextval('public.warmer_circles_id_seq'::regclass);


--
-- Name: warmer_logs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warmer_logs ALTER COLUMN id SET DEFAULT nextval('public.warmer_logs_id_seq'::regclass);


--
-- Name: warmer_settings id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warmer_settings ALTER COLUMN id SET DEFAULT nextval('public.warmer_settings_id_seq'::regclass);


--
-- Name: webchat_configs id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webchat_configs ALTER COLUMN id SET DEFAULT nextval('public.webchat_configs_id_seq'::regclass);


--
-- Name: whatsapp_sessions id; Type: DEFAULT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_sessions ALTER COLUMN id SET DEFAULT nextval('public.whatsapp_sessions_id_seq'::regclass);


--
-- Name: activity_logs activity_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_pkey PRIMARY KEY (id);


--
-- Name: addons addons_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addons
    ADD CONSTRAINT addons_code_key UNIQUE (code);


--
-- Name: addons addons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.addons
    ADD CONSTRAINT addons_pkey PRIMARY KEY (id);


--
-- Name: affiliate_commissions affiliate_commissions_pkey; Type: CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.affiliate_commissions
    ADD CONSTRAINT affiliate_commissions_pkey PRIMARY KEY (id);


--
-- Name: affiliate_payouts affiliate_payouts_pkey; Type: CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.affiliate_payouts
    ADD CONSTRAINT affiliate_payouts_pkey PRIMARY KEY (id);


--
-- Name: announcements announcements_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.announcements
    ADD CONSTRAINT announcements_pkey PRIMARY KEY (id);


--
-- Name: broadcast_recipients broadcast_recipients_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_recipients
    ADD CONSTRAINT broadcast_recipients_pkey PRIMARY KEY (id);


--
-- Name: broadcasts broadcasts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_pkey PRIMARY KEY (id);


--
-- Name: chat_flows chat_flows_organization_id_trigger_keyword_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_flows
    ADD CONSTRAINT chat_flows_organization_id_trigger_keyword_key UNIQUE (organization_id, trigger_keyword);


--
-- Name: chat_flows chat_flows_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_flows
    ADD CONSTRAINT chat_flows_pkey PRIMARY KEY (id);


--
-- Name: chatbot_logs chatbot_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.chatbot_logs
    ADD CONSTRAINT chatbot_logs_pkey PRIMARY KEY (id);


--
-- Name: chatbot_settings chatbot_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chatbot_settings
    ADD CONSTRAINT chatbot_settings_pkey PRIMARY KEY (id);


--
-- Name: chatbot_settings chatbot_settings_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chatbot_settings
    ADD CONSTRAINT chatbot_settings_session_id_key UNIQUE (session_id);


--
-- Name: contact_labels contact_labels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_labels
    ADD CONSTRAINT contact_labels_pkey PRIMARY KEY (contact_id, label_id);


--
-- Name: contacts contacts_organization_id_phone_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_organization_id_phone_number_key UNIQUE (organization_id, phone_number);


--
-- Name: contacts contacts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_pkey PRIMARY KEY (id);


--
-- Name: conversation_ratings conversation_ratings_conversation_id_rating_token_key; Type: CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.conversation_ratings
    ADD CONSTRAINT conversation_ratings_conversation_id_rating_token_key UNIQUE (conversation_id, rating_token);


--
-- Name: conversation_ratings conversation_ratings_pkey; Type: CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.conversation_ratings
    ADD CONSTRAINT conversation_ratings_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pkey PRIMARY KEY (id);


--
-- Name: conversations conversations_rating_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_rating_token_key UNIQUE (rating_token);


--
-- Name: developer_api_logs developer_api_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_api_logs
    ADD CONSTRAINT developer_api_logs_pkey PRIMARY KEY (id);


--
-- Name: developer_app_channels developer_app_channels_developer_app_id_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_app_channels
    ADD CONSTRAINT developer_app_channels_developer_app_id_session_id_key UNIQUE (developer_app_id, session_id);


--
-- Name: developer_app_channels developer_app_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_app_channels
    ADD CONSTRAINT developer_app_channels_pkey PRIMARY KEY (id);


--
-- Name: developer_apps developer_apps_api_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_apps
    ADD CONSTRAINT developer_apps_api_key_key UNIQUE (api_key);


--
-- Name: developer_apps developer_apps_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_apps
    ADD CONSTRAINT developer_apps_pkey PRIMARY KEY (id);


--
-- Name: flow_sessions flow_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flow_sessions
    ADD CONSTRAINT flow_sessions_pkey PRIMARY KEY (id);


--
-- Name: followup_instances followup_instances_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.followup_instances
    ADD CONSTRAINT followup_instances_pkey PRIMARY KEY (id);


--
-- Name: followup_sequences followup_sequences_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.followup_sequences
    ADD CONSTRAINT followup_sequences_pkey PRIMARY KEY (id);


--
-- Name: form_sessions form_sessions_contact_id_status_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_sessions
    ADD CONSTRAINT form_sessions_contact_id_status_key UNIQUE (contact_id, status);


--
-- Name: form_sessions form_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_sessions
    ADD CONSTRAINT form_sessions_pkey PRIMARY KEY (id);


--
-- Name: form_submissions form_submissions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_submissions
    ADD CONSTRAINT form_submissions_pkey PRIMARY KEY (id);


--
-- Name: forms forms_organization_id_trigger_keyword_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_organization_id_trigger_keyword_key UNIQUE (organization_id, trigger_keyword);


--
-- Name: forms forms_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_pkey PRIMARY KEY (id);


--
-- Name: instagram_accounts instagram_accounts_ig_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instagram_accounts
    ADD CONSTRAINT instagram_accounts_ig_id_key UNIQUE (ig_id);


--
-- Name: instagram_accounts instagram_accounts_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instagram_accounts
    ADD CONSTRAINT instagram_accounts_pkey PRIMARY KEY (id);


--
-- Name: integration_settings integration_settings_organization_id_provider_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_settings
    ADD CONSTRAINT integration_settings_organization_id_provider_key UNIQUE (organization_id, provider);


--
-- Name: integration_settings integration_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_settings
    ADD CONSTRAINT integration_settings_pkey PRIMARY KEY (id);


--
-- Name: invoice_items invoice_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_pkey PRIMARY KEY (id);


--
-- Name: invoice_settings invoice_settings_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_settings
    ADD CONSTRAINT invoice_settings_organization_id_key UNIQUE (organization_id);


--
-- Name: invoice_settings invoice_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_settings
    ADD CONSTRAINT invoice_settings_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_organization_id_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_organization_id_invoice_number_key UNIQUE (organization_id, invoice_number);


--
-- Name: invoices invoices_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_pkey PRIMARY KEY (id);


--
-- Name: invoices invoices_public_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_public_token_key UNIQUE (public_token);


--
-- Name: keyword_replies keyword_replies_organization_id_parent_id_keyword_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.keyword_replies
    ADD CONSTRAINT keyword_replies_organization_id_parent_id_keyword_key UNIQUE (organization_id, parent_id, keyword);


--
-- Name: keyword_replies keyword_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.keyword_replies
    ADD CONSTRAINT keyword_replies_pkey PRIMARY KEY (id);


--
-- Name: knowledge_base_assets knowledge_base_assets_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_base_assets
    ADD CONSTRAINT knowledge_base_assets_pkey PRIMARY KEY (id);


--
-- Name: knowledge_base_qa knowledge_base_qa_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_base_qa
    ADD CONSTRAINT knowledge_base_qa_pkey PRIMARY KEY (id);


--
-- Name: labels labels_organization_id_name_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.labels
    ADD CONSTRAINT labels_organization_id_name_key UNIQUE (organization_id, name);


--
-- Name: labels labels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.labels
    ADD CONSTRAINT labels_pkey PRIMARY KEY (id);


--
-- Name: landing_page_sections landing_page_sections_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.landing_page_sections
    ADD CONSTRAINT landing_page_sections_pkey PRIMARY KEY (id);


--
-- Name: landing_page_sections landing_page_sections_section_key_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.landing_page_sections
    ADD CONSTRAINT landing_page_sections_section_key_key UNIQUE (section_key);


--
-- Name: link_clicks link_clicks_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.link_clicks
    ADD CONSTRAINT link_clicks_pkey PRIMARY KEY (id);


--
-- Name: messages messages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_pkey PRIMARY KEY (id);


--
-- Name: messages messages_wa_message_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_wa_message_id_key UNIQUE (wa_message_id);


--
-- Name: messenger_pages messenger_pages_page_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messenger_pages
    ADD CONSTRAINT messenger_pages_page_id_key UNIQUE (page_id);


--
-- Name: messenger_pages messenger_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messenger_pages
    ADD CONSTRAINT messenger_pages_pkey PRIMARY KEY (id);


--
-- Name: meta_templates meta_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meta_templates
    ADD CONSTRAINT meta_templates_pkey PRIMARY KEY (id);


--
-- Name: meta_templates meta_templates_waba_id_name_language_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meta_templates
    ADD CONSTRAINT meta_templates_waba_id_name_language_key UNIQUE (waba_id, name, language);


--
-- Name: migrations migrations_name_key; Type: CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_name_key UNIQUE (name);


--
-- Name: migrations migrations_pkey; Type: CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.migrations
    ADD CONSTRAINT migrations_pkey PRIMARY KEY (id);


--
-- Name: notification_templates notification_templates_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_pkey PRIMARY KEY (id);


--
-- Name: notification_templates notification_templates_type_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.notification_templates
    ADD CONSTRAINT notification_templates_type_key UNIQUE (type);


--
-- Name: number_check_batches number_check_batches_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.number_check_batches
    ADD CONSTRAINT number_check_batches_pkey PRIMARY KEY (id);


--
-- Name: number_check_items number_check_items_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.number_check_items
    ADD CONSTRAINT number_check_items_pkey PRIMARY KEY (id);


--
-- Name: ongkir_logs ongkir_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.ongkir_logs
    ADD CONSTRAINT ongkir_logs_pkey PRIMARY KEY (id);


--
-- Name: ongkir_settings ongkir_settings_organization_id_key; Type: CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.ongkir_settings
    ADD CONSTRAINT ongkir_settings_organization_id_key UNIQUE (organization_id);


--
-- Name: ongkir_settings ongkir_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.ongkir_settings
    ADD CONSTRAINT ongkir_settings_pkey PRIMARY KEY (id);


--
-- Name: organizations organizations_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_pkey PRIMARY KEY (id);


--
-- Name: payment_channels payment_channels_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.payment_channels
    ADD CONSTRAINT payment_channels_pkey PRIMARY KEY (id);


--
-- Name: pipeline_stage_history pipeline_stage_history_pkey; Type: CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.pipeline_stage_history
    ADD CONSTRAINT pipeline_stage_history_pkey PRIMARY KEY (id);


--
-- Name: pipeline_stages pipeline_stages_pkey; Type: CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.pipeline_stages
    ADD CONSTRAINT pipeline_stages_pkey PRIMARY KEY (id);


--
-- Name: pipelines pipelines_pkey; Type: CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.pipelines
    ADD CONSTRAINT pipelines_pkey PRIMARY KEY (id);


--
-- Name: plan_features plan_features_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_pkey PRIMARY KEY (id);


--
-- Name: plans plans_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plans
    ADD CONSTRAINT plans_pkey PRIMARY KEY (id);


--
-- Name: promo_codes promo_codes_code_key; Type: CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_code_key UNIQUE (code);


--
-- Name: promo_codes promo_codes_pkey; Type: CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.promo_codes
    ADD CONSTRAINT promo_codes_pkey PRIMARY KEY (id);


--
-- Name: public_pages public_pages_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.public_pages
    ADD CONSTRAINT public_pages_pkey PRIMARY KEY (id);


--
-- Name: public_pages public_pages_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.public_pages
    ADD CONSTRAINT public_pages_slug_key UNIQUE (slug);


--
-- Name: queues queues_organization_id_contact_id_status_key; Type: CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.queues
    ADD CONSTRAINT queues_organization_id_contact_id_status_key UNIQUE (organization_id, contact_id, status);


--
-- Name: queues queues_pkey; Type: CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.queues
    ADD CONSTRAINT queues_pkey PRIMARY KEY (id);


--
-- Name: quick_replies quick_replies_organization_id_shortcut_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quick_replies
    ADD CONSTRAINT quick_replies_organization_id_shortcut_key UNIQUE (organization_id, shortcut);


--
-- Name: quick_replies quick_replies_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quick_replies
    ADD CONSTRAINT quick_replies_pkey PRIMARY KEY (id);


--
-- Name: rotator_group_sessions rotator_group_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rotator_group_sessions
    ADD CONSTRAINT rotator_group_sessions_pkey PRIMARY KEY (id);


--
-- Name: rotator_groups rotator_groups_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rotator_groups
    ADD CONSTRAINT rotator_groups_pkey PRIMARY KEY (id);


--
-- Name: scraper_history scraper_history_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scraper_history
    ADD CONSTRAINT scraper_history_pkey PRIMARY KEY (id);


--
-- Name: short_links short_links_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.short_links
    ADD CONSTRAINT short_links_pkey PRIMARY KEY (id);


--
-- Name: short_links short_links_slug_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.short_links
    ADD CONSTRAINT short_links_slug_key UNIQUE (slug);


--
-- Name: subscription_addons subscription_addons_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_addons
    ADD CONSTRAINT subscription_addons_pkey PRIMARY KEY (id);


--
-- Name: subscriptions subscriptions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_pkey PRIMARY KEY (id);


--
-- Name: system_feature_flags system_feature_flags_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_feature_flags
    ADD CONSTRAINT system_feature_flags_pkey PRIMARY KEY (key);


--
-- Name: system_settings system_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.system_settings
    ADD CONSTRAINT system_settings_pkey PRIMARY KEY (key);


--
-- Name: telegram_bots telegram_bots_bot_token_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_bots
    ADD CONSTRAINT telegram_bots_bot_token_key UNIQUE (bot_token);


--
-- Name: telegram_bots telegram_bots_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_bots
    ADD CONSTRAINT telegram_bots_pkey PRIMARY KEY (id);


--
-- Name: tiktok_shops tiktok_shops_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiktok_shops
    ADD CONSTRAINT tiktok_shops_pkey PRIMARY KEY (id);


--
-- Name: tiktok_shops tiktok_shops_shop_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiktok_shops
    ADD CONSTRAINT tiktok_shops_shop_id_key UNIQUE (shop_id);


--
-- Name: transactions transactions_invoice_number_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_invoice_number_key UNIQUE (invoice_number);


--
-- Name: transactions transactions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_pkey PRIMARY KEY (id);


--
-- Name: messages unique_wa_message_id; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT unique_wa_message_id UNIQUE (wa_message_id);


--
-- Name: unsubscribe_logs unsubscribe_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unsubscribe_logs
    ADD CONSTRAINT unsubscribe_logs_pkey PRIMARY KEY (id);


--
-- Name: upselling_campaigns upselling_campaigns_pkey; Type: CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.upselling_campaigns
    ADD CONSTRAINT upselling_campaigns_pkey PRIMARY KEY (id);


--
-- Name: user_fcm_tokens user_fcm_tokens_fcm_token_key; Type: CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.user_fcm_tokens
    ADD CONSTRAINT user_fcm_tokens_fcm_token_key UNIQUE (fcm_token);


--
-- Name: user_fcm_tokens user_fcm_tokens_pkey; Type: CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.user_fcm_tokens
    ADD CONSTRAINT user_fcm_tokens_pkey PRIMARY KEY (id);


--
-- Name: users users_email_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_email_key UNIQUE (email);


--
-- Name: users users_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_pkey PRIMARY KEY (id);


--
-- Name: users users_referral_code_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_referral_code_key UNIQUE (referral_code);


--
-- Name: warmer_circle_sessions warmer_circle_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warmer_circle_sessions
    ADD CONSTRAINT warmer_circle_sessions_pkey PRIMARY KEY (id);


--
-- Name: warmer_circle_sessions warmer_circle_sessions_warmer_circle_id_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warmer_circle_sessions
    ADD CONSTRAINT warmer_circle_sessions_warmer_circle_id_session_id_key UNIQUE (warmer_circle_id, session_id);


--
-- Name: warmer_circles warmer_circles_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warmer_circles
    ADD CONSTRAINT warmer_circles_pkey PRIMARY KEY (id);


--
-- Name: warmer_logs warmer_logs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warmer_logs
    ADD CONSTRAINT warmer_logs_pkey PRIMARY KEY (id);


--
-- Name: warmer_settings warmer_settings_organization_id_session_id_1_session_id_2_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warmer_settings
    ADD CONSTRAINT warmer_settings_organization_id_session_id_1_session_id_2_key UNIQUE (organization_id, session_id_1, session_id_2);


--
-- Name: warmer_settings warmer_settings_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warmer_settings
    ADD CONSTRAINT warmer_settings_pkey PRIMARY KEY (id);


--
-- Name: webchat_configs webchat_configs_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webchat_configs
    ADD CONSTRAINT webchat_configs_pkey PRIMARY KEY (id);


--
-- Name: webchat_configs webchat_configs_widget_uid_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webchat_configs
    ADD CONSTRAINT webchat_configs_widget_uid_key UNIQUE (widget_uid);


--
-- Name: whatsapp_sessions whatsapp_sessions_pkey; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_sessions
    ADD CONSTRAINT whatsapp_sessions_pkey PRIMARY KEY (id);


--
-- Name: whatsapp_sessions whatsapp_sessions_session_id_key; Type: CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_sessions
    ADD CONSTRAINT whatsapp_sessions_session_id_key UNIQUE (session_id);


--
-- Name: idx_affiliate_commissions_partner; Type: INDEX; Schema: public; Owner: omni_user
--

CREATE INDEX idx_affiliate_commissions_partner ON public.affiliate_commissions USING btree (partner_id);


--
-- Name: idx_affiliate_payouts_partner; Type: INDEX; Schema: public; Owner: omni_user
--

CREATE INDEX idx_affiliate_payouts_partner ON public.affiliate_payouts USING btree (partner_id);


--
-- Name: idx_broadcasts_device_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_broadcasts_device_id ON public.broadcasts USING btree (device_id);


--
-- Name: idx_chat_flows_keyword; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_chat_flows_keyword ON public.chat_flows USING btree (organization_id, trigger_keyword);


--
-- Name: idx_chatbot_logs_org_date; Type: INDEX; Schema: public; Owner: omni_user
--

CREATE INDEX idx_chatbot_logs_org_date ON public.chatbot_logs USING btree (organization_id, created_at);


--
-- Name: idx_chatbot_logs_rule; Type: INDEX; Schema: public; Owner: omni_user
--

CREATE INDEX idx_chatbot_logs_rule ON public.chatbot_logs USING btree (matched_rule_id);


--
-- Name: idx_check_items_batch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_check_items_batch ON public.number_check_items USING btree (batch_id);


--
-- Name: idx_check_items_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_check_items_status ON public.number_check_items USING btree (status);


--
-- Name: idx_contacts_subscription; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contacts_subscription ON public.contacts USING btree (is_subscribed);


--
-- Name: idx_contacts_telegram_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contacts_telegram_id ON public.contacts USING btree (telegram_id);


--
-- Name: idx_contacts_web_visitor; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_contacts_web_visitor ON public.contacts USING btree (web_visitor_id);


--
-- Name: idx_conversations_archived; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_archived ON public.conversations USING btree (is_archived);


--
-- Name: idx_conversations_assigned; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_assigned ON public.conversations USING btree (assigned_to_agent_id);


--
-- Name: idx_conversations_assigned_to; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_assigned_to ON public.conversations USING btree (assigned_to_agent_id);


--
-- Name: idx_conversations_channel; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_channel ON public.conversations USING btree (channel);


--
-- Name: idx_conversations_is_archived; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_is_archived ON public.conversations USING btree (is_archived);


--
-- Name: idx_conversations_is_pinned; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_is_pinned ON public.conversations USING btree (is_pinned);


--
-- Name: idx_conversations_pinned; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_pinned ON public.conversations USING btree (is_pinned);


--
-- Name: idx_conversations_pipeline; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_pipeline ON public.conversations USING btree (pipeline_id, pipeline_stage_id);


--
-- Name: idx_conversations_rating_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_rating_token ON public.conversations USING btree (rating_token);


--
-- Name: idx_conversations_webchat; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_conversations_webchat ON public.conversations USING btree (webchat_config_id);


--
-- Name: idx_dev_apps_key; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dev_apps_key ON public.developer_apps USING btree (api_key);


--
-- Name: idx_dev_apps_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dev_apps_org ON public.developer_apps USING btree (organization_id);


--
-- Name: idx_dev_apps_scopes; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_dev_apps_scopes ON public.developer_apps USING gin (scopes);


--
-- Name: idx_fcm_user_id; Type: INDEX; Schema: public; Owner: omni_user
--

CREATE INDEX idx_fcm_user_id ON public.user_fcm_tokens USING btree (user_id);


--
-- Name: idx_flow_sessions_contact; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_flow_sessions_contact ON public.flow_sessions USING btree (contact_id, status);


--
-- Name: idx_followup_contact; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_followup_contact ON public.followup_instances USING btree (contact_id);


--
-- Name: idx_followup_next_run; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_followup_next_run ON public.followup_instances USING btree (status, next_run_at);


--
-- Name: idx_form_sessions_active; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_form_sessions_active ON public.form_sessions USING btree (contact_id, status);


--
-- Name: idx_forms_keyword; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_forms_keyword ON public.forms USING btree (organization_id, trigger_keyword);


--
-- Name: idx_instagram_accounts_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_instagram_accounts_org ON public.instagram_accounts USING btree (organization_id);


--
-- Name: idx_invoices_batch; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_batch ON public.invoices USING btree (batch_id);


--
-- Name: idx_invoices_org_status; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_org_status ON public.invoices USING btree (organization_id, status);


--
-- Name: idx_invoices_token; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_invoices_token ON public.invoices USING btree (public_token);


--
-- Name: idx_kb_assets_embedding; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kb_assets_embedding ON public.knowledge_base_assets USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: idx_kb_assets_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kb_assets_session ON public.knowledge_base_assets USING btree (session_id);


--
-- Name: idx_kb_qa_creator; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kb_qa_creator ON public.knowledge_base_qa USING btree (created_by_agent_id);


--
-- Name: idx_kb_qa_embedding; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kb_qa_embedding ON public.knowledge_base_qa USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: idx_kb_qa_session; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_kb_qa_session ON public.knowledge_base_qa USING btree (session_id);


--
-- Name: idx_keyword_replies_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_keyword_replies_org ON public.keyword_replies USING btree (organization_id);


--
-- Name: idx_keyword_replies_parent; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_keyword_replies_parent ON public.keyword_replies USING btree (parent_id);


--
-- Name: idx_messages_sender_stats; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messages_sender_stats ON public.messages USING btree (organization_id, sender_id, created_at);


--
-- Name: idx_messenger_pages_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_messenger_pages_org ON public.messenger_pages USING btree (organization_id);


--
-- Name: idx_meta_templates_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_meta_templates_org ON public.meta_templates USING btree (organization_id);


--
-- Name: idx_ongkir_logs_created; Type: INDEX; Schema: public; Owner: omni_user
--

CREATE INDEX idx_ongkir_logs_created ON public.ongkir_logs USING btree (created_at);


--
-- Name: idx_ongkir_logs_org; Type: INDEX; Schema: public; Owner: omni_user
--

CREATE INDEX idx_ongkir_logs_org ON public.ongkir_logs USING btree (organization_id);


--
-- Name: idx_pipeline_history_conversation; Type: INDEX; Schema: public; Owner: omni_user
--

CREATE INDEX idx_pipeline_history_conversation ON public.pipeline_stage_history USING btree (conversation_id);


--
-- Name: idx_pipeline_stages_pipeline; Type: INDEX; Schema: public; Owner: omni_user
--

CREATE INDEX idx_pipeline_stages_pipeline ON public.pipeline_stages USING btree (pipeline_id);


--
-- Name: idx_pipelines_org; Type: INDEX; Schema: public; Owner: omni_user
--

CREATE INDEX idx_pipelines_org ON public.pipelines USING btree (organization_id);


--
-- Name: idx_queues_contact; Type: INDEX; Schema: public; Owner: omni_user
--

CREATE INDEX idx_queues_contact ON public.queues USING btree (contact_id);


--
-- Name: idx_queues_org_contact_status; Type: INDEX; Schema: public; Owner: omni_user
--

CREATE INDEX idx_queues_org_contact_status ON public.queues USING btree (organization_id, contact_id, status);


--
-- Name: idx_queues_org_div_status; Type: INDEX; Schema: public; Owner: omni_user
--

CREATE INDEX idx_queues_org_div_status ON public.queues USING btree (organization_id, division, status);


--
-- Name: idx_quick_replies_type; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quick_replies_type ON public.quick_replies USING btree (type);


--
-- Name: idx_quick_replies_user_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_quick_replies_user_id ON public.quick_replies USING btree (user_id);


--
-- Name: idx_ratings_conversation; Type: INDEX; Schema: public; Owner: omni_user
--

CREATE INDEX idx_ratings_conversation ON public.conversation_ratings USING btree (conversation_id);


--
-- Name: idx_scraper_history_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_scraper_history_org ON public.scraper_history USING btree (organization_id);


--
-- Name: idx_sessions_phone_id; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_sessions_phone_id ON public.whatsapp_sessions USING btree (phone_number_id);


--
-- Name: idx_short_links_slug; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_short_links_slug ON public.short_links USING btree (slug);


--
-- Name: idx_telegram_bots_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_telegram_bots_org ON public.telegram_bots USING btree (organization_id);


--
-- Name: idx_tiktok_shops_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_tiktok_shops_org ON public.tiktok_shops USING btree (organization_id);


--
-- Name: idx_unsub_logs_contact; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_unsub_logs_contact ON public.unsubscribe_logs USING btree (contact_id);


--
-- Name: idx_unsub_logs_org; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_unsub_logs_org ON public.unsubscribe_logs USING btree (organization_id);


--
-- Name: idx_upselling_org; Type: INDEX; Schema: public; Owner: omni_user
--

CREATE INDEX idx_upselling_org ON public.upselling_campaigns USING btree (organization_id);


--
-- Name: idx_users_org_online; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX idx_users_org_online ON public.users USING btree (organization_id, is_online);


--
-- Name: knowledge_base_assets_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX knowledge_base_assets_embedding_idx ON public.knowledge_base_assets USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: knowledge_base_assets_embedding_idx1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX knowledge_base_assets_embedding_idx1 ON public.knowledge_base_assets USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: knowledge_base_assets_embedding_idx2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX knowledge_base_assets_embedding_idx2 ON public.knowledge_base_assets USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: knowledge_base_qa_embedding_idx; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX knowledge_base_qa_embedding_idx ON public.knowledge_base_qa USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: knowledge_base_qa_embedding_idx1; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX knowledge_base_qa_embedding_idx1 ON public.knowledge_base_qa USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: knowledge_base_qa_embedding_idx2; Type: INDEX; Schema: public; Owner: postgres
--

CREATE INDEX knowledge_base_qa_embedding_idx2 ON public.knowledge_base_qa USING hnsw (embedding public.vector_cosine_ops);


--
-- Name: activity_logs activity_logs_actor_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.activity_logs
    ADD CONSTRAINT activity_logs_actor_id_fkey FOREIGN KEY (actor_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: broadcast_recipients broadcast_recipients_broadcast_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_recipients
    ADD CONSTRAINT broadcast_recipients_broadcast_id_fkey FOREIGN KEY (broadcast_id) REFERENCES public.broadcasts(id) ON DELETE CASCADE;


--
-- Name: broadcast_recipients broadcast_recipients_used_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcast_recipients
    ADD CONSTRAINT broadcast_recipients_used_session_id_fkey FOREIGN KEY (used_session_id) REFERENCES public.whatsapp_sessions(id);


--
-- Name: broadcasts broadcasts_device_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_device_id_fkey FOREIGN KEY (device_id) REFERENCES public.whatsapp_sessions(id);


--
-- Name: broadcasts broadcasts_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: broadcasts broadcasts_rotator_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.broadcasts
    ADD CONSTRAINT broadcasts_rotator_group_id_fkey FOREIGN KEY (rotator_group_id) REFERENCES public.rotator_groups(id);


--
-- Name: chat_flows chat_flows_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chat_flows
    ADD CONSTRAINT chat_flows_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: chatbot_logs chatbot_logs_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.chatbot_logs
    ADD CONSTRAINT chatbot_logs_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: chatbot_logs chatbot_logs_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.chatbot_logs
    ADD CONSTRAINT chatbot_logs_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: chatbot_logs chatbot_logs_matched_rule_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.chatbot_logs
    ADD CONSTRAINT chatbot_logs_matched_rule_id_fkey FOREIGN KEY (matched_rule_id) REFERENCES public.keyword_replies(id) ON DELETE SET NULL;


--
-- Name: chatbot_logs chatbot_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.chatbot_logs
    ADD CONSTRAINT chatbot_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: chatbot_settings chatbot_settings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.chatbot_settings
    ADD CONSTRAINT chatbot_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: contact_labels contact_labels_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_labels
    ADD CONSTRAINT contact_labels_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: contact_labels contact_labels_label_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contact_labels
    ADD CONSTRAINT contact_labels_label_id_fkey FOREIGN KEY (label_id) REFERENCES public.labels(id) ON DELETE CASCADE;


--
-- Name: contacts contacts_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.contacts
    ADD CONSTRAINT contacts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: conversation_ratings conversation_ratings_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.conversation_ratings
    ADD CONSTRAINT conversation_ratings_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_assigned_to_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_assigned_to_agent_id_fkey FOREIGN KEY (assigned_to_agent_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_closed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_closed_by_fkey FOREIGN KEY (closed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_instagram_account_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_instagram_account_id_fkey FOREIGN KEY (instagram_account_id) REFERENCES public.instagram_accounts(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_messenger_page_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_messenger_page_id_fkey FOREIGN KEY (messenger_page_id) REFERENCES public.messenger_pages(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: conversations conversations_pipeline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_pipeline_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_pipeline_stage_id_fkey FOREIGN KEY (pipeline_stage_id) REFERENCES public.pipeline_stages(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_telegram_bot_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_telegram_bot_id_fkey FOREIGN KEY (telegram_bot_id) REFERENCES public.telegram_bots(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_webchat_config_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_webchat_config_id_fkey FOREIGN KEY (webchat_config_id) REFERENCES public.webchat_configs(id) ON DELETE SET NULL;


--
-- Name: conversations conversations_whatsapp_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.conversations
    ADD CONSTRAINT conversations_whatsapp_session_id_fkey FOREIGN KEY (whatsapp_session_id) REFERENCES public.whatsapp_sessions(id) ON DELETE SET NULL;


--
-- Name: developer_api_logs developer_api_logs_developer_app_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_api_logs
    ADD CONSTRAINT developer_api_logs_developer_app_id_fkey FOREIGN KEY (developer_app_id) REFERENCES public.developer_apps(id) ON DELETE CASCADE;


--
-- Name: developer_app_channels developer_app_channels_developer_app_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_app_channels
    ADD CONSTRAINT developer_app_channels_developer_app_id_fkey FOREIGN KEY (developer_app_id) REFERENCES public.developer_apps(id) ON DELETE CASCADE;


--
-- Name: developer_apps developer_apps_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.developer_apps
    ADD CONSTRAINT developer_apps_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: quick_replies fk_quick_replies_user; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quick_replies
    ADD CONSTRAINT fk_quick_replies_user FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: flow_sessions flow_sessions_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flow_sessions
    ADD CONSTRAINT flow_sessions_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: flow_sessions flow_sessions_flow_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flow_sessions
    ADD CONSTRAINT flow_sessions_flow_id_fkey FOREIGN KEY (flow_id) REFERENCES public.chat_flows(id) ON DELETE CASCADE;


--
-- Name: flow_sessions flow_sessions_whatsapp_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.flow_sessions
    ADD CONSTRAINT flow_sessions_whatsapp_session_id_fkey FOREIGN KEY (whatsapp_session_id) REFERENCES public.whatsapp_sessions(id) ON DELETE SET NULL;


--
-- Name: followup_instances followup_instances_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.followup_instances
    ADD CONSTRAINT followup_instances_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: followup_instances followup_instances_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.followup_instances
    ADD CONSTRAINT followup_instances_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: followup_instances followup_instances_sequence_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.followup_instances
    ADD CONSTRAINT followup_instances_sequence_id_fkey FOREIGN KEY (sequence_id) REFERENCES public.followup_sequences(id) ON DELETE SET NULL;


--
-- Name: followup_instances followup_instances_whatsapp_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.followup_instances
    ADD CONSTRAINT followup_instances_whatsapp_session_id_fkey FOREIGN KEY (whatsapp_session_id) REFERENCES public.whatsapp_sessions(id) ON DELETE SET NULL;


--
-- Name: followup_sequences followup_sequences_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.followup_sequences
    ADD CONSTRAINT followup_sequences_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: form_sessions form_sessions_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_sessions
    ADD CONSTRAINT form_sessions_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: form_sessions form_sessions_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_sessions
    ADD CONSTRAINT form_sessions_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id) ON DELETE CASCADE;


--
-- Name: form_sessions form_sessions_whatsapp_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_sessions
    ADD CONSTRAINT form_sessions_whatsapp_session_id_fkey FOREIGN KEY (whatsapp_session_id) REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE;


--
-- Name: form_submissions form_submissions_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_submissions
    ADD CONSTRAINT form_submissions_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;


--
-- Name: form_submissions form_submissions_form_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.form_submissions
    ADD CONSTRAINT form_submissions_form_id_fkey FOREIGN KEY (form_id) REFERENCES public.forms(id) ON DELETE CASCADE;


--
-- Name: forms forms_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.forms
    ADD CONSTRAINT forms_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: instagram_accounts instagram_accounts_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.instagram_accounts
    ADD CONSTRAINT instagram_accounts_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: integration_settings integration_settings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.integration_settings
    ADD CONSTRAINT integration_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: invoice_items invoice_items_invoice_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_items
    ADD CONSTRAINT invoice_items_invoice_id_fkey FOREIGN KEY (invoice_id) REFERENCES public.invoices(id) ON DELETE CASCADE;


--
-- Name: invoice_settings invoice_settings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoice_settings
    ADD CONSTRAINT invoice_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: invoices invoices_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE SET NULL;


--
-- Name: invoices invoices_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.invoices
    ADD CONSTRAINT invoices_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: keyword_replies keyword_replies_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.keyword_replies
    ADD CONSTRAINT keyword_replies_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: keyword_replies keyword_replies_parent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.keyword_replies
    ADD CONSTRAINT keyword_replies_parent_id_fkey FOREIGN KEY (parent_id) REFERENCES public.keyword_replies(id) ON DELETE CASCADE;


--
-- Name: knowledge_base_assets knowledge_base_assets_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_base_assets
    ADD CONSTRAINT knowledge_base_assets_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: knowledge_base_qa knowledge_base_qa_created_by_agent_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_base_qa
    ADD CONSTRAINT knowledge_base_qa_created_by_agent_id_fkey FOREIGN KEY (created_by_agent_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: knowledge_base_qa knowledge_base_qa_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.knowledge_base_qa
    ADD CONSTRAINT knowledge_base_qa_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: labels labels_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.labels
    ADD CONSTRAINT labels_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: link_clicks link_clicks_short_link_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.link_clicks
    ADD CONSTRAINT link_clicks_short_link_id_fkey FOREIGN KEY (short_link_id) REFERENCES public.short_links(id) ON DELETE CASCADE;


--
-- Name: messages messages_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: messages messages_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: messages messages_sender_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messages
    ADD CONSTRAINT messages_sender_id_fkey FOREIGN KEY (sender_id) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: messenger_pages messenger_pages_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.messenger_pages
    ADD CONSTRAINT messenger_pages_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: meta_templates meta_templates_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.meta_templates
    ADD CONSTRAINT meta_templates_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: number_check_batches number_check_batches_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.number_check_batches
    ADD CONSTRAINT number_check_batches_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: number_check_batches number_check_batches_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.number_check_batches
    ADD CONSTRAINT number_check_batches_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.whatsapp_sessions(id) ON DELETE SET NULL;


--
-- Name: number_check_items number_check_items_batch_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.number_check_items
    ADD CONSTRAINT number_check_items_batch_id_fkey FOREIGN KEY (batch_id) REFERENCES public.number_check_batches(id) ON DELETE CASCADE;


--
-- Name: ongkir_logs ongkir_logs_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.ongkir_logs
    ADD CONSTRAINT ongkir_logs_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE SET NULL;


--
-- Name: ongkir_logs ongkir_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.ongkir_logs
    ADD CONSTRAINT ongkir_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: ongkir_settings ongkir_settings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.ongkir_settings
    ADD CONSTRAINT ongkir_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: organizations organizations_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.organizations
    ADD CONSTRAINT organizations_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: pipeline_stage_history pipeline_stage_history_changed_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.pipeline_stage_history
    ADD CONSTRAINT pipeline_stage_history_changed_by_fkey FOREIGN KEY (changed_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: pipeline_stage_history pipeline_stage_history_conversation_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.pipeline_stage_history
    ADD CONSTRAINT pipeline_stage_history_conversation_id_fkey FOREIGN KEY (conversation_id) REFERENCES public.conversations(id) ON DELETE CASCADE;


--
-- Name: pipeline_stage_history pipeline_stage_history_from_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.pipeline_stage_history
    ADD CONSTRAINT pipeline_stage_history_from_stage_id_fkey FOREIGN KEY (from_stage_id) REFERENCES public.pipeline_stages(id) ON DELETE SET NULL;


--
-- Name: pipeline_stage_history pipeline_stage_history_pipeline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.pipeline_stage_history
    ADD CONSTRAINT pipeline_stage_history_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id) ON DELETE CASCADE;


--
-- Name: pipeline_stage_history pipeline_stage_history_to_stage_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.pipeline_stage_history
    ADD CONSTRAINT pipeline_stage_history_to_stage_id_fkey FOREIGN KEY (to_stage_id) REFERENCES public.pipeline_stages(id) ON DELETE CASCADE;


--
-- Name: pipeline_stages pipeline_stages_pipeline_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.pipeline_stages
    ADD CONSTRAINT pipeline_stages_pipeline_id_fkey FOREIGN KEY (pipeline_id) REFERENCES public.pipelines(id) ON DELETE CASCADE;


--
-- Name: pipelines pipelines_created_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.pipelines
    ADD CONSTRAINT pipelines_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;


--
-- Name: pipelines pipelines_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.pipelines
    ADD CONSTRAINT pipelines_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: plan_features plan_features_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.plan_features
    ADD CONSTRAINT plan_features_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE CASCADE;


--
-- Name: queues queues_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.queues
    ADD CONSTRAINT queues_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: queues queues_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.queues
    ADD CONSTRAINT queues_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: quick_replies quick_replies_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.quick_replies
    ADD CONSTRAINT quick_replies_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: rotator_group_sessions rotator_group_sessions_rotator_group_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rotator_group_sessions
    ADD CONSTRAINT rotator_group_sessions_rotator_group_id_fkey FOREIGN KEY (rotator_group_id) REFERENCES public.rotator_groups(id) ON DELETE CASCADE;


--
-- Name: rotator_group_sessions rotator_group_sessions_whatsapp_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rotator_group_sessions
    ADD CONSTRAINT rotator_group_sessions_whatsapp_session_id_fkey FOREIGN KEY (whatsapp_session_id) REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE;


--
-- Name: rotator_groups rotator_groups_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.rotator_groups
    ADD CONSTRAINT rotator_groups_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: scraper_history scraper_history_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.scraper_history
    ADD CONSTRAINT scraper_history_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: short_links short_links_broadcast_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.short_links
    ADD CONSTRAINT short_links_broadcast_id_fkey FOREIGN KEY (broadcast_id) REFERENCES public.broadcasts(id) ON DELETE SET NULL;


--
-- Name: short_links short_links_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.short_links
    ADD CONSTRAINT short_links_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: short_links short_links_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.short_links
    ADD CONSTRAINT short_links_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: subscription_addons subscription_addons_addon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_addons
    ADD CONSTRAINT subscription_addons_addon_id_fkey FOREIGN KEY (addon_id) REFERENCES public.addons(id);


--
-- Name: subscription_addons subscription_addons_subscription_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscription_addons
    ADD CONSTRAINT subscription_addons_subscription_id_fkey FOREIGN KEY (subscription_id) REFERENCES public.subscriptions(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: subscriptions subscriptions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.subscriptions
    ADD CONSTRAINT subscriptions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id) ON DELETE SET NULL;


--
-- Name: telegram_bots telegram_bots_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.telegram_bots
    ADD CONSTRAINT telegram_bots_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: tiktok_shops tiktok_shops_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.tiktok_shops
    ADD CONSTRAINT tiktok_shops_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: transactions transactions_addon_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_addon_id_fkey FOREIGN KEY (addon_id) REFERENCES public.addons(id);


--
-- Name: transactions transactions_approved_by_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_approved_by_fkey FOREIGN KEY (approved_by) REFERENCES public.users(id);


--
-- Name: transactions transactions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id);


--
-- Name: transactions transactions_payment_channel_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_payment_channel_id_fkey FOREIGN KEY (payment_channel_id) REFERENCES public.payment_channels(id);


--
-- Name: transactions transactions_plan_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.transactions
    ADD CONSTRAINT transactions_plan_id_fkey FOREIGN KEY (plan_id) REFERENCES public.plans(id);


--
-- Name: unsubscribe_logs unsubscribe_logs_contact_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unsubscribe_logs
    ADD CONSTRAINT unsubscribe_logs_contact_id_fkey FOREIGN KEY (contact_id) REFERENCES public.contacts(id) ON DELETE CASCADE;


--
-- Name: unsubscribe_logs unsubscribe_logs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.unsubscribe_logs
    ADD CONSTRAINT unsubscribe_logs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: user_fcm_tokens user_fcm_tokens_user_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: omni_user
--

ALTER TABLE ONLY public.user_fcm_tokens
    ADD CONSTRAINT user_fcm_tokens_user_id_fkey FOREIGN KEY (user_id) REFERENCES public.users(id) ON DELETE CASCADE;


--
-- Name: users users_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.users
    ADD CONSTRAINT users_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: warmer_circle_sessions warmer_circle_sessions_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warmer_circle_sessions
    ADD CONSTRAINT warmer_circle_sessions_session_id_fkey FOREIGN KEY (session_id) REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE;


--
-- Name: warmer_circle_sessions warmer_circle_sessions_warmer_circle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warmer_circle_sessions
    ADD CONSTRAINT warmer_circle_sessions_warmer_circle_id_fkey FOREIGN KEY (warmer_circle_id) REFERENCES public.warmer_circles(id) ON DELETE CASCADE;


--
-- Name: warmer_circles warmer_circles_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warmer_circles
    ADD CONSTRAINT warmer_circles_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: warmer_logs warmer_logs_sender_session_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warmer_logs
    ADD CONSTRAINT warmer_logs_sender_session_id_fkey FOREIGN KEY (sender_session_id) REFERENCES public.whatsapp_sessions(id);


--
-- Name: warmer_logs warmer_logs_warmer_circle_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warmer_logs
    ADD CONSTRAINT warmer_logs_warmer_circle_id_fkey FOREIGN KEY (warmer_circle_id) REFERENCES public.warmer_circles(id) ON DELETE CASCADE;


--
-- Name: warmer_logs warmer_logs_warmer_setting_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warmer_logs
    ADD CONSTRAINT warmer_logs_warmer_setting_id_fkey FOREIGN KEY (warmer_setting_id) REFERENCES public.warmer_settings(id) ON DELETE CASCADE;


--
-- Name: warmer_settings warmer_settings_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warmer_settings
    ADD CONSTRAINT warmer_settings_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: warmer_settings warmer_settings_session_id_1_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warmer_settings
    ADD CONSTRAINT warmer_settings_session_id_1_fkey FOREIGN KEY (session_id_1) REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE;


--
-- Name: warmer_settings warmer_settings_session_id_2_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.warmer_settings
    ADD CONSTRAINT warmer_settings_session_id_2_fkey FOREIGN KEY (session_id_2) REFERENCES public.whatsapp_sessions(id) ON DELETE CASCADE;


--
-- Name: webchat_configs webchat_configs_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.webchat_configs
    ADD CONSTRAINT webchat_configs_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


--
-- Name: whatsapp_sessions whatsapp_sessions_organization_id_fkey; Type: FK CONSTRAINT; Schema: public; Owner: postgres
--

ALTER TABLE ONLY public.whatsapp_sessions
    ADD CONSTRAINT whatsapp_sessions_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;


-- 1. INSERT PLANS
INSERT INTO public.plans (id, name, description, price_monthly, price_yearly, is_active, trial_days, is_trial_allowed) VALUES
(1, 'Basic', 'Paket dasar untuk memulai bisnis digital Anda', 99000, 990000, true, 7, true),
(2, 'Professional', 'Paket untuk bisnis yang sedang berkembang', 299000, 2990000, true, 7, true),
(3, 'Enterprise', 'Paket lengkap untuk enterprise', 999000, 9990000, true, 14, true)
ON CONFLICT (id) DO NOTHING;

-- Reset sequence agar id otomatis berikutnya benar
SELECT setval('public.plans_id_seq', (SELECT MAX(id) FROM public.plans));

-- 2. INSERT SYSTEM ORGANIZATION
INSERT INTO public.organizations (id, name, plan_id, subscription_status)
VALUES (1, 'System Admin', 3, 'active')
ON CONFLICT (id) DO NOTHING;

-- Reset sequence
SELECT setval('public.organizations_id_seq', (SELECT MAX(id) FROM public.organizations));

-- 3. INSERT SUPER ADMIN USER (Password: admin123)
-- Menggunakan hash bcrypt yang Anda lampirkan
INSERT INTO public.users (organization_id, name, email, password_hash, role, role_level)
VALUES (1, 'Super Admin', 'superadmin@example.com', '$2b$10$V.drJhfo/cm7vNLcCL8ji.HSHQn6cvrm9gTy0kp2jlc4Avbyg4HUa', 'super_admin', 100)
ON CONFLICT (email) DO NOTHING;

-- 4. INSERT DEFAULT ADDONS
INSERT INTO public.addons (code, name, description, price_monthly, feature_code, type, value, duration_days, is_active) VALUES
('ADDON_WA_API', 'Kuota WA API', 'Tambah kuota WhatsApp Official API (BYOK)', 10000, 'limit_wa_api', 'limit', 1, 30, true),
('ADDON_WA_COEX', 'Kuota WA CoEx', 'Tambah kuota WhatsApp Official API (CoEx)', 10000, 'limit_wa_coex', 'limit', 1, 30, true),
('ADDON_WEBCHAT', 'Kuota Webchat Widget', 'Tambah kuota widget webchat untuk website', 10000, 'limit_webchat', 'limit', 1, 30, true),
('ADDON_WA_DEVICE', 'Kuota Device WhatsApp', 'Tambah kuota koneksi device WhatsApp Unofficial', 10000, 'feat_session_limit', 'limit', 1, 30, true),
('ADDON_TELEGRAM', 'Kuota Telegram Bot', 'Tambah kuota Telegram bot connection', 10000, 'limit_telegram', 'limit', 1, 30, true),
('UNLOCK_BROADCAST', 'Unlock Broadcast', 'Aktifkan fitur broadcast campaign', 10000, 'feat_broadcast', 'boolean', 1, 365, true),
('UNLOCK_INSTAGRAM', 'Unlock Instagram', 'Aktifkan integrasi Instagram Direct Message', 10000, 'channel_instagram', 'boolean', 1, 365, true),
('UNLOCK_MESSENGER', 'Unlock Messenger', 'Aktifkan integrasi Facebook Messenger', 10000, 'channel_messenger', 'boolean', 1, 365, true)
ON CONFLICT (code) DO UPDATE SET
    feature_code = EXCLUDED.feature_code,
    value = EXCLUDED.value,
    price_monthly = EXCLUDED.price_monthly,
    updated_at = NOW();

SELECT setval('public.addons_id_seq', (SELECT MAX(id) FROM public.addons));

-- 5. INSERT SYSTEM FEATURE FLAGS
INSERT INTO public.system_feature_flags (key, name, category, is_active) VALUES
('core_wa_gateway', 'WhatsApp Gateway (Unofficial)', 'core', true),
('channel_wa_api', 'WhatsApp Official API', 'channel', true),
('channel_wa_coex', 'WhatsApp Official CoEx', 'core', true),
('mod_inbox', 'Unified Inbox', 'module', true),
('mod_broadcast', 'Broadcast Campaign', 'module', true),
('mod_chatbot', 'AI Chatbot (Gemini)', 'module', true),
('mod_autoreply', 'Basic Auto-reply', 'module', true),
('tool_warmer', 'WhatsApp Warmer', 'tool', true),
('tool_scraper', 'GMaps Scraper', 'tool', true),
('tool_number_check', 'Number Checker', 'tool', true),
('tool_group_grab', 'Group Extractor', 'tool', true),
('fin_invoice', 'Invoicing System', 'finance', true),
('api_public', 'Public Developer API', 'integration', true),
('channel_messenger', 'Facebook Messenger', 'channel', true),
('channel_instagram', 'Instagram DM', 'channel', true),
('channel_telegram', 'Telegram Bot', 'channel', true),
('channel_webchat', 'Webchat Widget', 'channel', true)
ON CONFLICT (key) DO UPDATE SET category = EXCLUDED.category;

-- 6. INSERT SYSTEM SETTINGS
INSERT INTO public.system_settings (key, value, group_name, type) VALUES
('affiliate_commission_rate', '20', 'affiliate', 'number'),
('affiliate_min_payout', '100000', 'affiliate', 'number'),
('mobile_app_enabled', 'false', 'mobile_config', 'boolean'),
('mobile_play_store_url', '', 'mobile_config', 'text'),
('mobile_app_store_url', '', 'mobile_config', 'text')
ON CONFLICT (key) DO NOTHING;
-- ============================================================================
-- MIGRATION: Add missing tables and columns
-- ============================================================================

-- Add first_message_at and first_message_source to contacts
ALTER TABLE public.contacts
    ADD COLUMN IF NOT EXISTS first_message_at timestamp with time zone,
    ADD COLUMN IF NOT EXISTS first_message_source character varying(50);

-- auto_label_rules: keyword and source-based auto-labeling rules per organization
CREATE TABLE IF NOT EXISTS public.auto_label_rules (
    id bigint NOT NULL,
    organization_id bigint NOT NULL,
    name character varying(255) NOT NULL,
    description text,
    rule_type character varying(20) NOT NULL DEFAULT 'keyword',
    source_channel character varying(50),
    keyword_pattern text,
    keyword_match_type character varying(20) DEFAULT 'contains',
    case_sensitive boolean DEFAULT false,
    message_scope character varying(20) DEFAULT 'any',
    label_id bigint NOT NULL,
    priority integer DEFAULT 0,
    is_active boolean DEFAULT true,
    auto_remove boolean DEFAULT false,
    match_count integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.auto_label_rules_id_seq
    START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.auto_label_rules_id_seq OWNED BY public.auto_label_rules.id;
ALTER TABLE ONLY public.auto_label_rules ALTER COLUMN id SET DEFAULT nextval('public.auto_label_rules_id_seq'::regclass);

ALTER TABLE public.auto_label_rules OWNER TO omni_user;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auto_label_rules_pkey') THEN
        ALTER TABLE ONLY public.auto_label_rules ADD CONSTRAINT auto_label_rules_pkey PRIMARY KEY (id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auto_label_rules_organization_id_fkey') THEN
        ALTER TABLE ONLY public.auto_label_rules
            ADD CONSTRAINT auto_label_rules_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auto_label_rules_label_id_fkey') THEN
        ALTER TABLE ONLY public.auto_label_rules
            ADD CONSTRAINT auto_label_rules_label_id_fkey FOREIGN KEY (label_id) REFERENCES public.labels(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_auto_label_rules_org ON public.auto_label_rules(organization_id, is_active);


-- auto_label_logs: audit log of auto-label applications
CREATE TABLE IF NOT EXISTS public.auto_label_logs (
    id bigint NOT NULL,
    organization_id bigint NOT NULL,
    contact_id bigint,
    conversation_id bigint,
    rule_id bigint,
    label_id bigint,
    source_channel character varying(50),
    matched_text text,
    action character varying(20) DEFAULT 'applied',
    created_at timestamp with time zone DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.auto_label_logs_id_seq
    START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.auto_label_logs_id_seq OWNED BY public.auto_label_logs.id;
ALTER TABLE ONLY public.auto_label_logs ALTER COLUMN id SET DEFAULT nextval('public.auto_label_logs_id_seq'::regclass);

ALTER TABLE public.auto_label_logs OWNER TO omni_user;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'auto_label_logs_pkey') THEN
        ALTER TABLE ONLY public.auto_label_logs ADD CONSTRAINT auto_label_logs_pkey PRIMARY KEY (id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_auto_label_logs_org ON public.auto_label_logs(organization_id);
CREATE INDEX IF NOT EXISTS idx_auto_label_logs_contact ON public.auto_label_logs(contact_id);


-- analytics_daily_metrics: pre-aggregated daily metrics per organization
CREATE TABLE IF NOT EXISTS public.analytics_daily_metrics (
    id bigint NOT NULL,
    organization_id bigint NOT NULL,
    metric_date date NOT NULL DEFAULT CURRENT_DATE,
    total_conversations integer DEFAULT 0,
    new_conversations integer DEFAULT 0,
    resolved_conversations integer DEFAULT 0,
    avg_first_response_time_seconds numeric(10,2) DEFAULT 0,
    avg_response_time_seconds numeric(10,2) DEFAULT 0,
    total_ratings integer DEFAULT 0,
    avg_rating numeric(3,2) DEFAULT 0,
    csat_score numeric(5,2) DEFAULT 0,
    total_messages integer DEFAULT 0,
    created_at timestamp with time zone DEFAULT now(),
    updated_at timestamp with time zone DEFAULT now()
);

CREATE SEQUENCE IF NOT EXISTS public.analytics_daily_metrics_id_seq
    START WITH 1 INCREMENT BY 1 NO MINVALUE NO MAXVALUE CACHE 1;

ALTER SEQUENCE public.analytics_daily_metrics_id_seq OWNED BY public.analytics_daily_metrics.id;
ALTER TABLE ONLY public.analytics_daily_metrics ALTER COLUMN id SET DEFAULT nextval('public.analytics_daily_metrics_id_seq'::regclass);

ALTER TABLE public.analytics_daily_metrics OWNER TO omni_user;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analytics_daily_metrics_pkey') THEN
        ALTER TABLE ONLY public.analytics_daily_metrics ADD CONSTRAINT analytics_daily_metrics_pkey PRIMARY KEY (id);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analytics_daily_metrics_org_date_unique') THEN
        ALTER TABLE ONLY public.analytics_daily_metrics
            ADD CONSTRAINT analytics_daily_metrics_org_date_unique UNIQUE (organization_id, metric_date);
    END IF;
END $$;

DO $$ BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'analytics_daily_metrics_organization_id_fkey') THEN
        ALTER TABLE ONLY public.analytics_daily_metrics
            ADD CONSTRAINT analytics_daily_metrics_organization_id_fkey FOREIGN KEY (organization_id) REFERENCES public.organizations(id) ON DELETE CASCADE;
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_analytics_daily_metrics_org_date ON public.analytics_daily_metrics(organization_id, metric_date DESC);

--
-- PostgreSQL database dump complete
--

